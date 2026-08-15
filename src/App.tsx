import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { appConfig, getConfigurationProblems } from "./config";
import { EntryForm } from "./components/EntryForm";
import { RecentRows } from "./components/RecentRows";
import { HamburgerMenu, VIEW_TITLES, type ViewKey } from "./components/HamburgerMenu";
import { RutasView } from "./components/RutasView";
import { ClientesView } from "./components/ClientesView";
import { VendedoresView } from "./components/VendedoresView";
import { CategoriasView } from "./components/CategoriasView";
import { PresentacionesView } from "./components/PresentacionesView";
import { SaboresView } from "./components/SaboresView";
import { ProductosView } from "./components/ProductosView";
import { PagosView } from "./components/PagosView";
import { getRecentRows, getRutas, getPresentaciones, getProductos, getClientes, getVendedores, getCategorias, getSabores, getPagos, type RecentRow, type Ruta, type Presentacion, type Producto, type Cliente, type Vendedor, type Categoria, type Sabor, type Pago } from "./lib/graph";
import { GOOGLE_SCOPES, loadAuth, saveAuth, clearAuth } from "./auth";

export default function App() {
  const [view, setView] = useState<ViewKey>("ventas");
  const [accessToken, setAccessToken] = useState<string>(() => loadAuth()?.accessToken ?? "");
  const [userEmail, setUserEmail] = useState<string>(() => loadAuth()?.userEmail ?? "");
  const [rows, setRows] = useState<RecentRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowError, setRowError] = useState("");
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sabores, setSabores] = useState<Sabor[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [editingRow, setEditingRow] = useState<RecentRow | null>(null);
  const [recentlyEditedRowIndex, setRecentlyEditedRowIndex] = useState<number | null>(null);
  const [recentlyEditedPreviousKey, setRecentlyEditedPreviousKey] = useState<string | null>(null);
  const [editingRuta, setEditingRuta] = useState<Ruta | null>(null);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  const [editingVendedor, setEditingVendedor] = useState<Vendedor | null>(null);
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null);
  const [editingPresentacion, setEditingPresentacion] = useState<Presentacion | null>(null);
  const [editingSabor, setEditingSabor] = useState<Sabor | null>(null);
  const [editingProducto, setEditingProducto] = useState<Producto | null>(null);
  const [editingPago, setEditingPago] = useState<Pago | null>(null);
  const configurationProblems = getConfigurationProblems();

  const handleEdit = (row: RecentRow) => {
    setEditingRow(row);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const recentlyEditedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEditSaved = (rowIndex: number, previousCliente: string, previousCodigo: string) => {
    if (recentlyEditedTimeoutRef.current) {
      clearTimeout(recentlyEditedTimeoutRef.current);
    }
    setRecentlyEditedRowIndex(rowIndex);
    setRecentlyEditedPreviousKey(`${previousCliente}||${previousCodigo}`);
    recentlyEditedTimeoutRef.current = setTimeout(() => {
      setRecentlyEditedRowIndex(null);
      setRecentlyEditedPreviousKey(null);
    }, 30000);
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

  const handleEditPresentacion = (presentacion: Presentacion) => {
    setEditingPresentacion(presentacion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditSabor = (sabor: Sabor) => {
    setEditingSabor(sabor);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditProducto = (producto: Producto) => {
    setEditingProducto(producto);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditPago = (pago: Pago) => {
    setEditingPago(pago);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshRows = useCallback(async () => {
    if (!accessToken || configurationProblems.length > 0) return;

    setLoadingRows(true);
    setRowError("");
    try {
      const results = await Promise.allSettled([
        getRecentRows(accessToken),
        getRutas(accessToken),
        getPresentaciones(accessToken),
        getProductos(accessToken),
        getClientes(accessToken),
        getVendedores(accessToken),
        getCategorias(accessToken),
        getSabores(accessToken),
        getPagos(accessToken)
      ]);

      // Extract successful results or use empty arrays for failed ones
      const [rowsResult, rutasResult, presentacionesResult, productosResult, clientesResult, vendedoresResult, categoriasResult, saboresResult, pagosResult] = results;

      setRows(rowsResult.status === "fulfilled" ? rowsResult.value : []);
      setRutas(rutasResult.status === "fulfilled" ? rutasResult.value : []);
      setPresentaciones(presentacionesResult.status === "fulfilled" ? presentacionesResult.value : []);
      setProductos(productosResult.status === "fulfilled" ? productosResult.value : []);
      setClientes(clientesResult.status === "fulfilled" ? clientesResult.value : []);
      setVendedores(vendedoresResult.status === "fulfilled" ? vendedoresResult.value : []);
      setCategorias(categoriasResult.status === "fulfilled" ? categoriasResult.value : []);
      setSabores(saboresResult.status === "fulfilled" ? saboresResult.value : []);
      setPagos(pagosResult.status === "fulfilled" ? pagosResult.value : []);

      // Collect any errors from failed tabs
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === "rejected")
        .map((r) => r.reason instanceof Error ? r.reason.message : String(r.reason));

      if (errors.length > 0) {
        setRowError("Algunas pestañas no se pudieron cargar: " + errors.join(", "));
      }
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

      const expiresInSeconds = Number(tokenResponse.expires_in) || 3600;
      saveAuth({
        accessToken: tokenResponse.access_token,
        userEmail: userInfo.email,
        expiresAt: Date.now() + expiresInSeconds * 1000,
      });
    },
    scope: GOOGLE_SCOPES,
  });

  function signOut() {
    googleLogout();
    clearAuth();
    setAccessToken("");
    setUserEmail("");
    setRows([]);
  }

  const isAuthenticated = Boolean(accessToken);

  return (
    <main className="shell">
      {isAuthenticated && <HamburgerMenu activeView={view} onSelect={setView} />}

      {isAuthenticated && (
        <header className="topbar">
          <div className="topbar-title">
            <p className="eyebrow">La Noria</p>
            <h1>{VIEW_TITLES[view]}</h1>
          </div>
        </header>
      )}

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
        <section className="card" style={{
          maxWidth: "500px",
          margin: "4rem auto",
          textAlign: "center",
          padding: "3rem 2rem"
        }}>
          <h1 style={{
            color: "#2196F3",
            fontSize: "3rem",
            marginBottom: "2rem",
            fontWeight: "700"
          }}>
            La Noria
          </h1>
          <button onClick={() => login()} disabled={configurationProblems.length > 0}>
            Iniciar sesión con Google
          </button>
        </section>
      )}

      {isAuthenticated && (
        <>
          <section className="account-strip">
            <div>
              Sesión iniciada como <strong>{userEmail}</strong>
              <span>
                Hoja: <code>{appConfig.sheets.sheetName}</code>
              </span>
            </div>
            <button className="secondary" onClick={signOut}>
              Cerrar sesión
            </button>
          </section>

          {view === "ventas" && (
            <div className="grid">
              <EntryForm onSaved={refreshRows} accessToken={accessToken} editingRow={editingRow} onCancelEdit={() => setEditingRow(null)} onEditSaved={handleEditSaved} />
              <RecentRows
                rows={rows}
                rutas={rutas}
                presentaciones={presentaciones}
                sabores={sabores}
                productos={productos}
                categorias={categorias}
                pagos={pagos}
                clientes={clientes}
                loading={loadingRows}
                error={rowError}
                accessToken={accessToken}
                onRefresh={refreshRows}
                onEdit={handleEdit}
                editingRow={editingRow}
                recentlyEditedRowIndex={recentlyEditedRowIndex}
                recentlyEditedPreviousKey={recentlyEditedPreviousKey}
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
          {view === "presentaciones" && (
            <PresentacionesView
              accessToken={accessToken}
              presentaciones={presentaciones}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingPresentacion={editingPresentacion}
              onEdit={handleEditPresentacion}
              onCancelEdit={() => setEditingPresentacion(null)}
            />
          )}
          {view === "sabores" && (
            <SaboresView
              accessToken={accessToken}
              sabores={sabores}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingSabor={editingSabor}
              onEdit={handleEditSabor}
              onCancelEdit={() => setEditingSabor(null)}
            />
          )}
          {view === "productos" && (
            <ProductosView
              accessToken={accessToken}
              productos={productos}
              categorias={categorias}
              sabores={sabores}
              presentaciones={presentaciones}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingProducto={editingProducto}
              onEdit={handleEditProducto}
              onCancelEdit={() => setEditingProducto(null)}
            />
          )}
          {view === "pagos" && (
            <PagosView
              accessToken={accessToken}
              pagos={pagos}
              loading={loadingRows}
              error={rowError}
              onRefresh={refreshRows}
              editingPago={editingPago}
              onEdit={handleEditPago}
              onCancelEdit={() => setEditingPago(null)}
            />
          )}
        </>
      )}
    </main>
  );
}
