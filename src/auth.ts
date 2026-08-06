import {
  BrowserCacheLocation,
  PublicClientApplication,
  type Configuration,
  type PopupRequest
} from "@azure/msal-browser";
import { appConfig } from "./config";

const msalConfig: Configuration = {
  auth: {
    clientId: appConfig.clientId,
    authority: appConfig.authority,
    redirectUri: appConfig.redirectUri,
    postLogoutRedirectUri: appConfig.redirectUri
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage
  }
};

export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "Files.ReadWrite"]
};

export const msalInstance = new PublicClientApplication(msalConfig);
