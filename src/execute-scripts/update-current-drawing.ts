/**
 * Updates the current drawing(the one the user is working on) with the latest data from localStorage.
 *
 * Triggerd in 2 cases:
 * 1. When the user clicks on the "Save" button in the popup.
 * 2. (AutoSave) Every 2000ms. (in listenDrawingUpdates.ts content script)
 */
import { browser } from "webextension-polyfill-ts";
import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/content-script.utils";
import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { ActionScriptParams } from "./action-scripts";
import { XLogger } from "../lib/logger";

(async () => {
  XLogger.debug("Updating current drawing");

  const params = getScriptParams<
    ActionScriptParams["update-current-drawing"] | undefined
  >();

  const currentDrawingId = localStorage.getItem(DRAWING_ID_KEY_LS);

  if (!currentDrawingId) {
    throw new Error("Drawing id not found. Could not send drawing message.");
  }

  const drawingDataState = await getDrawingDataState();

  browser.runtime.sendMessage({
    type: MessageType.UPDATE_DRAWING,
    payload: {
      id: currentDrawingId,
      excalidraw: drawingDataState.excalidraw,
      excalidrawState: drawingDataState.excalidrawState,
      versionFiles: drawingDataState.versionFiles,
      versionDataState: drawingDataState.versionDataState,
      imageBase64: drawingDataState.imageBase64,
      viewBackgroundColor: drawingDataState.viewBackgroundColor,
      saveToCloud: params?.saveToCloud,
    },
  } as SaveDrawingMessage);
})();
