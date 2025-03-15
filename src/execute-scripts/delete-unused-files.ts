/***
 * Deletes files that are not used in any drawing.
 *
 * @param fileIds - The ids of the files that are being used and should not be deleted.
 * @param executionTimestamp - The timestamp when the script was run to avoid deleting files that were created after the script was run.
 */
import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { createStore, del, get, keys } from "idb-keyval";
import { getScriptParams } from "../ContentScript/content-script.utils";
import { XLogger } from "../lib/logger";
import { ActionScriptParams } from "./action-scripts";

// Were images are stored: https://github.com/excalidraw/excalidraw/blob/e8def8da8d5fcf9445aebdd996de3fee4cecf7ef/excalidraw-app/data/LocalData.ts#L24
const filesStore = createStore("files-db", "files-store");

(async () => {
  const params = getScriptParams<
    ActionScriptParams["delete-unused-files"] | undefined
  >();

  if (
    !params ||
    !params.fileIds ||
    !params.fileIds.length ||
    !params.executionTimestamp
  ) {
    XLogger.debug("No files to remove");

    return;
  }

  XLogger.debug("Deleting unused files", {
    usedFileIds: params.fileIds,
    executionTimestamp: params.executionTimestamp,
  });

  const usedFileIds = params.fileIds;
  const fileKeys = await keys(filesStore);

  await Promise.allSettled(
    fileKeys.map(async (key) => {
      const isFileBeingUsed = usedFileIds.includes(key.toString());

      // Skip if the file is being used
      if (isFileBeingUsed) {
        return;
      }

      const file = await get<BinaryFileData>(key, filesStore);

      // Skip deletion if file was created after script execution to avoid deleting newer files
      if (file.created > params.executionTimestamp) {
        return;
      }

      await del(key, filesStore);

      XLogger.debug("Deleted file", key);
    })
  );
})();
