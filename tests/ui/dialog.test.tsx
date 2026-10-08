import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "@/shared/ui";
import type { DialogProps } from "@/shared/ui";

const defaultDialog = (props: Partial<DialogProps> = {}) => (
  <Dialog open title="Confirmar acción" onCloseRequest={() => undefined} {...props}>
    <p>¿Deseas continuar?</p>
  </Dialog>
);

const getMask = (): HTMLElement => {
  const mask = document.querySelector<HTMLElement>(".ui-dialog__mask");

  if (!mask) {
    throw new Error("Dialog mask was not rendered.");
  }

  return mask;
};

describe("Dialog", () => {
  it("keeps visibility controlled and requests close through its header button", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();
    const { rerender } = render(defaultDialog({ open: false, onCloseRequest }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(defaultDialog({ open: true, onCloseRequest }));
    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveAttribute("aria-modal", "true");
    await user.click(screen.getByRole("button", { name: "Cerrar diálogo" }));

    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    rerender(defaultDialog({ open: false, onCloseRequest }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("requests close with Escape by default", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();

    render(defaultDialog({ onCloseRequest }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
  });

  it("requests close from a backdrop click by default", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();
    render(defaultDialog({ onCloseRequest }));

    await screen.findByRole("dialog");
    await user.click(getMask());

    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
  });

  it("can hide the header close button without disabling Escape", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();

    render(defaultDialog({ showCloseButton: false, onCloseRequest }));
    await screen.findByRole("dialog");

    expect(screen.queryByRole("button", { name: "Cerrar diálogo" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
  });

  it("can disable Escape without disabling the close button", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();

    render(defaultDialog({ closeOnEscape: false, onCloseRequest }));
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");
    expect(onCloseRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cerrar diálogo" }));
    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
  });

  it("can disable backdrop dismissal without disabling the close button", async () => {
    const user = userEvent.setup();
    const onCloseRequest = vi.fn();
    render(defaultDialog({ closeOnBackdrop: false, onCloseRequest }));

    await screen.findByRole("dialog");
    await user.click(getMask());
    expect(onCloseRequest).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Cerrar diálogo" }));
    expect(onCloseRequest).toHaveBeenCalledExactlyOnceWith();
  });

  it("makes outside content inert and restores its previous accessibility state on close", async () => {
    const user = userEvent.setup();
    const onOutsideAction = vi.fn();
    const outsideContent = (
      <main>
        <button onClick={onOutsideAction}>Outside action</button>
      </main>
    );
    const { container, rerender } = render(outsideContent);
    container.setAttribute("aria-hidden", "false");
    rerender(
      <>
        {outsideContent}
        {defaultDialog()}
      </>,
    );

    await screen.findByRole("dialog");

    expect(container).toHaveAttribute("inert");
    expect(container).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button", { name: "Outside action" })).not.toBeInTheDocument();

    rerender(
      <>
        {outsideContent}
        {defaultDialog({ open: false })}
      </>,
    );

    await waitFor(() => {
      expect(container).not.toHaveAttribute("inert");
      expect(container).toHaveAttribute("aria-hidden", "false");
    });
    expect(screen.getByRole("button", { name: "Outside action" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Outside action" }));
    expect(onOutsideAction).toHaveBeenCalledTimes(1);
  });

  it("names the dialog and initially focuses its first available control", async () => {
    render(
      <Dialog open showCloseButton={false} title="Focus title" onCloseRequest={() => undefined}>
        <button>First control</button>
        <button>Second control</button>
      </Dialog>,
    );

    const dialog = await screen.findByRole("dialog", { name: "Focus title" });
    expect(dialog).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "First control" })).toHaveFocus(),
    );
  });

  it("moves initial focus to its title when it has no focusable controls", async () => {
    render(
      <Dialog
        open
        showCloseButton={false}
        title="Read-only notice"
        onCloseRequest={() => undefined}
      >
        <p>This dialog contains no controls.</p>
      </Dialog>,
    );

    const title = await screen.findByRole("heading", { name: "Read-only notice" });
    expect(screen.getByRole("dialog", { name: "Read-only notice" })).toBeInTheDocument();
    await waitFor(() => expect(title).toHaveFocus());
  });

  it("contains Tab and Shift+Tab navigation within the dialog", async () => {
    const user = userEvent.setup();

    render(
      <Dialog open showCloseButton={false} title="Focus loop" onCloseRequest={() => undefined}>
        <button>First control</button>
        <button>Last control</button>
      </Dialog>,
    );

    const first = await screen.findByRole("button", { name: "First control" });
    const last = screen.getByRole("button", { name: "Last control" });
    await waitFor(() => expect(first).toHaveFocus());

    await user.tab();
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
  });
});
