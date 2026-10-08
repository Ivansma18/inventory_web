import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiProvider, useToast } from "@/shared/ui";
import type { ToastKind, ToastOptions } from "@/shared/ui";

const toastExamples: Array<{ kind: ToastKind; message: string; summary: string }> = [
  { kind: "success", message: "Cambios guardados.", summary: "Éxito" },
  { kind: "info", message: "Hay una actualización disponible.", summary: "Información" },
  { kind: "warning", message: "Existencias próximas al mínimo.", summary: "Advertencia" },
  { kind: "error", message: "No se pudo guardar el producto.", summary: "Error" },
];

// @ts-expect-error Toast kinds use the app's vocabulary rather than PrimeReact severity values.
const vendorToastKind: ToastOptions = { kind: "warn", message: "Aviso" };

// @ts-expect-error Toast options do not expose PrimeReact message props.
const vendorToastProps: ToastOptions = { kind: "warning", message: "Aviso", life: 1000 };

void vendorToastKind;
void vendorToastProps;

const ToastControls = () => {
  const { dismiss, show } = useToast();
  const ids = useRef<Partial<Record<ToastKind, string>>>({});

  return (
    <div>
      {toastExamples.map(({ kind, message }) => (
        <button
          key={kind}
          onClick={() => {
            ids.current[kind] = show({ kind, message });
          }}
          type="button"
        >
          Show {kind}
        </button>
      ))}
      <button onClick={() => dismiss(ids.current.warning ?? "missing-id")} type="button">
        Dismiss warning by id
      </button>
      <button onClick={() => dismiss(ids.current.error ?? "missing-id")} type="button">
        Dismiss error by id
      </button>
    </div>
  );
};

afterEach(() => {
  vi.useRealTimers();
});

describe("Toast", () => {
  it.each(toastExamples)(
    "shows the $kind type with its text message",
    async ({ kind, message, summary }) => {
      const user = userEvent.setup();

      render(
        <UiProvider>
          <ToastControls />
        </UiProvider>,
      );

      await user.click(screen.getByRole("button", { name: `Show ${kind}` }));

      expect(screen.getByText(summary)).toBeVisible();
      expect(screen.getByText(message)).toBeVisible();
    },
  );

  it.each(["warning", "error"] as const)("keeps %s visible until it is dismissed", (kind) => {
    vi.useFakeTimers();
    const example = toastExamples.find((toast) => toast.kind === kind);

    if (!example) {
      throw new Error(`Missing toast fixture for ${kind}.`);
    }

    render(
      <UiProvider>
        <ToastControls />
      </UiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: `Show ${kind}` }));
    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText(example.message)).toBeVisible();
  });

  it("closes one message manually without removing the others and supports dismissal by id", async () => {
    const user = userEvent.setup();

    render(
      <UiProvider>
        <ToastControls />
      </UiProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Show warning" }));
    await user.click(screen.getByRole("button", { name: "Show error" }));

    expect(screen.getByText("Existencias próximas al mínimo.")).toBeVisible();
    expect(screen.getByText("No se pudo guardar el producto.")).toBeVisible();

    await user.click(screen.getAllByRole("button", { name: "Cerrar notificación" })[0]);

    await waitFor(() => {
      expect(screen.queryByText("Existencias próximas al mínimo.")).not.toBeInTheDocument();
    });
    expect(screen.getByText("No se pudo guardar el producto.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dismiss error by id" }));
    await waitFor(() => {
      expect(screen.queryByText("No se pudo guardar el producto.")).not.toBeInTheDocument();
    });
  });
});
