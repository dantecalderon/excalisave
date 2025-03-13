import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { IDrawingExport } from "../interfaces/drawing-export.interface";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { DrawingStore } from "../lib/drawing-store";
import { XLogger } from "../lib/logger";
import { As } from "../lib/types.utils";
import { hashJSON } from "../lib/utils/json.utils";
import { getDrawingDataState } from "./content-script.utils";
const { browser } = require("webextension-polyfill-ts");

// ----------- Content Script Cleanup --------------------
const DESTRUCTION_EVENT = "destruct-my-extension_2_" + browser.runtime.id;
document.dispatchEvent(new CustomEvent(DESTRUCTION_EVENT));

let timeoutId: number;
let intervalId: number;

document.addEventListener(DESTRUCTION_EVENT, () => {
  try {
    XLogger.log("Cleaning up from updates...", {
      DESTRUCTION_EVENT,
      timeoutId,
      intervalId,
    });
    clearTimeout(timeoutId);
    clearInterval(intervalId);
  } catch {}
});

browser.runtime.connect().onDisconnect.addListener(function () {
  XLogger.log("⛽️️️️️️️️️️️️️️️️p️RUntime disconnect");
});
// -----------  Content Script Cleanup  --------------------

let prevVersionFiles = localStorage.getItem("version-files");

timeoutId = window.setTimeout(() => {
  intervalId = window.setInterval(async () => {
    const currentVersionFiles = localStorage.getItem("version-files");
    const currentId = localStorage.getItem(DRAWING_ID_KEY_LS);
    if (currentId && prevVersionFiles !== currentVersionFiles) {
      prevVersionFiles = currentVersionFiles;
      const currentDrawing = await DrawingStore.findDrawingById(currentId);
      if (!currentDrawing) {
        XLogger.error("No current drawing found");
        return;
      }
      const drawingDataState = await getDrawingDataState();
      const newDrawingFileData: IDrawingExport = {
        elements: JSON.parse(drawingDataState.excalidraw),
        version: 2,
        type: "excalidraw",
        source: "https://excalidraw.com",
        appState: {
          gridSize: null,
          viewBackgroundColor: drawingDataState.viewBackgroundColor,
        },
        excalisave: {
          id: currentId,
          createdAt: currentDrawing?.createdAt,
          imageBase64: currentDrawing?.imageBase64,
          name: currentDrawing?.name,
        },
        files: {}, // TODO: Missing
      };
      const newDataHash = await hashJSON(newDrawingFileData);
      const hasDataChanged = newDataHash !== currentDrawing?.hash;
      if (!hasDataChanged) {
        XLogger.debug("No changes in the drawing");
        return;
      }
      XLogger.debug("Drawing data has changed, updating...");
      try {
        await browser.runtime.sendMessage(
          As<SaveDrawingMessage>({
            type: MessageType.UPDATE_DRAWING,
            payload: {
              id: currentId,
              excalidraw: drawingDataState.excalidraw,
              excalidrawState: drawingDataState.excalidrawState,
              versionFiles: drawingDataState.versionFiles,
              versionDataState: drawingDataState.versionDataState,
              imageBase64: drawingDataState.imageBase64,
              viewBackgroundColor: drawingDataState.viewBackgroundColor,
              hash: newDataHash,
            },
          })
        );
      } catch (error) {
        XLogger.error(
          "[Listen Changes] Error sending drawing data to save",
          error
        );
      }
    }
  }, 2000);

  window.addEventListener("beforeunload", () => {
    try {
      clearInterval(intervalId);
    } catch {}
  });

  // Start syncing after 5 seconds
}, 5000);

window.addEventListener("beforeunload", () => {
  try {
    clearTimeout(timeoutId);
  } catch {}
});
