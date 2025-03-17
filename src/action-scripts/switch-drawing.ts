/**
 * Switches the current drawing(or an empty canvas) to the target drawing.
 * Triggered when the user clicks on a drawing in the popup.
 *
 * @param targetDrawingId - The id of the drawing to switch to.
 */
import { FileId } from "@excalidraw/excalidraw/types/element/types";
import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createStore, entries, set } from "idb-keyval";
import { browser } from "webextension-polyfill-ts";
import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/content-script.utils";
import { MessageType, SaveDrawingMessage } from "../constants/message.types";
import { IDrawing } from "../interfaces/drawing.interface";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { XLogger } from "../lib/logger";
import { As } from "../lib/types.utils";
import { ActionScriptParams } from "./action-scripts";

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

(async () => {
  const params = getScriptParams<
    ActionScriptParams["switch-drawing"] | undefined
  >();

  const targetDrawingId = params?.targetDrawingId;

  if (!targetDrawingId) {
    XLogger.info("No target drawing id provided, could not switch drawing");

    return;
  }

  // If a drawing is currently loaded, save it before switching to the new one.
  const currentDrawingId = localStorage.getItem(DRAWING_ID_KEY_LS);

  if (currentDrawingId) {
    XLogger.info(
      "Sending to save current drawing before switching to the new one"
    );

    const drawingDataState = await getDrawingDataState();

    await browser.runtime.sendMessage(
      As<SaveDrawingMessage>({
        type: MessageType.UPDATE_DRAWING,
        payload: {
          id: currentDrawingId,
          excalidraw: drawingDataState.excalidraw,
          excalidrawState: drawingDataState.excalidrawState,
          versionFiles: drawingDataState.versionFiles,
          versionDataState: drawingDataState.versionDataState,
          imageBase64: drawingDataState.imageBase64,
          viewBackgroundColor: drawingDataState.viewBackgroundColor,
        },
      })
    );
  }

  const targetDrawingData = (await browser.storage.local.get(targetDrawingId))[
    targetDrawingId
  ] as IDrawing;

  if (!targetDrawingData) {
    XLogger.error("No target drawing data found");

    return;
  }

  const { excalidraw, excalidrawState, versionFiles, versionDataState } =
    targetDrawingData.data;

  // Seems Excalidraw saves data to localStorage before reload page(I guess when there is something pending).
  // To avoid it overwrite our data,  save to localStorage on this event instead.
  // ! TODO: Probably need to move the logic of saving data before switch to here.
  window.addEventListener("beforeunload", () => {
    localStorage.setItem("excalidraw", excalidraw);
    localStorage.setItem("excalidraw-state", excalidrawState);
    localStorage.setItem("version-files", versionFiles);
    localStorage.setItem("version-dataState", versionDataState);
    localStorage.setItem(DRAWING_ID_KEY_LS, targetDrawingId);
  });

  // To avoid images being removed by cleanup process,
  // update the lastRetrived date of other drawings when load the new drawing.
  await entries(filesStore).then(async (entries) => {
    for (const [id, imageData] of entries as [FileId, BinaryFileData][]) {
      await set(
        id,
        {
          ...imageData,
          // Dear future developer (if humanity persists), kindly update this before the year 2400
          lastRetrieved: new Date(2400, 0, 1).getTime(),
        },
        filesStore
      );
    }
  });

  const url = new URL(window.location.href);

  // Reload page in origin url to ensure load localStorage data.
  location.assign(url.origin);
})();
