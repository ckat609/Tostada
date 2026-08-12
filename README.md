# La Noria - Registro de Ventas

A mobile-friendly Progressive Web App for tracking sales data with Google Sheets as the backend. Built with React + TypeScript and optimized for touch
interfaces.

## Features

- **Google Sheets Integration**: Direct read/write access to your spreadsheet
- **Multi-page Navigation**: Hamburger menu for switching between Registro de Ventas, Rutas, Clientes, Vendedores, Categorías, Presentaciones, Sabores, and Productos
- **Mobile-First Design**: Large touch-friendly buttons and modal-based inputs, native device inputs for date and quantity
- **Auto-incrementing IDs**: Automatic `correlativo` generation for every new row, on every sheet
- **Audit Trail**: `agregado`/`editado` timestamps recorded automatically on create/edit (all sheets except ventas)
- **Smart Filtering**: View sales by today, week, month, or custom date range; filter productos by categoria
- **Edit & Delete**: Modify or soft-delete entries directly from the interface (nothing is ever hard-deleted)
- **Export Options**: Share or download sales data as CSV with categoria column
- **Real-time Sync**: Changes reflect immediately in Google Sheets
- **Multi-sheet Support**: Integrates with rutas, clientes, vendedores, categorías, presentaciones, sabores, and productos sheets
- **Multi-select Support**: Productos can have multiple presentaciones and sabores via checkbox interface
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

Create a Google Spreadsheet with the following sheets and headers (case-insensitive, order-independent). All correlativo columns auto-increment when a
row is added through the app.

### Sheet: `ventas`

Headers: `correlativo`, `fecha`, `ruta`, `cliente`, `descripcion`, `presentacion`, `sabor`, `cantidad`, `estado`

`ruta` stores the correlativo of a row in `rutas`; `cliente` stores the correlativo of the matching row in `clientes`; `descripcion` stores the correlativo of a row in `productos`; `presentacion` stores the correlativo of a row in `presentaciones`; `sabor` stores the correlativo of a row in `sabores`. `estado` is used for soft delete (set to `deleted`).

### Sheet: `rutas`

Headers: `correlativo`, `ruta`, `estado`, `agregado`, `editado`

### Sheet: `clientes`

Headers: `correlativo`, `auxiliar`, `codigo`, `ruta`, `cliente`, `estado`, `agregado`, `editado`

`ruta` stores the correlativo of a row in `rutas`.

### Sheet: `vendedores`

Headers: `correlativo`, `vendedor`, `estado`, `agregado`, `editado`

### Sheet: `categorias`

Headers: `correlativo`, `categoria`, `estado`, `agregado`, `editado`

### Sheet: `productos`

Headers: `correlativo`, `producto`, `categoria`, `presentaciones`, `sabores`, `estado`, `agregado`, `editado`

`categoria` stores the correlativo of a row in `categorias`. `presentaciones` and `sabores` store comma-separated lists of correlativos from `presentaciones` and `sabores` sheets respectively.

### Sheet: `presentaciones`

Headers: `correlativo`, `presentacion`, `estado`, `agregado`, `editado`

### Sheet: `sabores`

Headers: `correlativo`, `sabor`, `estado`, `agregado`, `editado`

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

Deploy the generated `dist/` folder to any HTTPS static host. Then add the production URL as an **authorized JavaScript origin** in your Google Cloud
OAuth client settings.

Common free/cheap static hosts include Cloudflare Pages, Netlify, and Vercel. The PWA must be served over HTTPS to install normally outside localhost.

## Security notes

- Do not create or store a client secret in this app.
- The app requests only Google Sheets API access and acts as the signed-in user.
- `.env.local` is ignored by Git, but the client ID is not actually secret; it is separated for configuration convenience.
- Users must have access to the Google Sheet you configure.

## How It Works

1. **Authentication**: Users sign in with their Google account
2. **Navigation**: A hamburger button (fixed top-right) opens a menu to switch between Registro de Ventas, Rutas, Clientes, Vendedores, Categorías, Presentaciones, Sabores, and Productos
3. **Data Entry (Registro de Ventas)**: Touch-friendly interface for selecting:
   - Date (native device date picker)
   - Ruta → Cliente (cascading modal selection)
   - Categoría (optional filter) → Producto (modal selection)
   - Presentación / Sabor (cascading modal selection, sabor only shown if producto has sabores)
   - Cantidad (native number input)
