import { createRoot } from "react-dom/client";

import { Drawer } from "@/shared/ui";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Drawer layout harness root is missing.");
}

const longContent = Array.from({ length: 28 }, (_, index) => (
  <p key={index}>
    Destino de navegación {index + 1}: consulta el contenido disponible dentro del panel lateral.
  </p>
));

createRoot(root).render(
  <>
    <main>
      <button>Acción exterior</button>
    </main>
    <h1 data-drawer-focus-fallback tabIndex={-1}>
      Página actual
    </h1>
    <Drawer
      open
      resolveFocusTargetOnClose={() =>
        document.querySelector<HTMLElement>("[data-drawer-focus-fallback]")
      }
      title="Drawer de navegación"
      onCloseRequest={() => undefined}
    >
      {longContent}
      <p data-testid="drawer-end">Fin de los destinos.</p>
    </Drawer>
  </>,
);
