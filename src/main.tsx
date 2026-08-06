import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { registerSW } from "virtual:pwa-register";
import { msalInstance } from "./auth";
import App from "./App";
import "./styles.css";

registerSW({ immediate: true });

async function bootstrap() {
  await msalInstance.initialize();
  await msalInstance.handleRedirectPromise();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>
  );
}

void bootstrap();
