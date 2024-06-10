import { useEffect, useState } from "react";
import { browser } from "webextension-polyfill-ts";
import { IDrawing } from "../../interfaces/drawing.interface";
import { DrawingStore } from "../../lib/drawing-store";
import { XLogger } from "../../lib/logger";

export function useDrawings(
  currentDrawingId: string,
  setCurrentDrawingId: (id: string | undefined) => void,
  removeDrawingFromAllFolders: (id: string) => Promise<void>
) {
  const [isLoadingDrawings, setIsLoadingDrawings] = useState(true);
  const [drawings, setDrawings] = useState<IDrawing[]>([]);

  useEffect(() => {
    const loadDrawings = async () => {
      try {
        const result: Record<string, IDrawing> =
          await browser.storage.local.get();

        const newDrawings: IDrawing[] = Object.values(result).filter(
          (drawing: IDrawing) => drawing?.id?.startsWith?.("drawing:")
        );

        setDrawings(newDrawings);
      } catch (error) {
        XLogger.error("Error loading drawings", error);
      } finally {
        setIsLoadingDrawings(false);
      }
    };

    loadDrawings();

    // This allows updating the screenshot preview when popup is open to not wait until next time it's opened
    const onDrawingChanged = async (changes: any, areaName: string) => {
      if (areaName !== "local") return;

      setDrawings((prevDrawings) => {
        return prevDrawings.map((drawing) => {
          if (changes[drawing.id]) {
            return {
              ...drawing,
              ...changes[drawing.id].newValue,
              updatedAt: drawing.updatedAt, // Do not update updatedAt date to avoid reordering on UI
            };
          }

          return drawing;
        });
      });
    };

    browser.storage.onChanged.addListener(onDrawingChanged);

    return () => {
      browser.storage.onChanged.removeListener(onDrawingChanged);
    };
  }, []);

  const onRenameDrawing = async (id: string, newName: string) => {
    try {
      const newDrawing = drawings.map((drawing) => {
        if (drawing.id === id) {
          return {
            ...drawing,
            name: newName,
          };
        }

        return drawing;
      });

      setDrawings(newDrawing);

      await browser.storage.local.set({
        [id]: {
          ...drawings.find((drawing) => drawing.id === id),
          name: newName,
        },
      });
    } catch (error) {
      XLogger.error("Error renaming drawing", error);
    }
  };

  const onDeleteDrawing = async (id: string) => {
    try {
      const newDrawings = drawings.filter((drawing) => drawing.id !== id);

      setDrawings(newDrawings);

      if (currentDrawingId === id) {
        setCurrentDrawingId(undefined);
      }

      await Promise.allSettled([
        removeDrawingFromAllFolders(id),
        DrawingStore.deleteDrawing(id),
      ]);
    } catch (error) {
      XLogger.error("Error deleting drawing", error);
    }
  };

  const handleCreateNewDrawing = async (name: string) => {
    await DrawingStore.saveNewDrawing({ name });
    window.close();
  };

  const handleSaveCurrentDrawing = async () => {
    await DrawingStore.saveCurrentDrawing();
    window.close();
  };

  const handleNewDrawing = async () => {
    await DrawingStore.newDrawing();
    setCurrentDrawingId(undefined);
    window.close();
  };

  return {
    drawings,
    isLoadingDrawings,
    onRenameDrawing,
    onDeleteDrawing,
    handleCreateNewDrawing,
    handleSaveCurrentDrawing,
    handleNewDrawing,
    currentDrawing: drawings.find((drawing) => drawing.id === currentDrawingId),
  };
}
