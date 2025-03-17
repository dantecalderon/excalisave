/**
 * Drawing interface
 *
 * This is the how the drawing is stored in browser storage
 */
export interface IDrawing {
  id: string;
  name: string;
  createdAt: string;
  imageBase64?: string;
  viewBackgroundColor?: string;
  // This is the hash of the drawing data, used to check if the drawing has changed
  hash?: string;
  // This is the last time the drawing was synced to the cloud
  lastSync?: string; // Date string in ISO format. (e.g. "2021-01-01T00:00:00.000Z")
  // This is the last time the drawing was modified
  lastModified: string; // Date string in ISO format. (e.g. "2021-01-01T00:00:00.000Z")
  data: {
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
  };
}
