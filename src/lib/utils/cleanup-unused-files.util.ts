import { browser } from "webextension-polyfill-ts";
import { XLogger } from "../logger";
import { TabUtils } from "./tab.utils";
import {
  CleanupFilesMessage,
  MessageType,
} from "../../constants/message.types";

// Default cleanup interval in days
const DEFAULT_CLEANUP_INTERVAL_DAYS = 3;

/**
 * Deletes files in IndexedDB that are not used by any drawing.
 *
 * This process runs after it passed 3 days since last cleanup.
 * But the condition is only checked every time the popup is opened.
 */
export async function checkAndPerformUnusedFilesCleanup() {
  browser.storage.session
    .get("lastFileCleanupDate")
    .then(async ({ lastFileCleanupDate: lastCleanupDate }) => {
      const currentDate = new Date().getTime();

      const intervalMs = 1000 * 60 * 60 * 24 * DEFAULT_CLEANUP_INTERVAL_DAYS;

      const shouldPerformCleanup =
        !lastCleanupDate || currentDate - lastCleanupDate > intervalMs;

      if (shouldPerformCleanup) {
        XLogger.debug("3 days passed. Cleaning up unused files...");

        const activeTab = await TabUtils.getActiveTab();

        if (
          !activeTab ||
          !activeTab.url?.startsWith("https://excalidraw.com")
        ) {
          XLogger.error("No active tab found", {
            activeTab,
          });

          return;
        }

        await Promise.allSettled([
          browser.runtime.sendMessage({
            type: MessageType.CLEANUP_FILES,
            payload: {
              tabId: activeTab.id,
              executionTimestamp: currentDate,
            },
          } as CleanupFilesMessage),
          browser.storage.session.set({
            lastFileCleanupDate: currentDate,
          }),
        ]);
      }
    });
}
