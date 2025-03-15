import { browser } from "webextension-polyfill-ts";
import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/content-script.utils";
import { MessageType, SaveNewDrawingMessage } from "../constants/message.types";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { ActionScriptParams } from "./action-scripts";

(async () => {
  const params = getScriptParams<
    ActionScriptParams["save-new-drawing"] | undefined
  >();

  if (!params?.id || !params?.name) {
    throw new Error(
      'Params "id" and "name" are required to save a new drawing'
    );
  }

  const drawingId = params.id;

  const drawingDataState = await getDrawingDataState();

  const saveNewDrawingMessage: SaveNewDrawingMessage = {
    type: MessageType.SAVE_NEW_DRAWING,
    payload: {
      id: drawingId,
      name: params.name,
      excalidraw: drawingDataState.excalidraw,
      excalidrawState: drawingDataState.excalidrawState,
      versionFiles: drawingDataState.versionFiles,
      versionDataState: drawingDataState.versionDataState,
      imageBase64: drawingDataState.imageBase64,
      viewBackgroundColor: drawingDataState.viewBackgroundColor,
      saveToCloud: params?.saveToCloud,
    },
  };

  browser.runtime.sendMessage(saveNewDrawingMessage);

  const setCurrent = params?.setCurrent ?? true;

  if (setCurrent) {
    localStorage.setItem(DRAWING_ID_KEY_LS, drawingId);
  }
})();
