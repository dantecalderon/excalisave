import { browser } from "webextension-polyfill-ts";
import { IDrawingExport } from "../interfaces/drawing-export.interface";
import {
  CloudFileId,
  GoogleApiErrorResponse,
  GoogleCreateFileResponse,
  GoogleCreateFolderResponse,
  GoogleDriveFilesMetadataResponse,
  GoogleFileMetadataProperties,
  GoogleFilesDetailsResponse,
  GoogleFileModifiedResponse,
  GoogleUserMe,
} from "../interfaces/google.interface";
import { XLogger } from "./logger";
import { isValidDateString } from "./utils/date.utils";

const BASE_URL = "https://www.googleapis.com";

const logger = XLogger.get("GoogleDriveApi");

async function handleApiError(
  response: Response,
  defaultMessage: string = "GoogleDriveApi: Unknow error"
) {
  if (response.ok) return;

  logger.error("Error in response", response);

  const errorJson: GoogleApiErrorResponse = await response.json();

  logger.error("Error in JSON", errorJson);

  if ([401, 403].includes(errorJson?.error?.code)) {
    await (browser.identity as any).clearAllCachedAuthTokens();

    logger.error("Unauthorized. Logging out", errorJson);

    throw new Error(errorJson?.error?.message || defaultMessage);
  }

  throw new Error(errorJson?.error?.message || defaultMessage);
}

export class GoogleDriveApi {
  /**
   * Get the token from the browser identity.
   * Used to make requests to the Google Drive API.
   * @returns The token.
   */
  private static async getToken(): Promise<string> {
    try {
      const { token } = await (browser.identity as any).getAuthToken({
        interactive: false,
      });

      return token;
    } catch (error) {
      logger.error("Error getting token", error);

      throw error;
    }
  }

  /**
   * Create a new file in the drive. It doesn't save the content of the file, only the metadata.
   *
   * @param name The name of the file to be created.
   * @param metadata Metadata to be saved in the file.
   */
  private static async createNewFile(
    name: string,
    metadata: GoogleFileMetadataProperties
  ): Promise<CloudFileId> {
    logger.info("Creating new file in Drive", { name, metadata });

    const folderId = await GoogleDriveApi.getOrCreateFolderId();

    const token = await GoogleDriveApi.getToken();

    const response = await fetch(`${BASE_URL}/drive/v3/files`, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({
        name: name + ".excalidraw",
        parents: folderId ? [folderId] : [],
        mimeType: "application/json",
        properties: {
          // Identifier to identify the file in the cloud with the local one
          excalisaveId: metadata.excalisaveId,
          // Hash of the file content to know if the file has been modified
          hash: metadata.hash,
        },
      }),
    });

    await handleApiError(response, "Error creating file in Drive");

    const responseJson: GoogleCreateFileResponse = await response.json();

    logger.info("Created file in Drive", responseJson);

