import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { categoryMswWorker } from "./category-msw-api";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Category MSW harness mount element "#root" was not found.');
}

await categoryMswWorker.start({
  serviceWorker: { url: "/mockServiceWorker.js" },
  onUnhandledRequest: "error",
  quiet: true,
});

const requestedRoute = new URL(window.location.href).searchParams.get("route");
const initialRoute = requestedRoute?.startsWith("/categories") ? requestedRoute : "/categories/new";
window.history.replaceState(null, "", initialRoute);
document.title = "Inventory";

const { AppProviders } = await import("@/app/providers/app-providers");

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
