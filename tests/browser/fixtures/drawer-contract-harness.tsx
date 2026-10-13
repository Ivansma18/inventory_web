import { createRoot } from "react-dom/client";
import { useRef, useState } from "react";

import { Drawer } from "@/shared/ui";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Drawer contract harness root is missing.");
}

type FocusDestination = "opener" | "link" | "heading";

const DrawerContractHarness = () => {
  const [open, setOpen] = useState(false);
  const [closeRequestCount, setCloseRequestCount] = useState(0);
  const [outsideActionCount, setOutsideActionCount] = useState(0);
  const [heading, setHeading] = useState("Inicio");
  const focusDestination = useRef<FocusDestination>("opener");
  const openerRef = useRef<HTMLButtonElement>(null);
  const destinationLinkRef = useRef<HTMLAnchorElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const resolveFocusTargetOnClose = () => {
    switch (focusDestination.current) {
      case "link":
        return destinationLinkRef.current;
      case "heading":
        return headingRef.current;
      default:
        return openerRef.current;
    }
  };

  const closeTo = (destination: FocusDestination) => {
    focusDestination.current = destination;
    setOpen(false);
  };

  const requestClose = () => {
    setCloseRequestCount((count) => count + 1);
    closeTo("opener");
  };

  return (
    <>
      <main>
        <button onClick={() => setOpen(true)} ref={openerRef} type="button">
          Abrir navegación
        </button>
        <a href="#active-destination" ref={destinationLinkRef}>
          Destino activo
        </a>
        <h1 ref={headingRef} tabIndex={-1}>
          {heading}
        </h1>
        <button
          data-testid="outside-action"
          onClick={() => setOutsideActionCount((count) => count + 1)}
          type="button"
        >
          Acción exterior
        </button>
        <output data-testid="outside-action-count">{outsideActionCount}</output>
        <output data-testid="close-request-count">{closeRequestCount}</output>
      </main>

      <Drawer
        open={open}
        resolveFocusTargetOnClose={resolveFocusTargetOnClose}
        title="Navegación principal"
        onCloseRequest={requestClose}
      >
        <nav aria-label="Destinos del panel">
          <a
            href="#active-destination"
            onClick={(event) => {
              event.preventDefault();
              closeTo("link");
            }}
          >
            Seleccionar destino
          </a>
          <button
            onClick={() => {
              setHeading("Destino actualizado");
              closeTo("heading");
            }}
            type="button"
          >
            Mostrar encabezado de destino
          </button>
          <button onClick={() => undefined} type="button">
            Último control del panel
          </button>
        </nav>
      </Drawer>
    </>
  );
};

createRoot(root).render(<DrawerContractHarness />);
