// This interface defined the structure of the drawing that is imported/exported from the extension.

export interface IDrawingExport {
  elements: any[];
  version: 2;
  type: "excalidraw";
  source: "https://excalidraw.com";
  appState: {
    gridSize: null;
    viewBackgroundColor: string;
  };
  files: Record<string, any>;
  // This is our custom data, useful to import/export.
  excalisave: {
    id: string;
    createdAt: string;
    imageBase64?: string;
    name: string;
  };
}
