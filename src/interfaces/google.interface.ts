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
