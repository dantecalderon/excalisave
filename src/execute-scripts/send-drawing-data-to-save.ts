import {
  getDrawingDataState,
  getScriptParams,
} from "../ContentScript/content-script.utils";
import {
  MessageType,
  SaveDrawingMessage,
  SaveNewDrawingMessage,
} from "../constants/message.types";
import { DRAWING_ID_KEY_LS } from "../lib/constants";
import { ActionScriptParams } from "./action-scripts";
const { browser } = require("webextension-polyfill-ts");

(async () => {
  const params = getScriptParams<
    ActionScriptParams["sendDrawingDataToSave"] | undefined
  >();

  const saveAsNew = !!params?.id;

  const setCurrent = params?.setCurrent ?? true;

  if (saveAsNew && !params?.name) {
    throw new Error(
      'Error trying to send UPDATE_DRAWING message: "name" is missing'
    );
  }

  const drawingId = saveAsNew
    ? params.id
    : localStorage.getItem(DRAWING_ID_KEY_LS);

  if (!drawingId) {
    throw new Error("Drawing id not found. Could not send drawing message.");
  }

  const drawingDataState = await getDrawingDataState();

  browser.runtime.sendMessage({
    type: saveAsNew ? MessageType.SAVE_NEW_DRAWING : MessageType.UPDATE_DRAWING,
    payload: {
      id: drawingId,
      name: saveAsNew ? params.name : undefined,
      excalidraw: drawingDataState.excalidraw,
      excalidrawState: drawingDataState.excalidrawState,
      versionFiles: drawingDataState.versionFiles,
      versionDataState: drawingDataState.versionDataState,
      imageBase64: drawingDataState.imageBase64,
      viewBackgroundColor: drawingDataState.viewBackgroundColor,
      saveToCloud: params?.saveToCloud,
    },
  } as SaveDrawingMessage | SaveNewDrawingMessage);

  if (setCurrent && saveAsNew) {
    localStorage.setItem(DRAWING_ID_KEY_LS, drawingId);
  }
})();
