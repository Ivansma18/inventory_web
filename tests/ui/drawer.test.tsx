import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Drawer } from "@/shared/ui";
import type { DrawerProps } from "@/shared/ui";

const defaultDrawer = (props: Partial<DrawerProps> = {}) => (
  <Drawer open title="Navegación principal" onCloseRequest={() => undefined} {...props}>
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
        <Drawer open title="Focus navigation" onCloseRequest={() => undefined}>
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
});
