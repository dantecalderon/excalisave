import { browser } from "webextension-polyfill-ts";
import { runActionScript } from "../execute-scripts/action-scripts";
import { IDrawing } from "../interfaces/drawing.interface";
import { DRAWING_ID_KEY_LS } from "./constants";
import { XLogger } from "./logger";
import { RandomUtils } from "./utils/random.utils";
import { TabUtils } from "./utils/tab.utils";
import {
  DeleteDrawingMessage,
  MessageType,
  RenameDrawingMessage,
} from "../constants/message.types";

type SaveDrawingProps = {
  name: string;
};

export class DrawingStore {
  static async findDrawingById(
    drawingId: string
  ): Promise<IDrawing | undefined> {
    const drawing: IDrawing = (await browser.storage.local.get(drawingId))[
      drawingId
    ];

    if (!drawing) {
      return undefined;
    }

    return drawing;
  }

  static async saveNewDrawing({ name }: SaveDrawingProps) {
    XLogger.log("Saving new drawing", { name });
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    const id = `drawing:${RandomUtils.generateRandomId()}`;

    await runActionScript("save-new-drawing", activeTab.id, {
      id,
      name,
    });
  }

  static async switchDrawing(targetDrawingId: string) {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await runActionScript("switch-drawing", activeTab.id, {
      targetDrawingId,
    });
  }

  static async newEmptyDrawing() {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await runActionScript("new-empty-drawing", activeTab.id);
  }

  /**
   * Saves the current drawing the user is working on.
   * No params needed, it takes the id to update from the localStorage.
   */
  static async saveCurrentDrawing() {
    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await runActionScript("update-current-drawing", activeTab.id, {
      saveToCloud: true,
    });
  }

  private static async deleteDrawingFromFavorites(id: string) {
    const favorites =
      (await browser.storage.local.get("favorites"))["favorites"] || [];
    const newFavorites = favorites.filter((fav: string) => fav !== id);

    await browser.storage.local.set({ favorites: newFavorites });
  }

  static async deleteDrawing(id: string) {
    await browser.storage.local.remove(id);

    const activeTab = await TabUtils.getActiveTab();

    if (!activeTab) {
      XLogger.warn("No active tab found");

      return;
    }

    await browser.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: (drawingIdKey, deleteDrawingId) => {
        if (localStorage.getItem(drawingIdKey) === deleteDrawingId) {
          localStorage.removeItem(drawingIdKey);
        }
      },
      args: [DRAWING_ID_KEY_LS, id],
    });

    await DrawingStore.deleteDrawingFromFavorites(id);

    const deleteDrawingMessage: DeleteDrawingMessage = {
      type: MessageType.DELETE_DRAWING,
      payload: {
        id,
        saveToCloud: true,
      },
    };

    await browser.runtime.sendMessage(deleteDrawingMessage);
  }

  static async hasUnsavedChanges(): Promise<boolean> {
    try {
      const activeTab = await TabUtils.getActiveTab();

      if (!activeTab) {
        XLogger.warn("Error loading drawing: No active tab found", {
          activeTab,
        });

        return true;
      }

      const response = await browser.scripting.executeScript({
        func: () => {
          return localStorage.getItem("excalidraw");
        },
        target: { tabId: activeTab.id },
      });

      let hasUnsaved: boolean = true;
      const result = JSON.parse((response as any)?.[0].result as string);

      if (result.length === 0) {
        hasUnsaved = false;
      }

      return hasUnsaved;
    } catch {}

    // By default, show confirmation dialog, we ensure the action is approved.
    return true;
  }

  static async renameDrawing(id: string, name: string) {
    const renameDrawingMessage: RenameDrawingMessage = {
      type: MessageType.RENAME_DRAWING,
      payload: {
        id,
        name,
        saveToCloud: true,
      },
    };

    await browser.runtime.sendMessage(renameDrawingMessage);
  }
}
