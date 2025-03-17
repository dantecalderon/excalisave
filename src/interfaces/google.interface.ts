export type CloudFileId = string;

export interface GoogleUserMe {
  id: string;
  email: string;
  family_name: string;
  given_name: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export interface GoogleCreateFileResponse {
  id: string;
  kind: string;
  mimeType: string;
  name: string;
}

// Properties added to the drawing files in `properties`
export interface GoogleFileMetadataProperties {
  excalisaveId: string;
  hash: string;
}

// Used to fetch the details and properties of the files. It doesn't include the file content.
export interface GoogleFilesDetailsResponse {
  files: {
    id: CloudFileId;
    name: string;
    modifiedTime?: string;
    properties: GoogleFileMetadataProperties;
  }[];
}

export interface GoogleFileModifiedResponse {
  modifiedTime?: string;
}

export interface GoogleDriveFileMetadata {
  id: string;
  name: string;
  modifiedTime: string;
  properties:
    | {
        excalisaveId: string;
        hash: string;
      }
    | undefined;
}

export interface GoogleDriveFilesMetadataResponse {
  files: GoogleDriveFileMetadata[];
  nextPageToken?: string;
}

export interface GoogleCreateFolderResponse {
  id: string;
  name: string;
}

export interface GoogleApiErrorResponse {
  error: {
    code: number;
    message: string;
    errors: {
      message: string;
      domain: string;
      reason: string;
      location?: string;
      locationType?: string;
    }[];
    status?: string;
  };
}
