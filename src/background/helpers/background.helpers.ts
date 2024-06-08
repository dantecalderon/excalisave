import diff from "microdiff";
import { XLogger } from "../../lib/logger";
import { JSONString } from "../../lib/types.utils";

export function hasDrawingDataChanged(
  previousData: JSONString,
  newData: JSONString
): boolean {
  try {
    const existendDrawingData = JSON.parse(previousData);
    const newDrawingData = JSON.parse(newData);

    const differences = diff(existendDrawingData, newDrawingData, {
      cyclesFix: false,
    }).filter((difference) => {
      // These fields are misleading, sometimes they change without the data having changed
      const propertiesToIgnore = ["version", "versionNonce", "updated"];

      return difference.path.every((path) => {
        if (typeof path === "string") {
          return !propertiesToIgnore.includes(path);
        }
        return true;
      });
    });

    const hasChanged = differences.length > 0;

    XLogger.debug("Differences Result", {
      hasChanged,
      differences,
      existendDrawingData,
      newDrawingData,
    });

    return hasChanged;
  } catch {
    // By default true in case of error
    return true;
  }
}