4. **Maintenance pages (Rutas / Clientes / Vendedores / Categorías / Presentaciones / Sabores)**: Each has its own "Agregar" form and "Libro de trabajo" list with a collapse arrow, inline edit, and delete. Clientes additionally has a Ruta dropdown and Código/Auxiliar fields, and its list filters by the ruta selected in the form.
5. **Productos page**: Multi-select interface with categoria dropdown, and checkbox grids for presentaciones and sabores. At least one presentacion is required; sabores are optional.
6. **Auto-increment**: The `correlativo` field auto-increments on every new row, on every sheet
7. **Audit trail**: `agregado` is stamped when a row is created; `editado` is stamped on every create, edit, or delete (all sheets except ventas)
8. **View Sales**: Grouped by date and ruta with collapsible sections
9. **Filtering**: Filter ventas by today, last week, last month, or custom range
10. **Edit/Delete**: Click "Editar" or "Borrar" on any entry; deletes are soft (the `estado` column is set to `deleted`, nothing is removed from the sheet)
11. **Export**: Share via native share sheet or download as CSV with categoria column included (ventas only)

## Project Structure

```
src/
├── components/
│   ├── EntryForm.tsx        # Mobile-friendly sales entry form
│   ├── RecentRows.tsx       # Sales list with filtering and export
│   ├── HamburgerMenu.tsx    # Top-right nav menu (Ventas/Rutas/Clientes/Vendedores/Categorías/Presentaciones/Sabores/Productos)
│   ├── RutaForm.tsx / RutaList.tsx / RutasView.tsx
│   ├── ClienteForm.tsx / ClienteList.tsx / ClientesView.tsx
│   ├── VendedorForm.tsx / VendedorList.tsx / VendedoresView.tsx
│   ├── CategoriaForm.tsx / CategoriaList.tsx / CategoriasView.tsx
│   ├── PresentacionForm.tsx / PresentacionList.tsx / PresentacionesView.tsx
│   ├── SaborForm.tsx / SaborList.tsx / SaboresView.tsx
│   └── ProductoForm.tsx / ProductoList.tsx / ProductosView.tsx
├── lib/
│   └── graph.ts             # Google Sheets API integration
├── config.ts                # Environment configuration
├── auth.ts                  # Google OAuth scopes
├── styles.css               # Blue Material Design theme
└── App.tsx                  # Main application component, page routing
```

## Key Features Explained

### Mobile-First UI

- Modal-based selection for ruta, cliente, categoria, producto, presentacion, and sabor in Registro de Ventas
- Native device inputs for date and cantidad (better UX on mobile)
- Large tap targets (56px minimum height) throughout
- Two-column layout maintained on all screen sizes for paired fields
- Checkbox grids with visual feedback for multi-select (productos page)

### Navigation

- A fixed hamburger button in the top-right corner slides down a menu with all pages
- The header title updates to match the active page
- Logout button integrated into account info bar

### Smart Data Management

- Cascading selections: Choose ruta first, then see only relevant clientes
- Optional categoria filter narrows down producto selection
- Choose producto first, then see only its presentaciones and sabores
- Productos support multiple presentaciones and sabores via comma-separated correlativos
- Auto-incrementing correlativo prevents duplicate IDs on every sheet
- Case-insensitive, order-independent column header matching for flexibility

### Edit Mode

- Click "Editar" to load a row into its entry form
- Form background changes to yellow with an "Editando…" indicator
- Cancel or save changes
- All fields are validated before saving

### Filtering & Export (Registro de Ventas)

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

Modify interfaces and header lookups in `src/lib/graph.ts`:

- `EntryRow` / `RecentRow` - ventas (includes ruta, cliente, descripcion, presentacion, sabor, cantidad)
- `Ruta`, `Cliente`, `Vendedor`, `Categoria`, `Presentacion`, `Sabor` - basic maintenance entities
- `Producto` - supports multiple presentaciones and sabores via comma-separated correlativos
- API functions use header-based column mapping (order-independent)
- Multi-value fields (presentaciones, sabores in productos) stored as comma-separated strings

### Language

All UI text is in Spanish. Search for Spanish strings in `src/components/` and `src/App.tsx`.

## Browser Support

- Modern browsers with ES6+ support
- Mobile Safari (iOS)
- Chrome/Edge (Android)
- Requires HTTPS for PWA installation (except localhost)
