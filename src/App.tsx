import { useCallback, useEffect, useState } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { appConfig, getConfigurationProblems } from "./config";
import { EntryForm } from "./components/EntryForm";
import { RecentRows } from "./components/RecentRows";
import { HamburgerMenu, VIEW_TITLES, type ViewKey } from "./components/HamburgerMenu";
import { RutasView } from "./components/RutasView";
import { ClientesView } from "./components/ClientesView";
import { VendedoresView } from "./components/VendedoresView";
import { CategoriasView } from "./components/CategoriasView";
import { getRecentRows, getRutas, getPresentaciones, getTamanos, getProductos, getClientes, getVendedores, getCategorias, type RecentRow, type Ruta, type Presentacion, type Tamano, type Producto, type Cliente, type Vendedor, type Categoria } from "./lib/graph";
import { GOOGLE_SCOPES } from "./auth";

export default function App() {
  const [view, setView] = useState<ViewKey>("ventas");
  const [accessToken, setAccessToken] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [rows, setRows] = useState<RecentRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowError, setRowError] = useState("");
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [tamanos, setTamanos] = useState<Tamano[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [editingRow, setEditingRow] = useState<RecentRow | null>(null);
  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const configurationProblems = getConfigurationProblems();

  const handleEdit = (row: RecentRow) => {
    setEditingRow(row);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditRuta = (ruta: Ruta) => {
    setEditingRuta(ruta);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditCliente = (cliente: Cliente) => {
    setEditingCliente(cliente);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditVendedor = (vendedor: Vendedor) => {
    setEditingVendedor(vendedor);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditCategoria = (categoria: Categoria) => {
    setEditingCategoria(categoria);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshRows = useCallback(async () => {
    if (!accessToken || configurationProblems.length > 0) return;

    setLoadingRows(true);
    setRowError("");
    try {
      const [rowsData, rutasData, presentacionesData, tamanosData, productosData, clientesData, vendedoresData, categoriasData] = await Promise.all([
        getRecentRows(accessToken),
        getRutas(accessToken),
        getPresentaciones(accessToken),
        getTamanos(accessToken),
        getProductos(accessToken),
        getClientes(accessToken),
        getVendedores(accessToken),
        getCategorias(accessToken)
      ]);
      setRows(rowsData);
      setRutas(rutasData);
      setPresentaciones(presentacionesData);
      setTamanos(tamanosData);
      setProductos(productosData);
      setClientes(clientesData);
      setVendedores(vendedoresData);
      setCategorias(categoriasData);
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Could not load spreadsheet rows.");
    } finally {
      setLoadingRows(false);
    }
  }, [accessToken, configurationProblems.length]);

  useEffect(() => {
    void refreshRows();
  }, [refreshRows]);

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setAccessToken(tokenResponse.access_token);

      const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await userInfoResponse.json();
      setUserEmail(userInfo.email);
    },
    scope: GOOGLE_SCOPES,
  });

  function signOut() {
    googleLogout();
    setAccessToken("");
    setUserEmail("");
    setRows([]);
  }

  const isAuthenticated = Boolean(accessToken);

  return (
    <main className="shell">
      {isAuthenticated && <HamburgerMenu activeView={view} onSelect={setView} />}

      <header className="topbar">
        <div className="topbar-title">
          <p className="eyebrow">La Noria</p>
          <h1>{VIEW_TITLES[view]}</h1>
        </div>

        {isAuthenticated && (
          <button className="secondary" onClick={signOut}>
            Cerrar sesión
          </button>
        )}
      </header>

      {configurationProblems.length > 0 && (
        <section className="card warning">
          <h2>Configuración requerida</h2>
          <p>
            Copia <code>.env.example</code> a <code>.env.local</code> y corrige:
          </p>
          <ul>
            {configurationProblems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </section>
      )}

      {!isAuthenticated && (
        <section className="hero card">
          <div>
            <p className="eyebrow">Un solo inicio de sesión</p>
            <h2>Usa la misma app en tu teléfono, tableta y computadora.</h2>
            <p className="muted">Los datos se escriben directamente en la hoja de Google configurada.</p>
          </div>
          <button onClick={() => login()} disabled={configurationProblems.length > 0}>
            Iniciar sesión con Google
          </button>
        </section>
      )}

      {isAuthenticated && (
        <>
          <section className="account-strip">
            Sesión iniciada como <strong>{userEmail}</strong>
            <span>
              Hoja: <code>{appConfig.sheets.sheetName}</code>
            </span>
          </section>

          {view === "ventas" && (
            <div className="grid">
              <EntryForm onSaved={refreshRows} accessToken={accessToken} editingRow={editingRow} onCancelEdit={() => setEditingRow(null)} />
              <RecentRows
                rows={rows}
                rutas={rutas}
                presentaciones={presentaciones}
                tamanos={tamanos}
                productos={productos}
                loading={loadingRows}
                error={rowError}
                accessToken={accessToken}
                onRefresh={refreshRows}
                onEdit={handleEdit}
                editingRow={editingRow}
              />
            </div>
          )}
          {view === "rutas" && (
            <RutasView
              accessToken={accessToken}
              rutas={rutas}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingRuta={editingRuta}
              onEdit={handleEditRuta}
              onCancelEdit={() => setEditingRuta(null)}
            />
          )}
          {view === "clientes" && (
            <ClientesView
              accessToken={accessToken}
              clientes={clientes}
              rutas={rutas}
              vendedores={vendedores}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingCliente={editingCliente}
              onEdit={handleEditCliente}
              onCancelEdit={() => setEditingCliente(null)}
            />
          )}
          {view === "vendedores" && (
            <VendedoresView
              accessToken={accessToken}
              vendedores={vendedores}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingVendedor={editingVendedor}
              onEdit={handleEditVendedor}
              onCancelEdit={() => setEditingVendedor(null)}
            />
          )}
          {view === "categorias" && (
            <CategoriasView
              accessToken={accessToken}
              categorias={categorias}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingCategoria={editingCategoria}
              onEdit={handleEditCategoria}
              onCancelEdit={() => setEditingCategoria(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
