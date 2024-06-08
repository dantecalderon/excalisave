import { browser } from "webextension-polyfill-ts";
import { RestorePoint } from "../../interfaces/restore-point.interface";

const restorePointKey = "restorePoint";

/**
 * Restores data that can be used to improve the user experience, like search term, selected sidebar item, etc.
 */
export function useRestorePoint() {
  const getRestorePoint = async (): Promise<RestorePoint> => {
    const restorePoint = await browser.storage.session.get(restorePointKey);

    return restorePoint.restorePoint;
  };

  const setRestorePoint = async (
    data: Partial<RestorePoint>
  ): Promise<void> => {
    const currentData = await getRestorePoint();
    await browser.storage.session.set({
      restorePoint: {
        ...currentData,
        ...data,
      },
    });
  };

  return {
    getRestorePoint,
    setRestorePoint,
  };
}
