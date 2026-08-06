import {
  InteractionRequiredAuthError,
  type AccountInfo,
  type IPublicClientApplication
} from "@azure/msal-browser";
import { appConfig } from "../config";
import { loginRequest } from "../auth";

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

async function getAccessToken(
  instance: IPublicClientApplication,
  account: AccountInfo
): Promise<string> {
  try {
    const result = await instance.acquireTokenSilent({
      ...loginRequest,
      account
    });
    return result.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const result = await instance.acquireTokenPopup({
        ...loginRequest,
        account
      });
      return result.accessToken;
    }
    throw error;
  }
}

function workbookBaseUrl(): string {
  const { filePath, driveId, itemId } = appConfig.excel;

  if (driveId && itemId) {
    return `${GRAPH_ROOT}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/workbook`;
  }

  if (filePath) {
    const normalizedPath = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return `${GRAPH_ROOT}/me/drive/root:${normalizedPath}:/workbook`;
  }

  throw new Error("The workbook location is not configured.");
}

async function graphRequest<T>(
  instance: IPublicClientApplication,
  account: AccountInfo,
  url: string,
  init: RequestInit = {}
): Promise<T> {
  const accessToken = await getAccessToken(instance, account);
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init.headers
    }
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Microsoft Graph returned ${response.status}: ${body || response.statusText}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export interface EntryRow {
  date: string;
  description: string;
  amount: number;
}

export async function addEntryRow(
  instance: IPublicClientApplication,
  account: AccountInfo,
  entry: EntryRow
): Promise<void> {
  const tableName = encodeURIComponent(appConfig.excel.tableName);
  const url = `${workbookBaseUrl()}/tables/${tableName}/rows/add`;

  await graphRequest(instance, account, url, {
    method: "POST",
    body: JSON.stringify({
      values: [[entry.date, entry.description, entry.amount]]
    })
  });
}

interface TableRowsResponse {
  values?: Array<{ values?: unknown[][] }>;
}

export async function getRecentRows(
  instance: IPublicClientApplication,
  account: AccountInfo
): Promise<unknown[][]> {
  const tableName = encodeURIComponent(appConfig.excel.tableName);
  const url = `${workbookBaseUrl()}/tables/${tableName}/rows?$top=10`;
  const response = await graphRequest<TableRowsResponse>(instance, account, url);

  return (response.values ?? [])
    .flatMap((row) => row.values ?? [])
    .slice(-10)
    .reverse();
}
