import { useCallback, useEffect, useState } from "react";
import {
  AuthenticatedTemplate,
  UnauthenticatedTemplate,
  useMsal
} from "@azure/msal-react";
import { loginRequest } from "./auth";
import { appConfig, getConfigurationProblems } from "./config";
import { EntryForm } from "./components/EntryForm";
import { RecentRows } from "./components/RecentRows";
import { getRecentRows } from "./lib/graph";

export default function App() {
  const { instance, accounts } = useMsal();
  const [rows, setRows] = useState<unknown[][]>([]);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowError, setRowError] = useState("");
  const configurationProblems = getConfigurationProblems();

  const refreshRows = useCallback(async () => {
    const account = accounts[0];
    if (!account || configurationProblems.length > 0) return;

    setLoadingRows(true);
    setRowError("");
    try {
      setRows(await getRecentRows(instance, account));
    } catch (error) {
      setRowError(error instanceof Error ? error.message : "Could not load workbook rows.");
    } finally {
      setLoadingRows(false);
    }
  }, [accounts, configurationProblems.length, instance]);

  useEffect(() => {
    void refreshRows();
  }, [refreshRows]);

  async function signIn() {
    await instance.loginPopup(loginRequest);
  }

  async function signOut() {
    await instance.logoutPopup({ account: accounts[0] });
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Microsoft 365 PWA</p>
          <h1>Office Excel App</h1>
        </div>

        <AuthenticatedTemplate>
          <button className="secondary" onClick={signOut}>Sign out</button>
        </AuthenticatedTemplate>
      </header>

      {configurationProblems.length > 0 && (
        <section className="card warning">
          <h2>Configuration required</h2>
          <p>Copy <code>.env.example</code> to <code>.env.local</code> and fix:</p>
          <ul>
            {configurationProblems.map((problem) => <li key={problem}>{problem}</li>)}
          </ul>
        </section>
      )}

      <UnauthenticatedTemplate>
        <section className="hero card">
          <div>
            <p className="eyebrow">One sign-in</p>
            <h2>Use the same app on your phone, tablet, and computer.</h2>
            <p className="muted">
              Data is written directly to the configured Excel table through Microsoft Graph.
            </p>
          </div>
          <button onClick={signIn} disabled={configurationProblems.length > 0}>
            Sign in with Microsoft
          </button>
        </section>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <section className="account-strip">
          Signed in as <strong>{accounts[0]?.username}</strong>
          <span>Table: <code>{appConfig.excel.tableName}</code></span>
        </section>

        <div className="grid">
          <EntryForm onSaved={refreshRows} />
          <RecentRows rows={rows} loading={loadingRows} error={rowError} />
        </div>
      </AuthenticatedTemplate>
    </main>
  );
}
