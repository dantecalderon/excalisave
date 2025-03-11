import { browser } from "webextension-polyfill-ts";
import { XLogger } from "./logger";

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
    url: string,
    method: string = "GET",
    body?: any
  ) {
    const token = await GoogleDriveApi.getToken();

    const result = await fetch(url, {
      method,
      body,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!result.ok) {
      throw new Error(`Failed to request ${url}`);
    }

    return result.json();
  }

  static async getAuthenticatedUser() {
    const response = await GoogleDriveApi.request(
      "https://www.googleapis.com/userinfo/v2/me",
      "GET"
    );

    XLogger.info("Authenticated user", response);

    return response;
  }
}
