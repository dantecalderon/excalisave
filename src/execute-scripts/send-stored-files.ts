/**
 * Fetches stored files from IndexedDB and sends them via a runtime message (`MessageType.EXPORT_STORE`).
 *
 * Listeners can receive the message using `MessageType.EXPORT_STORE`.
 *
 * This is used by the `ImpExp` component to export the files store, which launches a new tab, that's why it closes the current tab after sending the message.
 */
import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createStore, values } from "idb-keyval";
import { browser } from "webextension-polyfill-ts";
import { ExportStoreMessage, MessageType } from "../constants/message.types";
import { keyBy } from "../lib/utils/array.utils";

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

(async () => {
  const response = await values<BinaryFileData | undefined>(filesStore);

  const files = keyBy(response, "id");

  browser.runtime.sendMessage({
    type: MessageType.EXPORT_STORE,
    payload: {
      files,
    },
  } as ExportStoreMessage);

  // Close tab after send message
  window.close();
})();
