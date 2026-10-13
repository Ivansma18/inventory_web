import { createRoot } from "react-dom/client";

import "@/shared/ui/styles.css";

import { AppHeader } from "@/app/components/app-header";
import { Button } from "@/shared/ui";

const root = document.getElementById("root");

if (!root) {
  throw new Error("App header harness root is missing.");
}

createRoot(root).render(
  <AppHeader
    identity="operadora-de-inventario-con-identificador-largo@example.com"
    actions={<Button>Acción de cuenta</Button>}
  />,
);
