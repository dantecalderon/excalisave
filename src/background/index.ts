import { browser } from "webextension-polyfill-ts";
import {
  CleanupFilesMessage,
  MessageType,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";
import { XLogger } from "../lib/logger";
import diff from "microdiff";

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
    message: SaveDrawingMessage | SaveNewDrawingMessage | CleanupFilesMessage,
    _sender: any
  ) => {
    try {
      XLogger.log("Mesage brackground", message);
      if (!message || !message.type) return;

      switch (message.type) {
        case MessageType.SAVE_NEW_DRAWING:
          const creationDate = new Date().toISOString();
          await browser.storage.local.set({
            [message.payload.id]: {
              id: message.payload.id,
              name: message.payload.name,
              createdAt: creationDate,
              updatedAt: creationDate,
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

        case MessageType.SAVE_DRAWING:
          const exitentDrawing = (
            await browser.storage.local.get(message.payload.id)
          )[message.payload.id] as IDrawing;

          if (!exitentDrawing) {
            XLogger.error("No drawing found with id", message.payload.id);
            return;
          }

          let isDrawingUpdated = true;

          try {
            const existendDrawingDataString = JSON.parse(
              exitentDrawing?.data?.excalidraw
            );
            const newDrawingDataString = JSON.parse(message.payload.excalidraw);

            const differences = diff(
              existendDrawingDataString,
              newDrawingDataString,
              {
                cyclesFix: false,
              }
            ).filter((difference) => {
              // These fields are misleading, sometimes they change without the data having changed
              const propertiesToIgnore = ["version", "versionNonce", "updated"];

              return difference.path.every((path) => {
                if (typeof path === "string") {
                  return !propertiesToIgnore.includes(path);
                }
                return true;
              });
            });

            isDrawingUpdated = differences.length > 0;

            XLogger.debug("Differences Result", {
              isDrawingUpdated,
              differences,
              existendDrawingDataString,
              newDrawingDataString,
            });
          } catch {}

          const newData: IDrawing = {
            ...exitentDrawing,
            name: message.payload.name || exitentDrawing.name,
            imageBase64:
              message.payload.imageBase64 || exitentDrawing.imageBase64,
            viewBackgroundColor:
              message.payload.viewBackgroundColor ||
              exitentDrawing.viewBackgroundColor,
            updatedAt: isDrawingUpdated
              ? new Date().toISOString()
              : exitentDrawing.updatedAt,
            data: {
              excalidraw: message.payload.excalidraw,
              excalidrawState: message.payload.excalidrawState,
              versionFiles: message.payload.versionFiles,
              versionDataState: message.payload.versionDataState,
            },
          };

          await browser.storage.local.set({
            [message.payload.id]: newData,
          });
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
        default:
          break;
      }
    } catch (error) {
      XLogger.error("Error on background message listener", error);
    }
  }
);
