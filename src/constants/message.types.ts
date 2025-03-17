import { BinaryFileData } from "@excalidraw/excalidraw/types/types";
import { DrawingDataState } from "../interfaces/drawing-data-state.interface";

export enum MessageType {
  // For background:
  SAVE_NEW_DRAWING = "SAVE_NEW_DRAWING",
  UPDATE_DRAWING = "UPDATE_DRAWING",
  RENAME_DRAWING = "RENAME_DRAWING",
  DELETE_DRAWING = "DELETE_DRAWING",
  EXPORT_STORE = "EXPORT_STORE",
  CLEANUP_FILES = "CLEANUP_FILES",
  LOGIN_RESULT = "LOGIN_RESULT",
  CLEAR_DRAWING_ID = "ClearDrawingID",
  AUTO_SAVE = "MessageAutoSave",
}

type WithSaveToCloud<T> = T & {
  saveToCloud?: boolean;
};

export type SaveNewDrawingMessage = {
  type: MessageType.SAVE_NEW_DRAWING;
  payload: WithSaveToCloud<{
    id: string;
    name: string;
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
    imageBase64?: DrawingDataState["imageBase64"];
    viewBackgroundColor?: DrawingDataState["viewBackgroundColor"];
  }>;
};

export type RenameDrawingMessage = {
  type: MessageType.RENAME_DRAWING;
  payload: WithSaveToCloud<{
    id: string;
    name: string;
  }>;
};

export type SaveDrawingMessage = {
  type: MessageType.UPDATE_DRAWING;
  payload: WithSaveToCloud<{
    id: string;
    name?: string;
    excalidraw: string;
    excalidrawState: string;
    versionFiles: string;
    versionDataState: string;
    imageBase64?: DrawingDataState["imageBase64"];
    viewBackgroundColor?: DrawingDataState["viewBackgroundColor"];
    hash?: string;
  }>;
};

export type DeleteDrawingMessage = {
  type: MessageType.DELETE_DRAWING;
  payload: WithSaveToCloud<{
    id: string;
  }>;
};

export type ExportStoreMessage = {
  type: MessageType.EXPORT_STORE;
  payload: {
    files: Record<string, BinaryFileData>;
  };
};

export type CleanupFilesMessage = {
  type: MessageType.CLEANUP_FILES;
  payload: {
    tabId: number;
    executionTimestamp: number;
  };
};

export type AutoSaveMessage = {
  type: MessageType.AUTO_SAVE;
  payload: {
    name: string;
    setCurrent: boolean;
  };
};

export type LoginResultMessage = {
  type: MessageType.LOGIN_RESULT;
  payload:
    | {
        success: true;
        details: {
          grantedScopes: string[];
          token: string;
        };
      }
    | {
        success: false;
        details: {
          error: string;
          stack: string;
        };
      };
};
