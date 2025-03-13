import { browser } from "webextension-polyfill-ts";
import { XLogger } from "./logger";
import { IDrawingExport } from "../interfaces/drawing-export.interface";
import axios from "redaxios";

const api = axios.create({
  baseURL: "https://www.googleapis.com",
});

export class GoogleDriveApi {
  private static async getToken(): Promise<string> {
    try {
      const { token } = await (browser.identity as any).getAuthToken({
        interactive: false,
      });

      return token;
    } catch (error) {
      XLogger.error("Error getting token", error);
      throw new Error("Failed to get token");
    }
  }

  /**
   * Check if the user is authenticated with google.
   * @returns true if the user is authenticated, false otherwise
   */
  static async isUserAuthenticated(): Promise<boolean> {
    try {
      const { token } = await (browser.identity as any).getAuthToken({
        interactive: false,
      });

      return !!token;
    } catch (error) {
      console.warn("⚠️ No hay usuario autenticado o el token expiró.", error);
      return false;
    }
  }

  static async login() {
    try {
      const { token } = await (browser.identity as any).getAuthToken({
        interactive: true,
      });

      return token;
    } catch (error) {
      XLogger.error("Error logging in", error);
      throw new Error("Failed to login");
    }
  }

  private static async request(
    path: string,
    method: string = "GET",
    body?: any
  ) {
    const token = await GoogleDriveApi.getToken();

    const result = await fetch("https://www.googleapis.com" + path, {
      method,
      body,
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    if (!result.ok) {
      throw new Error("Failed to request " + path);
    }

    return result.json();
  }

  static async getAuthenticatedUser() {
    const response = await GoogleDriveApi.request("/userinfo/v2/me");

    XLogger.info("Authenticated user", response);

    return response;
  }

  static async saveFileToDrive(file: IDrawingExport) {
    try {
      const folderId = "195z-HF3Ddtw9UDsA3mXM-FkD5n4xN1F0";
      const token = await GoogleDriveApi.getToken();
      const localId = file.excalisave.id;

      // First create the file metadata
      const response = await api.post(
        "/drive/v3/files",
        {
          name: file.excalisave.name + ".excalidraw",
          parents: folderId ? [folderId] : [],
          mimeType: "application/json",
          description: localId,
        },
        {
          headers: {
            Authorization: "Bearer " + token,
          },
          params: {
            fields: "id, name, createdTime,modifiedTime,mimeType,size",
          },
        }
      );

      XLogger.info("Created file metadata in drive", response.data);

      // Then upload the actual file content using the /upload endpoint
      const fileContent = JSON.stringify(file);
      const uploadResponse = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files/" +
          response.data.id +
          "?uploadType=media",
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: fileContent,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(
          "Failed to upload file content: " + (await uploadResponse.text())
        );
      }

      const uploadData = await uploadResponse.json();
      XLogger.info("Uploaded file content to drive", uploadData);

      return response.data;
    } catch (error) {
      XLogger.error("Error saving file to drive", error);
      console.error(error);
      // throw new Error("Failed to save file to drive");
    }
  }
}
