import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Drawer } from "@/shared/ui";
import type { DrawerProps } from "@/shared/ui";

const defaultDrawer = (props: Partial<DrawerProps> = {}) => (
  <Drawer
    open
    resolveFocusTargetOnClose={() => null}
    title="Navegación principal"
    onCloseRequest={() => undefined}
    {...props}
  >
    <nav aria-label="Destinos">
      <a href="/">Inicio</a>
    </nav>
  </Drawer>
);

const getMask = (): HTMLElement => {
  const mask = document.querySelector<HTMLElement>(".ui-drawer__mask");

  if (!mask) {
    throw new Error("Drawer backdrop was not rendered.");
  }

  return mask;
};

describe("Drawer", () => {
  it("keeps visibility controlled, names the modal, and requests close from its button", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();
    const { rerender } = render(defaultDrawer({ open: false, onCloseRequest }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(defaultDrawer({ open: true, onCloseRequest }));
    const drawer = await screen.findByRole("dialog", { name: "Navegación principal" });
    expect(drawer).toHaveAttribute("aria-modal", "true");

    await user.click(screen.getByRole("button", { name: "Cerrar panel" }));

    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
    expect(screen.getByRole("dialog", { name: "Navegación principal" })).toBeInTheDocument();

    rerender(defaultDrawer({ open: false, onCloseRequest }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requests close with Escape without changing controlled visibility", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();
    render(defaultDrawer({ onCloseRequest }));

    const drawer = await screen.findByRole("dialog", { name: "Navegación principal" });
    await user.keyboard("{Escape}");

    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
    expect(drawer).toBeInTheDocument();
  });

  it("requests close when the user activates the backdrop", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();
    render(defaultDrawer({ onCloseRequest }));

    await screen.findByRole("dialog", { name: "Navegación principal" });
    await user.click(getMask());

    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
    expect(screen.getByRole("dialog", { name: "Navegación principal" })).toBeInTheDocument();
  });

  it("moves initial focus inside and contains Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    render(
      <>
        <main>
          <button>Outside action</button>
        </main>
        <Drawer
          open
          resolveFocusTargetOnClose={() => null}
          title="Focus navigation"
          onCloseRequest={() => undefined}
        >
          <button>First destination</button>
          <button>Last destination</button>
        </Drawer>
      </>,
    );

    const drawer = await screen.findByRole("dialog", { name: "Focus navigation" });
    const closeButton = screen.getByRole("button", { name: "Cerrar panel" });
    const lastDestination = screen.getByRole("button", { name: "Last destination" });
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true));

    lastDestination.focus();
    await user.tab();
    expect(closeButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(lastDestination).toHaveFocus();
  });

  it("makes outside page content inert and hidden from assistive technology", async () => {
    const { container } = render(
      <>
        <main>
          <button>Outside action</button>
        </main>
        {defaultDrawer()}
      </>,
    );

    await screen.findByRole("dialog", { name: "Navegación principal" });

    expect(container).toHaveAttribute("inert");
    expect(container).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Outside action" })).not.toBeInTheDocument();
  });

  it("resolves the latest focus target after outside content and scroll are restored", async () => {
    const user = userEvent.setup();
    const focusChecks: Array<{ inert: boolean; ariaHidden: boolean; scrollLocked: boolean }> = [];
    let closeRequests = 0;

    const DrawerHarness = () => {
      const [open, setOpen] = useState(true);
      const [destinationName, setDestinationName] = useState("Initial destination");
      const pageHeadingRef = useRef<HTMLHeadingElement>(null);
      const pageContentRef = useRef<HTMLDivElement>(null);

      const resolveFocusTargetOnClose = () => {
        const inertAncestor = pageContentRef.current?.closest<HTMLElement>("[inert]");
        focusChecks.push({
          inert: Boolean(inertAncestor),
          ariaHidden: inertAncestor?.getAttribute("aria-hidden") === "true",
          scrollLocked: document.body.classList.contains("p-overflow-hidden"),
        });
        return pageHeadingRef.current;
      };

      return (
        <div ref={pageContentRef}>
          <h1 key={destinationName} ref={pageHeadingRef} tabIndex={-1}>
            {destinationName}
          </h1>
          <Drawer
            open={open}
            resolveFocusTargetOnClose={resolveFocusTargetOnClose}
            title="Navegación principal"
            onCloseRequest={() => {
              closeRequests += 1;
              setDestinationName("Destino actualizado");
              setOpen(false);
            }}
          >
            <a href="/">Inicio</a>
          </Drawer>
        </div>
      );
    };

    const { container } = render(<DrawerHarness />);
    const closeButton = await screen.findByRole("button", { name: "Cerrar panel" });
    expect(container).toHaveAttribute("inert");
    await waitFor(() => expect(document.body).toHaveClass("p-overflow-hidden"));
    expect(document.body).toHaveClass("p-overflow-hidden");

    await user.click(closeButton);

    const updatedHeading = await screen.findByRole("heading", { name: "Destino actualizado" });
    await waitFor(() => expect(updatedHeading).toHaveFocus());
    expect(closeRequests).toBe(1);
    expect(focusChecks).toEqual([{ inert: false, ariaHidden: false, scrollLocked: false }]);
    expect(container).not.toHaveAttribute("inert");
    expect(container).not.toHaveAttribute("aria-hidden");
  });

  it("cleans up modality on unmount without resolving focus to a removed destination", async () => {
    const resolveFocusTargetOnClose = vi.fn(() => document.body);
    const { container, unmount } = render(
      <Drawer
        open
        resolveFocusTargetOnClose={resolveFocusTargetOnClose}
        title="Navegación principal"
        onCloseRequest={() => undefined}
      >
        <a href="/">Inicio</a>
      </Drawer>,
    );

    await screen.findByRole("dialog", { name: "Navegación principal" });
    expect(container).toHaveAttribute("inert");
    await waitFor(() => expect(document.body).toHaveClass("p-overflow-hidden"));
    expect(document.body).toHaveClass("p-overflow-hidden");

    unmount();

    expect(container).not.toHaveAttribute("inert");
    expect(container).not.toHaveAttribute("aria-hidden");
    expect(document.body).not.toHaveClass("p-overflow-hidden");
    expect(resolveFocusTargetOnClose).not.toHaveBeenCalled();
  });
});
