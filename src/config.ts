const tenantId = import.meta.env.VITE_MS_TENANT_ID || "common";

export const appConfig = {
  clientId: import.meta.env.VITE_MS_CLIENT_ID || "",
  authority: `https://login.microsoftonline.com/${tenantId}`,
  redirectUri: import.meta.env.VITE_MS_REDIRECT_URI || window.location.origin,
  excel: {
    filePath: import.meta.env.VITE_EXCEL_FILE_PATH || "",
    driveId: import.meta.env.VITE_EXCEL_DRIVE_ID || "",
    itemId: import.meta.env.VITE_EXCEL_ITEM_ID || "",
    tableName: import.meta.env.VITE_EXCEL_TABLE_NAME || "Entries"
  }
} as const;

export function getConfigurationProblems(): string[] {
  const problems: string[] = [];

  if (!appConfig.clientId) {
    problems.push("VITE_MS_CLIENT_ID is missing.");
  }

  const usesPath = Boolean(appConfig.excel.filePath);
  const usesIds = Boolean(appConfig.excel.driveId && appConfig.excel.itemId);

  if (!usesPath && !usesIds) {
    problems.push(
      "Set VITE_EXCEL_FILE_PATH, or set both VITE_EXCEL_DRIVE_ID and VITE_EXCEL_ITEM_ID."
    );
  }

  if (!appConfig.excel.tableName) {
    problems.push("VITE_EXCEL_TABLE_NAME is missing.");
  }

  return problems;
}
