import { browser } from "webextension-polyfill-ts";
import {
  CleanupFilesMessage,
  MessageType,
} from "../../constants/message.types";
import { XLogger } from "../../lib/logger";
import { TabUtils } from "../../lib/utils/tab.utils";

export function checkCleanOutdatedFiles() {
  browser.storage.session
    .get("lastFileCleanupDate")
    .then(async ({ lastFileCleanupDate }) => {
      const currentDate = new Date().getTime();

      // Run cleanup process every 3 days
      // Condition is checked every time popup is opened
      const Ndays = 1000 * 60 * 60 * 24 * 3;
      const hasPassedNDays = currentDate - lastFileCleanupDate > Ndays;
      if (hasPassedNDays || !lastFileCleanupDate) {
        XLogger.debug("N days passed. Cleaning up old files");

        const activeTab = await TabUtils.getActiveTab();

        XLogger.debug("Active tab", activeTab);
        if (
          !activeTab ||
          !activeTab.url?.startsWith("https://excalidraw.com")
        ) {
          XLogger.error(
            "Error loading drawing: No active tab or drawing found",
            {
              activeTab,
            }
          );

          return;
        }

        await Promise.all([
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
