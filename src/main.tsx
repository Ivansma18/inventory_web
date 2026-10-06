import { env } from "@/shared/config/env";
import { AppProviders } from "@/app/providers/app-providers";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Application mount element "#root" was not found.');
}

document.title = env.VITE_APP_NAME;

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
