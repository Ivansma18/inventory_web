import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { productMswWorker } from "./product-msw-api";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Product MSW harness mount element "#root" was not found.');
}

await productMswWorker.start({
  serviceWorker: { url: "/mockServiceWorker.js" },
  onUnhandledRequest: "error",
  quiet: true,
});

window.history.replaceState(null, "", "/products/new");
document.title = "Inventory";

const { AppProviders } = await import("@/app/providers/app-providers");

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
