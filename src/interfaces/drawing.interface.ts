import { JSONString } from "../lib/types.utils";

/**
 * Drawing interface
 *
 * This is the how the drawing is stored in browser storage
 */
export interface IDrawing {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  imageBase64?: string;
  viewBackgroundColor?: string;
  data: {
    excalidraw: JSONString;
    excalidrawState: JSONString;
    versionFiles: string;
    versionDataState: string;
  };
}
