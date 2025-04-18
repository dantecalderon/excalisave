import { browser } from "webextension-polyfill-ts";
import {
  AutoSaveMessage,
  CleanupFilesMessage,
  DeleteDrawingMessage,
  LoginResultMessage,
  LogoutMessage,
  MessageType,
  RenameDrawingMessage,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";
import { XLogger } from "../lib/logger";
import { TabUtils } from "../lib/utils/tab.utils";
import { RandomUtils } from "../lib/utils/random.utils";
import { GoogleDriveApi } from "../lib/google-drive-api";
import { IDrawingExport } from "../interfaces/drawing-export.interface";
import { hashJSON } from "../lib/utils/json.utils";
import { runActionScript } from "../action-scripts/action-scripts";
import { updatePartialRestorePoint } from "../Popup/hooks/useRestorePoint.hook";

const logger = XLogger.get("Background");

browser.runtime.onInstalled.addListener(async () => {
  logger.log("onInstalled...");

  for (const cs of (browser.runtime.getManifest() as any).content_scripts) {
    for (const tab of await browser.tabs.query({ url: cs.matches })) {
      browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: cs.js,
      });
    }
  }
});

browser.runtime.onMessage.addListener(
  async (
    message:
      | SaveDrawingMessage
      | SaveNewDrawingMessage
      | CleanupFilesMessage
      | RenameDrawingMessage
      | DeleteDrawingMessage
      | AutoSaveMessage
      | LoginResultMessage
      | LogoutMessage
  ) => {
    try {
      logger.log("Mesage brackground", message);
      if (!message || !message.type) return;

      switch (message.type) {
        case MessageType.SAVE_NEW_DRAWING:
          await browser.storage.local.set({
            [message.payload.id]: {
              id: message.payload.id,
              name: message.payload.name,
              createdAt: new Date().toISOString(),
              imageBase64: message.payload.imageBase64,
              viewBackgroundColor: message.payload.viewBackgroundColor,
              data: {
                excalidraw: message.payload.excalidraw,
                excalidrawState: message.payload.excalidrawState,
                versionFiles: message.payload.versionFiles,
                versionDataState: message.payload.versionDataState,
              },
            },
          });
          break;

        case MessageType.UPDATE_DRAWING:
          const currentDrawing = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!currentDrawing) {
            logger.error("No drawing found with id", message.payload.id);
            return;
          }

          // This is used to compare changes in the drawing with the current drawing
          const newDrawingHashData: IDrawingExport = {
            elements: JSON.parse(message.payload.excalidraw),
            version: 2,
            type: "excalidraw",
            source: "https://excalidraw.com",
            appState: {
              gridSize: null,
              viewBackgroundColor: message.payload.viewBackgroundColor,
            },
            excalisave: {
              id: message.payload.id,
              createdAt: currentDrawing?.createdAt,
              name: currentDrawing?.name,
            },
            files: {}, // Files are not needed to compare changes. Since it has
          };

          const newDrawingHash = await hashJSON(newDrawingHashData);

          if (
            newDrawingHash !== currentDrawing.hash ||
            message.payload.excalidrawState !==
              currentDrawing.data.excalidrawState
          ) {
            const newDrawing: IDrawing = {
              ...currentDrawing,
              name: message.payload.name || currentDrawing.name,
              imageBase64:
                message.payload.imageBase64 || currentDrawing.imageBase64,
              viewBackgroundColor:
                message.payload.viewBackgroundColor ||
                currentDrawing.viewBackgroundColor,
              hash: newDrawingHash,
              lastModified:
                newDrawingHash !== currentDrawing.hash
                  ? new Date().toISOString()
                  : currentDrawing.lastModified,
              data: {
                excalidraw: message.payload.excalidraw,
                excalidrawState: message.payload.excalidrawState,
                versionFiles: message.payload.versionFiles,
                versionDataState: message.payload.versionDataState,
              },
            };

            await browser.storage.local.set({
              [message.payload.id]: newDrawing,
            });
          }

          if (message.payload.saveToCloud) {
            logger.log("Saving to cloud", message.payload.id);
            const saveResponse = await GoogleDriveApi.saveFileToDrive(
              {
                elements: newDrawingHashData.elements,
                version: 2,
                type: "excalidraw",
                source: "https://excalidraw.com",
                appState: newDrawingHashData.appState,
                excalisave: {
                  createdAt: currentDrawing.createdAt,
                  id: currentDrawing.id,
                  name: currentDrawing.name,
                  imageBase64:
                    message.payload.imageBase64 || currentDrawing.imageBase64,
                },
                // TODO: Include files:
                files: {},
              },
              newDrawingHash
            );

            logger.log("Saved to cloud", message.payload.id);

            if (saveResponse.modifiedTime) {
              const currentDrawing = (
                await browser.storage.local.get(message.payload.id)
              )[message.payload.id] as IDrawing;

              const drawingToUpdate: IDrawing = {
                ...currentDrawing,
                lastSync: saveResponse.modifiedTime,
                lastModified: saveResponse.modifiedTime,
              };

              await browser.storage.local.set({
                [message.payload.id]: drawingToUpdate,
              });
            }
          }

          break;

        case MessageType.RENAME_DRAWING:
          logger.debug("Renaming drawing", {
            id: message.payload.id,
            newName: message.payload.name,
          });

          const drawingToUpdate = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!drawingToUpdate) {
            logger.error("No drawing found with id", message.payload.id);
            return;
          }

          await browser.storage.local.set({
            [message.payload.id]: {
              ...drawingToUpdate,
              name: message.payload.name,
            },
          });

          if (message.payload.saveToCloud) {
            logger.log("Renaming file in cloud");

            const cloudFileMetadata =
              await GoogleDriveApi.findFileMetadataByExcalisaveId(
                message.payload.id
              );

            if (!cloudFileMetadata) {
              logger.error("No cloud file found with id");
              return;
            }

            await GoogleDriveApi.renameFile(
              cloudFileMetadata.id,
              message.payload.name
            );

            logger.log("Renamed file in cloud");
          }

          break;

        case MessageType.DELETE_DRAWING:
          logger.log("Deleting drawing", message.payload.id);
          if (message.payload.saveToCloud) {
            await GoogleDriveApi.deleteFile(message.payload.id);
          }

          break;

        case MessageType.CLEANUP_FILES:
          logger.info("Cleaning up unused files...");

          const drawings = Object.values(
            await browser.storage.local.get()
          ).filter((o) => o?.id?.startsWith?.("drawing:"));

          const imagesUsed = drawings
            .map((drawing) => {
              return JSON.parse(drawing.data.excalidraw).filter(
                (item: any) => item.type === "image" && item.fileId
              );
            })
            .flat()
            .map<string>((item) => item?.fileId);

          const uniqueImagesUsed = Array.from(new Set(imagesUsed));

          logger.log("Used fileIds", uniqueImagesUsed);

          await runActionScript(
            "delete-unused-files-from-store",
            message.payload.tabId,
            {
              fileIds: uniqueImagesUsed,
              executionTimestamp: message.payload.executionTimestamp,
            }
          );

          break;

        case MessageType.AUTO_SAVE:
          const name = message.payload.name;
          const setCurrent = message.payload.setCurrent;
          logger.log("Saving new drawing", { name });
          const activeTab = await TabUtils.getActiveTab();

          if (!activeTab) {
            logger.warn("No active tab found");
            return;
          }

          const id = `drawing:${RandomUtils.generateRandomId()}`;

          await runActionScript("save-new-drawing", activeTab.id, {
            id,
            name,
            setCurrent,
          });

          break;

        case MessageType.LOGIN_RESULT:
          logger.log("Login result", message.payload);

          if (message.payload.success) {
            if (
              !message.payload.details.grantedScopes.includes(
                "https://www.googleapis.com/auth/drive.file"
              )
            ) {
              logger.error(
                "Invalid scopes",
                message.payload.details.grantedScopes
              );

              await (browser.identity as any).clearAllCachedAuthTokens();
              return;
            }

            const user = await GoogleDriveApi.getAuthenticatedUser();
            logger.info("Authenticated user", user);

            await updatePartialRestorePoint({
              profileUrl: user.picture,
            });

            // Clear the cloud folder id if exists to force check for folder
            await browser.storage.local.set({
              cloudFolderId: undefined,
            });

            const filesFromCloud = await GoogleDriveApi.getAllFiles();

            logger.debug("Files from cloud", filesFromCloud);

            for (const file of filesFromCloud) {
              try {
                logger.debug("Checking file", file);
                const drawing: IDrawing = (
                  await browser.storage.local.get(file.properties.excalisaveId)
                )[file.properties.excalisaveId];

                if (!drawing) {
                  // No drawing then download the save locally
                  logger.debug(
                    "No drawing found, downloading file...",
                    file.id
                  );
                  const fileContent = await GoogleDriveApi.getFile(file.id);

                  const newDrawing: IDrawing = {
                    id: file.properties.excalisaveId,
                    name: file.name.split(".excalidraw")[0],
                    createdAt: fileContent.excalisave.createdAt,
                    imageBase64: fileContent.excalisave.imageBase64,
                    viewBackgroundColor:
                      fileContent.appState.viewBackgroundColor || "#ffffff",
                    hash: file.properties.hash,
                    lastSync: file.modifiedTime,
                    lastModified: file.modifiedTime,
                    data: {
                      excalidraw: JSON.stringify(fileContent.elements),
                      excalidrawState: JSON.stringify(fileContent.appState),
                      versionFiles: Date.now().toString(),
                      versionDataState: Date.now().toString(),
                    },
                  };

                  await browser.storage.local.set({
                    [file.properties.excalisaveId]: newDrawing,
                  });
                } else {
                  if (drawing.hash && file.properties.hash === drawing.hash) {
                    // No changes, just update the last modified date
                    await browser.storage.local.set({
                      [file.properties.excalisaveId]: {
                        ...drawing,
                        lastSync: file.modifiedTime,
                        lastModified: file.modifiedTime,
                      } as IDrawing,
                    });
                  }
                }
              } catch (error) {
                logger.error("Error syncing file", file.id, file.name);
                logger.error(error);
              }
            }

            const cloudFileIds = new Set(filesFromCloud.map((file) => file.id));

            // Remove lastSync from drawings that are not in the cloud to detect changes.
            // We do this in Lougout(on click button), but noticed after some time the user is logged out from the browser
            const localDrawings: IDrawing[] = Object.values(
              await browser.storage.local.get()
            )
              .filter((o) => o?.id?.startsWith?.("drawing:"))
              .filter((o) => !cloudFileIds.has(o.id));

            for (const drawing of localDrawings) {
              logger.debug(
                "Drawing not in cloud",
                drawing.id,
                cloudFileIds.has(drawing.id)
              );

              if (!cloudFileIds.has(drawing.id)) {
                logger.debug(
                  "Drawing not in cloud, removing lastSync",
                  drawing.id
                );
                await browser.storage.local.set({
                  [drawing.id]: {
                    ...drawing,
                    lastSync: undefined,
                  },
                });
              }
            }
          }

          break;
        case MessageType.LOGOUT:
          logger.log("Logging out");
          const drawingsToUpdate: IDrawing[] = Object.values(
            await browser.storage.local.get()
          ).filter((o) => o?.id?.startsWith?.("drawing:"));

          logger.log("Removing lastSync date from drawings...");

          for (const drawing of drawingsToUpdate) {
            const newDrawing: IDrawing = {
              ...drawing,
              lastSync: undefined, // Clear the last sync date of the user.
            };

            await browser.storage.local.set({ [drawing.id]: newDrawing });
          }

          logger.log("Logged out");

          break;

        default:
          break;
      }
    } catch (error) {
      logger.error("Error on background message listener", error);
    }
  }
);
