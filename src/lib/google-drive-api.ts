import axios from "redaxios";
import { browser } from "webextension-polyfill-ts";
import { IDrawingExport } from "../interfaces/drawing-export.interface";
import {
  GoogleCreateFolderResponse,
  GoogleDriveFilesMetadataResponse,
  GoogleModifyFileResponse,
} from "../interfaces/google.interface";
import { XLogger } from "./logger";
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
      const { token, grantedScopes } = await (
        browser.identity as any
      ).getAuthToken({
        interactive: true,
      });

      return {
        success: true,
        details: {
          token,
          grantedScopes,
        },
      };
    } catch (error) {
      XLogger.error("Login failed due to an error:", error);

      return {
        success: false,
        details: {
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
      };
    }
  }

  static async getOrCreateFolderId(
    folderName: string = "excalisave"
  ): Promise<string> {
    XLogger.debug("GoogleDriveApi: Fetching folderId from cache");

    const cachedFolderId = (await browser.storage.local.get("cloudFolderId"))[
      "cloudFolderId"
    ];

    if (cachedFolderId) {
      XLogger.debug("GoogleDriveApi: Using cached folderId", cachedFolderId);

      return cachedFolderId;
    }

    const token = await GoogleDriveApi.getToken();

    XLogger.debug(
      `GoogleDriveApi: folderId not found in cache, fetching folder by name ${folderName}`
    );

    const response = await fetch(
      `${BASE_URL}/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    const responseJson: GoogleDriveFilesMetadataResponse =
      await response.json();

    if (responseJson?.files?.[0]?.id) {
      await browser.storage.local.set({
        cloudFolderId: responseJson.files[0].id,
      });

      XLogger.debug(`GoogleDriveApi: Found folderId by name ${folderName}`);

      return responseJson.files[0].id;
    }

    // If not found by name, create it

    XLogger.debug(
      `GoogleDriveApi: Folder not found by name ${folderName}, creating it`
    );

    const responseCreate = await fetch("/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: ["root"],
      }),
    });

    const responseCreateJson: GoogleCreateFolderResponse =
      await responseCreate.json();

    if (!responseCreateJson?.id) {
      throw new Error("Failed to create folder");
    }

    XLogger.debug(
      `GoogleDriveApi: Created folder ${folderName} with id ${responseCreateJson.id}`
    );

    await browser.storage.local.set({
      cloudFolderId: responseCreateJson.id,
    });

    return responseCreateJson.id;
  }

  static async getAllFiles() {
    const folderId = await GoogleDriveApi.getOrCreateFolderId();

    const token = await GoogleDriveApi.getToken();

    XLogger.debug("Fetching All Files: /drive/v3/files");

    const response = await fetch(
      `${BASE_URL}/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime,properties)&pageSize=1000`,
      {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      }
    );

    const responseJson: GoogleDriveFilesMetadataResponse =
      await response.json();

    XLogger.debug("Response", responseJson);

    let files = responseJson.files.filter((file) => {
      return file.properties?.excalisaveId !== undefined;
    });

    let isNextPageAvailable = responseJson.nextPageToken ? true : false;
    let nextPageToken = responseJson.nextPageToken;

    while (isNextPageAvailable) {
      const response = await fetch(
        `${BASE_URL}/drive/v3/files?q='${folderId}' in parents&fields=files(id,name,modifiedTime,properties)&pageSize=1000&pageToken=${nextPageToken}`,
        {
          headers: {
            Authorization: "Bearer " + token,
            Accept: "application/json",
          },
        }
      );

      const responseJson: GoogleDriveFilesMetadataResponse =
        await response.json();

      files.push(...responseJson.files);
      isNextPageAvailable = responseJson.nextPageToken ? true : false;
      nextPageToken = responseJson.nextPageToken;
    }

    return files;
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

  static async saveFileToDrive(file: IDrawingExport, hash: string) {
    try {
      const folderId = await GoogleDriveApi.getOrCreateFolderId();

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
              hash,
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
        cloudFileId,
        file,
        hash
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

  static async getFile(fileId: string): Promise<IDrawingExport> {
    const token = await GoogleDriveApi.getToken();

    const response = await fetch(
      `${BASE_URL}/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    const responseJson = await response.json();

    XLogger.debug("File", responseJson);

    return responseJson;
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
    fileId: string,
    file: IDrawingExport,
    hash: string
  ): Promise<GoogleModifyFileResponse> {
    const token = await GoogleDriveApi.getToken();

    const metadata = new Blob(
      [
        JSON.stringify({
          properties: {
            excalisaveId: file.excalisave.id,
            hash,
          },
        }),
      ],
      {
        type: "application/json",
      }
    );

    const form = new FormData();
    form.append("metadata", metadata);
    form.append("file", JSON.stringify(file));

    const uploadResponse = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files/" +
        fileId +
        "?uploadType=multipart&fields=modifiedTime",
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer " + token,
        },
        body: form,
      }
    );

    if (!uploadResponse.ok) {
      throw new Error(
        "Failed to upload file content: " + (await uploadResponse.text())
      );
    }

    XLogger.debug("Upload response", uploadResponse);

    const response = await uploadResponse.json();

    XLogger.info("Uploaded file content to drive", response);

    if (!isValidDateString(response?.modifiedTime)) {
      return {};
    }

    return response;
  }

  static async deleteFile(localFileId: string): Promise<void> {
    try {
      const token = await GoogleDriveApi.getToken();

      const cloudFile = await GoogleDriveApi.findByExcalisaveId(localFileId);

      if (!cloudFile?.[0]?.id) {
        XLogger.error("No cloud file found with id", localFileId);
        return;
      }

      const response = await fetch(
        `${BASE_URL}/drive/v3/files/${cloudFile[0].id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: "Bearer " + token,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trashed: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to move  file '${localFileId}'`);
      }

      XLogger.info("Moved file to trash");
    } catch (error) {
      XLogger.error("Error deleting file", error);
      throw new Error("Failed to delete file");
    }
  }
}
