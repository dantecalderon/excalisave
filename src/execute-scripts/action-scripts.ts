import { browser } from "webextension-polyfill-ts";
import { Optional } from "../lib/types.utils";

// List of all action scripts with their params. The key is the filename without the extension.
export type ActionScriptParams = {
  sendDrawingDataToSave: {
    id?: string;
    name?: string;
    setCurrent?: boolean;
    // If true, the drawing will be saved to the cloud.
    saveToCloud?: boolean;
  };
};

/**
 * Executes an action script, it supports passing parameters to the script.
 *
 * @param filename - The filename of the script in src/execute-scripts/ (without the extension)
 * @param activeTabId - The id of the active tab
 * @param params - The params to pass to the script
 * @see getScriptParams() in content-script.utils.ts for reading the params
 */
export const runActionScript = async <T extends keyof ActionScriptParams>(
  filename: T,
  activeTabId: number,
  params?: ActionScriptParams[T]
) => {
  if (params !== undefined) {
    // This workaround is to pass params to script, it's ugly but it works
    // First we inject a function that will set the params in the window
    // Then we inject the script that will read the params.
    await browser.scripting.executeScript({
      target: { tabId: activeTabId },
      func: (arg: any) => {
        window.__SCRIPT_PARAMS__ = arg;
      },
      args: [params],
    });
  }

  await browser.scripting.executeScript({
    target: { tabId: activeTabId },
    files: [`./js/execute-scripts/${filename}.bundle.js`],
  });
};
