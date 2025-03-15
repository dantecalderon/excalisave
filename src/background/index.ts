import { browser } from "webextension-polyfill-ts";
import {
  AutoSaveMessage,
  CleanupFilesMessage,
  DeleteDrawingMessage,
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

browser.runtime.onInstalled.addListener(async () => {
  XLogger.log("onInstalled...");

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
      | AutoSaveMessage,
    _sender: any
  ) => {
    try {
      XLogger.log("Mesage brackground", message);
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
            XLogger.error("No drawing found with id", message.payload.id);
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
              imageBase64:
                message.payload?.imageBase64 || currentDrawing?.imageBase64,
              name: currentDrawing?.name,
            },
            files: {}, // Files are not needed to compare changes. Since it has
          };

          const newDrawingHash = await hashJSON(newDrawingHashData);

          if (newDrawingHash !== currentDrawing.hash) {
            const newDrawing: IDrawing = {
              ...currentDrawing,
              name: message.payload.name || currentDrawing.name,
              imageBase64:
                message.payload.imageBase64 || currentDrawing.imageBase64,
              viewBackgroundColor:
                message.payload.viewBackgroundColor ||
                currentDrawing.viewBackgroundColor,
              hash: newDrawingHash,
              lastModified: new Date().toISOString(),
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
            XLogger.log("Saving to cloud", message.payload.id);
            const saveResponse = await GoogleDriveApi.saveFileToDrive({
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
            });

            XLogger.log("Saved to cloud", message.payload.id);

            if (saveResponse.modifiedTime) {
              const currentDrawing = (
                await browser.storage.local.get(message.payload.id)
              )[message.payload.id] as IDrawing;

              await browser.storage.local.set({
                [message.payload.id]: {
                  ...currentDrawing,
                  lastSync: saveResponse.modifiedTime,
                  lastModified: saveResponse.modifiedTime,
                } as IDrawing,
              });
            }
          }

          break;

        case MessageType.RENAME_DRAWING:
          XLogger.debug("Renaming drawing", {
            id: message.payload.id,
            newName: message.payload.name,
          });

          const drawingToUpdate = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!drawingToUpdate) {
            XLogger.error("No drawing found with id", message.payload.id);
            return;
          }

          await browser.storage.local.set({
            [message.payload.id]: {
              ...drawingToUpdate,
              name: message.payload.name,
            },
          });

          if (message.payload.saveToCloud) {
            XLogger.log("Renaming file in cloud");

            const cloudFile = await GoogleDriveApi.findByExcalisaveId(
              message.payload.id
            );

            if (!cloudFile?.[0]?.id) {
              XLogger.error("No cloud file found with id");
              return;
            }

            await GoogleDriveApi.renameFile(
              cloudFile[0].id,
              message.payload.name
            );

            XLogger.log("Renamed file in cloud");
          }

          break;

        case MessageType.DELETE_DRAWING:
          XLogger.log("Deleting drawing", message.payload.id);
          if (message.payload.saveToCloud) {
            await GoogleDriveApi.deleteFile(message.payload.id);
          }

          break;

        case MessageType.CLEANUP_FILES:
          XLogger.info("Cleaning up files");

          const drawings = Object.values(
            await browser.storage.local.get()
          ).filter((o) => o?.id?.startsWith?.("drawing:"));

          const imagesUsed = drawings
            .map((drawing) => {
              return JSON.parse(drawing.data.excalidraw).filter(
                (item: any) => item.type === "image"
              );
            })
            .flat()
            .map<string>((item) => item?.fileId);

          const uniqueImagesUsed = Array.from(new Set(imagesUsed));

          XLogger.log("Used fileIds", uniqueImagesUsed);

          // This workaround is to pass params to script, it's ugly but it works
          await browser.scripting.executeScript({
            target: {
              tabId: message.payload.tabId,
            },
            func: (fileIds: string[], executionTimestamp: number) => {
              window.__SCRIPT_PARAMS__ = { fileIds, executionTimestamp };
            },
            args: [uniqueImagesUsed, message.payload.executionTimestamp],
          });

          await browser.scripting.executeScript({
            target: { tabId: message.payload.tabId },
            files: ["./js/execute-scripts/delete-unused-files.bundle.js"],
          });

          break;

        case MessageType.AUTO_SAVE:
          const name = message.payload.name;
          const setCurrent = message.payload.setCurrent;
          XLogger.log("Saving new drawing", { name });
          const activeTab = await TabUtils.getActiveTab();

          if (!activeTab) {
            XLogger.warn("No active tab found");
            return;
          }

          const id = `drawing:${RandomUtils.generateRandomId()}`;

          // This workaround is to pass params to script, it's ugly but it works
          await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            func: (id, name, setCurrent) => {
              window.__SCRIPT_PARAMS__ = { id, name, setCurrent };
            },
            args: [id, name, setCurrent],
          });

          await browser.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["./js/execute-scripts/sendDrawingDataToSave.bundle.js"],
          });
          break;
        default:
          break;
      }
    } catch (error) {
      XLogger.error("Error on background message listener", error);
    }
  }
);
