export interface GoogleUserMe {
  id: string;
  email: string;
  family_name: string;
  given_name: string;
  name: string;
  picture: string;
  verified_email: boolean;
}

export interface GoogleModifyFileResponse {
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

interface GoogleApiErrorDetail {
  message: string;
  domain: string;
  reason: string;
  location?: string;
  locationType?: string;
}

interface GoogleApiError {
  code: number;
  message: string;
  errors: GoogleApiErrorDetail[];
  status?: string;
}

export interface GoogleApiErrorResponse {
  error: GoogleApiError;
}
