/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_MS_CLIENT_ID: string;
  readonly VITE_MS_TENANT_ID?: string;
  readonly VITE_MS_REDIRECT_URI?: string;
  readonly VITE_EXCEL_FILE_PATH?: string;
  readonly VITE_EXCEL_DRIVE_ID?: string;
  readonly VITE_EXCEL_ITEM_ID?: string;
  readonly VITE_EXCEL_TABLE_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
