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
});
