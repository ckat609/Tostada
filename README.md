# La Nona - Registro de Ventas

A mobile-friendly Progressive Web App for tracking sales data with Google Sheets as the backend. Built with React + TypeScript and optimized for touch interfaces.

## Features

- **Google Sheets Integration**: Direct read/write access to your sales spreadsheet
- **Mobile-First Design**: Large touch-friendly buttons and modal-based inputs
- **Auto-incrementing IDs**: Automatic codigo generation for each sale
- **Smart Filtering**: View sales by today, week, month, or custom date range
- **Edit & Delete**: Modify or remove entries directly from the interface
- **Export Options**: Share or download sales data as CSV
- **Real-time Sync**: Changes reflect immediately in Google Sheets
- **Multi-sheet Support**: Integrates with rutas, clientes, and productos sheets
- **Offline Capable**: PWA with service worker for offline functionality

## Tech Stack

- Vite + React + TypeScript
- Google OAuth 2.0 (`@react-oauth/google`)
- Google Sheets API v4
- Progressive Web App (installable on mobile devices)
- Blue Material Design color scheme

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

Create a Google Spreadsheet with the following sheets and headers (case-insensitive):

### Sheet: `ventas`
Headers: `codigo`, `fecha`, `cliente`, `descripcion`, `presentacion`, `cantidad`

### Sheet: `rutas`
Headers: `codigo`, `ruta`

### Sheet: `clientes`
Headers: `codigo`, `ruta`, `cliente`

### Sheet: `productos`
Headers: `descripcion`, `presentacion` (comma-separated list of sizes/variants)

### Configuration

1. Copy the spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
2. Update `.env.local`:
   ```env
   VITE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
   VITE_SHEETS_SHEET_NAME=ventas
   ```
3. Share the spreadsheet with your Google account (the one you'll sign in with)

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

## How It Works

1. **Authentication**: Users sign in with their Google account
2. **Data Entry**: Touch-friendly modal interface for selecting:
   - Date (custom calendar picker)
   - Ruta → Cliente (cascading selection)
   - Producto → Presentacion (cascading selection)
   - Cantidad (custom number pad)
3. **Auto-increment**: The `codigo` field auto-increments on each new entry
4. **View Sales**: Grouped by date and ruta with collapsible sections
5. **Filtering**: Filter by today, last week, last month, or custom range
6. **Edit/Delete**: Click "Editar" or "Borrar" on any sale entry
7. **Export**: Share via native share sheet or download as CSV

## Project Structure

```
src/
├── components/
│   ├── EntryForm.tsx       # Mobile-friendly sales entry form
│   └── RecentRows.tsx      # Sales list with filtering and export
├── lib/
│   └── graph.ts            # Google Sheets API integration
├── config.ts               # Environment configuration
├── auth.ts                 # Google OAuth scopes
├── styles.css              # Blue Material Design theme
└── App.tsx                 # Main application component
```

## Key Features Explained

### Mobile-First UI
- All input fields open as full-screen modals with large tap targets (70px minimum height)
- Custom number pad for quantity input
- Custom calendar picker with large day buttons
- Modal-based selection for all dropdowns

### Smart Data Management
- Cascading selections: Choose ruta first, then see only relevant clientes
- Choose producto first, then see only its presentaciones
- Auto-incrementing codigo prevents duplicate IDs
- Case-insensitive column header matching for flexibility

### Edit Mode
- Click "Editar" to load a sale into the entry form
- Form background changes to red with "Editando entrada" indicator
- Cancel or save changes
- All fields are validated before saving

### Filtering & Export
- Collapsible sales section to save screen space
- Filter by: Hoy, Semana, Mes, or custom Rango
- Export as CSV with share sheet (mobile) or direct download
- Sales grouped by date and ruta for easy viewing

## Customization

### Colors
Edit `src/styles.css` to change the blue theme:
- Primary: `#2196F3`
- Secondary: `#e3f2fd`
- Text: `#1a1f2e`

### Sheet Structure
Modify interfaces in `src/lib/graph.ts`:
- `EntryRow` - Data structure for new entries
- `RecentRow` - Data structure for display
- API functions use header-based column mapping (order-independent)

### Language
All UI text is in Spanish. Search for Spanish strings in:
- `src/components/EntryForm.tsx`
- `src/components/RecentRows.tsx`
- `src/App.tsx`

## Browser Support

- Modern browsers with ES6+ support
- Mobile Safari (iOS)
- Chrome/Edge (Android)
- Requires HTTPS for PWA installation (except localhost)
