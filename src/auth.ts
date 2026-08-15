import { appConfig } from "./config";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets"
].join(" ");

export const googleClientId = appConfig.clientId;

interface StoredAuth {
  accessToken: string;
  userEmail: string;
  expiresAt: number; // epoch ms
}

const AUTH_STORAGE_KEY = "la-noria-auth";

export function saveAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

// Returns the stored session only if it hasn't expired yet; clears it otherwise.
export function loadAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.accessToken || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function clearAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}
