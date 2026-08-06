# Office Excel PWA

A React + TypeScript progressive web app that signs users in with Microsoft and reads/writes rows in an Excel Online **table** using Microsoft Graph.

## What is already included

- Vite + React + TypeScript
- Installable PWA manifest and service worker
- Microsoft authentication with `@azure/msal-react`
- Graph access-token handling
- Example form that appends `[Date, Description, Amount]` to an Excel table
- Recent-row display
- Environment-based configuration; no client secret is used or needed

## 1. Install and run

```bash
npm install
cp .env.example .env.local
npm run dev
```

On Windows Command Prompt, use:

```bat
copy .env.example .env.local
```

The development URL is normally `http://localhost:5173`.

## 2. Register the app in Microsoft Entra

1. Open the Microsoft Entra admin center.
2. Go to **App registrations** → **New registration**.
3. Choose the supported account type:
   - Organization only: use your tenant.
   - Work/school plus personal Microsoft accounts: choose the broad multitenant/personal option and use `common` in `.env.local`.
4. Under **Authentication**, add a **Single-page application** redirect URI:
   - `http://localhost:5173`
5. Under **API permissions**, add delegated Microsoft Graph permissions:
   - `User.Read`
   - `Files.ReadWrite`
6. Copy the **Application (client) ID** into `VITE_MS_CLIENT_ID`.

A browser-based SPA must **not** contain a client secret. Anything prefixed with `VITE_` is shipped to the browser and is public configuration.

## 3. Prepare the workbook

Create an `.xlsx` workbook in OneDrive or SharePoint. In Excel Online:

1. Add headers in this order: `Date`, `Description`, `Amount`.
2. Select the header/data area and choose **Insert → Table**.
3. Give the table a name, such as `Entries`.
4. Set `VITE_EXCEL_TABLE_NAME=Entries`.

The sample app adds rows to a table. A plain worksheet range is not enough for the included `rows/add` endpoint.

## 4. Point the app at the workbook

### Option A: Signed-in user's OneDrive path

```env
VITE_EXCEL_FILE_PATH=/Apps/MyApp/data.xlsx
```

### Option B: Drive and item IDs

Useful for SharePoint or a workbook stored in another drive:

```env
VITE_EXCEL_DRIVE_ID=your-drive-id
VITE_EXCEL_ITEM_ID=your-workbook-item-id
```

When using IDs, remove or leave `VITE_EXCEL_FILE_PATH` blank.

## 5. Production deployment

Run:

```bash
npm run build
```

Deploy the generated `dist/` folder to any HTTPS static host. Then add the production URL as another **Single-page application redirect URI** in the Entra app registration and update `VITE_MS_REDIRECT_URI` before building.

Common free/cheap static hosts include Azure Static Web Apps, Cloudflare Pages, Netlify, and Vercel. The PWA must be served over HTTPS to install normally outside localhost.

## Security notes

- Do not create or store a client secret in this app.
- Delegated Graph permissions mean the app acts as the signed-in user.
- Prefer the narrowest permissions that satisfy the workbook location and sharing model.
- `.env.local` is ignored by Git, but the client ID is not actually secret; it is separated for configuration convenience.
- For a shared organizational workbook, administrators may need to consent to permissions or configure access policies depending on tenant rules.

## Customize the row schema

Change the form fields in `src/components/EntryForm.tsx`, the `EntryRow` interface, and this array in `src/lib/graph.ts`:

```ts
values: [[entry.date, entry.description, entry.amount]]
```

The value order must match the Excel table's column order.
