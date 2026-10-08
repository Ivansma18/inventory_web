import { createRoot } from "react-dom/client";

import { Dialog } from "@/shared/ui";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Dialog focus harness root is missing.");
}

const hasNoControls = new URLSearchParams(window.location.search).has("empty");

createRoot(root).render(
  <>
    <main>
      <button>Outside action</button>
    </main>
    <Dialog open showCloseButton={false} title="Focus dialog" onCloseRequest={() => undefined}>
      {hasNoControls ? (
        <p>Read-only content.</p>
      ) : (
        <>
          <button>First control</button>
          <button>Last control</button>
        </>
      )}
    </Dialog>
  </>,
);
