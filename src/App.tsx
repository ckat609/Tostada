import { useCallback, useEffect, useState } from "react";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { appConfig, getConfigurationProblems } from "./config";
import { EntryForm } from "./components/EntryForm";
import { RecentRows } from "./components/RecentRows";
import { getRecentRows, getRutas, getPresentaciones, getTamanos, type RecentRow, type Ruta, type Presentacion, type Tamano } from "./lib/graph";
import { GOOGLE_SCOPES } from "./auth";

export default function App() {
  const [accessToken, setAccessToken] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [rows, setRows] = useState<RecentRow[]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowError, setRowError] = useState("");
  const [rutas, setRutas] = useState<Ruta[]>([]);
  const [presentaciones, setPresentaciones] = useState<Presentacion[]>([]);
  const [tamanos, setTamanos] = useState<Tamano[]>([]);
  const [editingRow, setEditingRow] = useState<RecentRow | null>(null);
  const configurationProblems = getConfigurationProblems();

  const handleEdit = (row: RecentRow) => {
    setEditingRow(row);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshRows = useCallback(async () => {
    if (!accessToken || configurationProblems.length > 0) return;

    setLoadingRows(true);
    setRowError("");
    try {
      const [rowsData, rutasData, presentacionesData, tamanosData] = await Promise.all([
        getRecentRows(accessToken),
        getRutas(accessToken),
        getPresentaciones(accessToken),
        getTamanos(accessToken)
      ]);
      setRows(rowsData);
      setRutas(rutasData);
      setPresentaciones(presentacionesData);
      setTamanos(tamanosData);
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
      <header className="topbar">
        <div>
          <p className="eyebrow">La Nona</p>
          <h1>Registro de Ventas</h1>
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

          <div className="grid">
            <EntryForm onSaved={refreshRows} accessToken={accessToken} editingRow={editingRow} onCancelEdit={() => setEditingRow(null)} />
            <RecentRows
              rows={rows}
              rutas={rutas}
              presentaciones={presentaciones}
              tamanos={tamanos}
              loading={loadingRows}
              error={rowError}
              accessToken={accessToken}
              onRefresh={refreshRows}
              onEdit={handleEdit}
              editingRow={editingRow}
            />
          </div>
        </>
      )}
    </main>
  );
}
