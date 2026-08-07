import { appConfig } from "./config";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets"
].join(" ");

export const googleClientId = appConfig.clientId;
