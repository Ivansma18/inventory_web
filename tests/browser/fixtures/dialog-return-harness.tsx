import { useState } from "react";
import { createRoot } from "react-dom/client";

import { Dialog } from "@/shared/ui";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Dialog focus return harness root is missing.");
}

const searchParams = new URLSearchParams(window.location.search);
const hasHeader = !searchParams.has("no-header");
const hasMain = !searchParams.has("no-main");
const hasPageAction = !searchParams.has("no-interactive");
const hasLongContent = searchParams.has("long");

const DialogFocusReturnHarness = () => {
  const [open, setOpen] = useState(false);
  const [openerAvailable, setOpenerAvailable] = useState(true);

  const getFallbackFocusTarget = () => {
    const target = document.getElementById("dialog-focus-fallback");
    if (!(target instanceof HTMLElement)) {
      throw new Error("The page must keep a focusable Dialog fallback target available.");
    }
    return target;
  };

  return (
    <>
      {hasHeader ? (
        <header data-testid="page-header">
          <h1>Inventory page</h1>
        </header>
      ) : null}
      {hasMain ? (
        <main data-testid="page-main" style={hasLongContent ? { minHeight: "180vh" } : undefined}>
          {hasPageAction ? <button data-testid="page-action">Page action</button> : null}
        </main>
      ) : hasPageAction ? (
        <section>
          <button data-testid="page-action">Page action</button>
        </section>
      ) : null}
      {openerAvailable ? (
        <button data-testid="dialog-opener" onClick={() => setOpen(true)}>
          Open dialog
        </button>
      ) : null}
      <button
        data-dialog-focus-fallback
        data-testid="dialog-focus-fallback"
        id="dialog-focus-fallback"
        tabIndex={0}
      >
        Alternate focus target
      </button>
      <Dialog
        fallbackFocusTarget={getFallbackFocusTarget}
        open={open}
        showCloseButton={false}
        title="Focus return dialog"
        onCloseRequest={() => setOpen(false)}
      >
        <button onClick={() => setOpenerAvailable(false)}>Remove opener</button>
        {hasLongContent ? (
          <>
            <p data-testid="dialog-start">Beginning of long dialog content.</p>
            {Array.from({ length: 28 }, (_, index) => (
              <p key={index}>
                Paragraph {index + 1} keeps this dialog content taller than the window.
              </p>
            ))}
            <p data-testid="dialog-end">End of long dialog content.</p>
          </>
        ) : null}
      </Dialog>
    </>
  );
};

createRoot(root).render(<DialogFocusReturnHarness />);
