import { UiProvider } from "@/shared/ui";
import { createRoot } from "react-dom/client";

import { DesignSystemDemo } from "./design-system-demo";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('Design System demo mount element "#root" was not found.');
}

document.title = "Inventory — Design System";

createRoot(rootElement).render(
  <UiProvider>
    <DesignSystemDemo />
  </UiProvider>,
);