    return responseJson.id;
  }

  static async login(): Promise<
    | {
        success: true;
        details: {
          token: string;
          grantedScopes: string[];
        };
      }
    | {
        success: false;
        details: {
          error: string;
          stack: string;
        };
      }
  > {
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
      logger.error("Login failed due to an error:", error);

      return {
        success: false,
        details: {
          error: (error as Error).message,
          stack: (error as Error).stack,
        },
      };
    }
  }

  /**
   * Get the folder 'excalisave' in the root of the drive. If it doesn't exist, it will be created.
   * It caches the folderId in the browser storage, so it avoids to fetch it from the drive every time.
   *
   * @param folderName The name of the folder to get or create. @default 'excalisave'
   * @returns The id of the folder.
   */
  static async getOrCreateFolderId(
    folderName: string = "excalisave"
  ): Promise<string> {
    logger.debug("GoogleDriveApi: Fetching folderId from cache");

    const cachedFolderId = (await browser.storage.local.get("cloudFolderId"))[
      "cloudFolderId"
    ];

    if (cachedFolderId) {
      logger.debug("GoogleDriveApi: Using cached folderId", cachedFolderId);

      return cachedFolderId;
    }

    const token = await GoogleDriveApi.getToken();

    logger.debug(
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

    await handleApiError(
      response,
      `Error fetching folderId by name ${folderName}`
    );

    const responseJson: GoogleDriveFilesMetadataResponse =
      await response.json();

    if (responseJson?.files?.[0]?.id) {
      await browser.storage.local.set({
        cloudFolderId: responseJson.files[0].id,
      });

      logger.debug(`GoogleDriveApi: Found folderId by name "${folderName}"`);

      return responseJson.files[0].id;
    }

    // If not found by name, create it

    logger.debug(
      `GoogleDriveApi: Folder not found by name "${folderName}", creating it...`
    );

    const responseCreate = await fetch(
      `${BASE_URL}/drive/v3/files?uploadType=multipart`,
      {
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
      }
    );

    logger.debug("Response create", responseCreate);

    await handleApiError(responseCreate, `Error creating folder ${folderName}`);

    logger.info("Folder created", responseCreate);

    const responseCreateJson: GoogleCreateFolderResponse =
      await responseCreate.json();

    if (!responseCreateJson?.id) {
      throw new Error("Failed to create folder");
    }

    logger.debug(
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

    logger.debug("Fetching All Files: /drive/v3/files");

    const response = await fetch(
      `${BASE_URL}/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,modifiedTime,properties)&pageSize=1000`,
      {
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      }
    );

    await handleApiError(response);

    const responseJson: GoogleDriveFilesMetadataResponse =
      await response.json();

    logger.debug("Response", responseJson);

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

  static async getAuthenticatedUser(): Promise<GoogleUserMe> {
    const token = await GoogleDriveApi.getToken();

    logger.info("Token is valid", token);

    const response = await fetch(`${BASE_URL}/userinfo/v2/me`, {
      method: "GET",
      headers: {
        Authorization: "Bearer " + token,
      },
    });

    await handleApiError(response);

    const responseJson = await response.json();

    logger.info("Authenticated User", responseJson);

    return responseJson;
  }

  /**
   * Check if a file exists in the drive by the given excalisaveId.
   *
   * We store a custom property 'excalisaveId' in the Google Drive file metadata to track the local drawing ID.
   * @param excalisaveId The local id of the drawing.
   */
  static async findFileMetadataByExcalisaveId(
    excalisaveId: string
  ): Promise<GoogleFilesDetailsResponse["files"][0] | undefined> {
    const token = await GoogleDriveApi.getToken();

    const response = await fetch(
      `${BASE_URL}/drive/v3/files?q=properties has { key='excalisaveId' and value='${excalisaveId}' }`,
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      }
    );

    await handleApiError(response, "Error finding file by excalisaveId");

    const responseJson: GoogleFilesDetailsResponse = await response.json();

    if (responseJson.files.length === 0) {
      logger.warn("File not found", { excalisaveId });

      return undefined;
    }

    return responseJson.files[0];
  }

  /**
   * Save content of a file to Google Drive. If the file doesn't exist, it will be created.
   *
   * @param file The file content to save.
   * @param hash The hash of the current file content.
   * @returns
   */
  static async saveFileToDrive(file: IDrawingExport, hash: string) {
    try {
      const localId = file.excalisave.id;

      const cloudFileMetadata =
        await GoogleDriveApi.findFileMetadataByExcalisaveId(localId);

      let cloudFileId = cloudFileMetadata?.id;

      if (!cloudFileId) {
        logger.info("File not found in Drive, creating it...");

        cloudFileId = await GoogleDriveApi.createNewFile(file.excalisave.name, {
          excalisaveId: localId,
          hash,
        });
      }

      logger.info("Uploading file content in Drive", { cloudFileId });

      const modifiedFile = await GoogleDriveApi.modifyFile(
        cloudFileId,
        file,
        hash
      );

      logger.info("Modified file in Drive", modifiedFile);

      return modifiedFile;
    } catch (error) {
      logger.error("Error saving file to drive", error);
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

    await handleApiError(response);

    const responseJson = await response.json();

    logger.debug("File", responseJson);

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

    await handleApiError(
      response,
      `Failed to rename file '${fileId}' to '${newFilename}'`
    );

    return response.json();
  }

  private static async modifyFile(
    fileId: string,
    file: IDrawingExport,
    hash: string
  ): Promise<GoogleFileModifiedResponse> {
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

    await handleApiError(uploadResponse, "Failed to upload file content");

    logger.debug("Upload response", uploadResponse);

    const response = await uploadResponse.json();

    logger.info("Uploaded file content to drive", response);

    if (!isValidDateString(response?.modifiedTime)) {
      return {};
    }

    return response;
  }

  static async deleteFile(excalisaveId: string): Promise<void> {
    try {
      const token = await GoogleDriveApi.getToken();

      const cloudFileMetadata =
        await GoogleDriveApi.findFileMetadataByExcalisaveId(excalisaveId);

      if (!cloudFileMetadata) {
        logger.error("File not found in Drive, skipping deletion", {
          excalisaveId,
        });

        return;
      }

      const response = await fetch(
        `${BASE_URL}/drive/v3/files/${cloudFileMetadata.id}`,
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

      await handleApiError(
        response,
        `Failed to move file '${excalisaveId}' to trash`
      );

      logger.info("File moved to Trash in Drive", {
        excalisaveId,
        cloudFileMetadata,
      });
    } catch (error) {
      logger.error("Error deleting file", error);

      throw new Error("Failed to delete file");
    }
  }
}
