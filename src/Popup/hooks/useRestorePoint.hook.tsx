import React from "react";
import { RestorePoint } from "../../interfaces/restore-point.interface";
import { browser } from "webextension-polyfill-ts";

const restorePointKey = "restorePoint";

const getRestorePoint = async (): Promise<RestorePoint> => {
  const restorePoint = await browser.storage.session.get(restorePointKey);

  return restorePoint.restorePoint;
};

const setRestorePoint = async (data: RestorePoint): Promise<void> => {
  await browser.storage.session.set({
    restorePoint: data,
  });
};

/**
 * Restores data that can be used to improve the user experience, like search term, selected sidebar item, etc.
 */
export function useRestorePoint() {
  return {
    getRestorePoint,
    setRestorePoint,
  };
}

export const updatePartialRestorePoint = async (
  data: Partial<RestorePoint>
) => {
  const restorePoint = await getRestorePoint();
  await setRestorePoint({ ...restorePoint, ...data });
};
