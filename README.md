# Google Sheets PWA

A React + TypeScript progressive web app that signs users in with Google and reads/writes rows in a Google Sheet using the Google Sheets API.

## What is already included

- Vite + React + TypeScript
- Installable PWA manifest and service worker
- Google authentication with `@react-oauth/google`
- Google Sheets API integration
- Example form that appends `[Date, Description, Amount]` to a Google Sheet
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

## 2. Set up Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Go to **APIs & Services** → **Library**
   - Search for "Google Sheets API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **OAuth client ID**
   - Choose **Web application**
   - Add authorized JavaScript origins:
     - `http://localhost:5173`
   - Copy the **Client ID** into `VITE_GOOGLE_CLIENT_ID` in `.env.local`

A browser-based SPA must **not** contain a client secret. Anything prefixed with `VITE_` is shipped to the browser and is public configuration.

## 3. Prepare the Google Sheet

1. Create a new Google Sheet or open an existing one
2. Add headers in the first row: `Date`, `Description`, `Amount`
3. Name the sheet tab (e.g., `Ventas`)
4. Copy the spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
5. Update `.env.local`:
   ```env
   VITE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
   VITE_SHEETS_SHEET_NAME=Ventas
   ```
6. Share the spreadsheet with your Google account (the one you'll sign in with)

## 4. Production deployment

Run:

```bash
npm run build
```

Deploy the generated `dist/` folder to any HTTPS static host. Then add the production URL as an **authorized JavaScript origin** in your Google Cloud OAuth client settings.

Common free/cheap static hosts include Cloudflare Pages, Netlify, and Vercel. The PWA must be served over HTTPS to install normally outside localhost.

## Security notes

- Do not create or store a client secret in this app.
- The app requests only Google Sheets API access and acts as the signed-in user.
- `.env.local` is ignored by Git, but the client ID is not actually secret; it is separated for configuration convenience.
- Users must have access to the Google Sheet you configure.

## Customize the row schema

Change the form fields in `src/components/EntryForm.tsx`, the `EntryRow` interface, and this array in `src/lib/graph.ts`:

```ts
values: [[entry.date, entry.description, entry.amount]];
```

The value order must match the Google Sheet's column order.
