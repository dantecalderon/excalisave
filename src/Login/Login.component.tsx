import { Button } from "@radix-ui/themes";
import React from "react";
import { browser } from "webextension-polyfill-ts";

export const Login: React.FC = () => {
  return (
    <div>
      <Button
        onClick={async () => {
          const { token } = await (browser.identity as any).getAuthToken({
            interactive: true,
          });

          console.log("Token", token);

          // TODO: Store in some place:
          const folderId = "195z-HF3Ddtw9UDsA3mXM-FkD5n4xN1F0";

          // Fetch list of all files in drive
          // fetch("https://www.googleapis.com/drive/v3/files", {
          //   headers: {
          //     Authorization: `Bearer ${token}`,
          //   },
          // }).then(async (res) => {
          //   console.log(await res.json());
          // });
        }}
      >
        Login
      </Button>
    </div>
  );
};

async function createFolderIfNotExists(token: string, folderName: string) {
  return await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  }).then((response) => response.json());
}

async function listAllFilesInDrive(token: string) {
  return await fetch("https://www.googleapis.com/drive/v3/files", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }).then((response) => response.json());
}
