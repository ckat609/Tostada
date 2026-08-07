export const appConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
  sheets: {
    spreadsheetId: import.meta.env.VITE_SHEETS_SPREADSHEET_ID || "",
    sheetName: import.meta.env.VITE_SHEETS_SHEET_NAME || "Ventas",
  },
} as const;

export function getConfigurationProblems(): string[] {
  const problems: string[] = [];

  if (!appConfig.clientId) {
    problems.push("VITE_GOOGLE_CLIENT_ID is missing.");
  }

  if (!appConfig.sheets.spreadsheetId) {
    problems.push("VITE_SHEETS_SPREADSHEET_ID is missing.");
  }

  if (!appConfig.sheets.sheetName) {
    problems.push("VITE_SHEETS_SHEET_NAME is missing.");
  }

  return problems;
}
