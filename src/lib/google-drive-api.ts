import { browser } from "webextension-polyfill-ts";
import { XLogger } from "./logger";
import { IDrawingExport } from "../interfaces/drawing-export.interface";
import axios from "redaxios";
import { GoogleModifyFileResponse } from "../interfaces/google.interface";
import { isValidDateString } from "./utils/date.utils";

const BASE_URL = "https://www.googleapis.com";

const api = axios.create({
  baseURL: BASE_URL,
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

  /**
   * Check if a file exists in the drive with the given excalisaveId.
   * (Different from the file id in Google Drive).
   *
   * We store a custom property 'excalisaveId' in the Google Drive file metadata to track the local drawing ID.
   * @param excalisaveId The local id of the drawing.
   */
  static async findByExcalisaveId(excalisaveId: string) {
    const token = await GoogleDriveApi.getToken();

    const response = await api.get("/drive/v3/files", {
      headers: {
        Authorization: "Bearer " + token,
      },
      params: {
        q: `properties has { key='excalisaveId' and value='${excalisaveId}' }`,
      },
    });

    XLogger.debug("File exists", response.data);

    return response.data.files;
  }

  static async saveFileToDrive(file: IDrawingExport) {
    try {
      const folderId = "195z-HF3Ddtw9UDsA3mXM-FkD5n4xN1F0";
      const token = await GoogleDriveApi.getToken();

      const localId = file.excalisave.id;

      const cloudFile = await GoogleDriveApi.findByExcalisaveId(localId);

      console.log("File exists??", cloudFile);

      let cloudFileId = cloudFile?.[0]?.id;

      const cloudFileName = cloudFile?.[0]?.name?.split?.(".excalidraw")?.[0];
      console.log("Cloud file name", cloudFileName, file.excalisave.name);

      if (
        cloudFileId &&
        typeof cloudFileName === "string" &&
        cloudFileName !== file.excalisave.name
      ) {
        XLogger.info("File already exists in drive", cloudFile);
        await GoogleDriveApi.renameFile(
          cloudFileId,
          file.excalisave.name + ".excalidraw"
        );
      }

      if (!cloudFileId) {
        // First create the file metadata
        const response = await api.post(
          "/drive/v3/files",
          {
            name: file.excalisave.name + ".excalidraw",
            parents: folderId ? [folderId] : [],
            mimeType: "application/json",
            description: localId,
            properties: {
              // Save the local id of the drawing to be able to modify the file later
              excalisaveId: localId,
            },
          },
          {
            headers: {
              Authorization: "Bearer " + token,
            },
            params: {
              fields: "id, name, createdTime, modifiedTime, size, properties",
            },
          }
        );

        XLogger.info("Created file metadata in drive", response.data);

        cloudFileId = response.data.id;
      }

      const modifyFileResponse = await GoogleDriveApi.modifyFile(
        token,
        cloudFileId,
        file
      );

      XLogger.info("Modified file in drive", modifyFileResponse);

      return modifyFileResponse;
    } catch (error) {
      XLogger.error("Error saving file to drive", error);
      console.error(error);
      // throw new Error("Failed to save file to drive");
      return undefined;
    }
  }

  /**
   * Rename a file in Google Drive.
   * @param fileId The excalisave id of the file to rename.
   * @param newFilename Filename without extension.
   */
  static async renameFile(fileId: string, newFilename: string) {
    const token = await GoogleDriveApi.getToken();

    const response = await fetch(`${BASE_URL}/drive/v3/files/${fileId}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newFilename + ".excalidraw",
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to rename file '${fileId}' to '${newFilename}'`);
    }

    return response.json();
  }

  static async modifyFile(
    token: string,
    fileId: string,
    file: IDrawingExport
  ): Promise<GoogleModifyFileResponse> {
    // Then upload the actual file content using the /upload endpoint
    const fileContent = JSON.stringify(file);
    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files/" +
        fileId +
        "?uploadType=media&fields=modifiedTime",
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

    const response = await uploadResponse.json();

    XLogger.info("Uploaded file content to drive", response);

    if (!isValidDateString(response?.modifiedTime)) {
      return {};
    }

    return response;
  }
}
