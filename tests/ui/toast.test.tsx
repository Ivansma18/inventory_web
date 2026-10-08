import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
      <button onClick={() => dismiss(ids.current.success ?? "missing-id")} type="button">
        Dismiss success by id
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

  it.each(toastExamples)(
    "announces $kind once without moving keyboard focus",
    async ({ kind, message, summary }) => {
      const user = userEvent.setup();

      render(
        <UiProvider>
          <ToastControls />
        </UiProvider>,
      );

      const trigger = screen.getByRole("button", { name: `Show ${kind}` });
      trigger.focus();
      expect(trigger).toHaveFocus();

      await user.keyboard("{Enter}");

      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(summary);
      expect(alert).toHaveTextContent(message);
      expect(screen.getAllByRole("alert")).toHaveLength(1);
      expect(document.querySelectorAll('[aria-live]:not([aria-live="off"])')).toHaveLength(1);
      expect(trigger).toHaveFocus();
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

  it.each(["success", "info"] as const)("automatically closes %s after five seconds", (kind) => {
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
      vi.advanceTimersByTime(4_999);
    });
    expect(screen.getByText(example.message)).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText(example.message)).not.toBeInTheDocument();
  });

  it("pauses the remaining time while the pointer is over a success Toast", () => {
    vi.useFakeTimers();
    const example = toastExamples.find((toast) => toast.kind === "success");

    if (!example) {
      throw new Error("Missing success Toast fixture.");
    }

    render(
      <UiProvider>
        <ToastControls />
      </UiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    act(() => {
      vi.advanceTimersByTime(2_000);
    });

    const toast = screen.getByRole("alert");
    fireEvent.pointerEnter(toast);
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText(example.message)).toBeVisible();

    fireEvent.pointerLeave(toast);
    act(() => {
      vi.advanceTimersByTime(2_999);
    });
    expect(screen.getByText(example.message)).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText(example.message)).not.toBeInTheDocument();
  });

  it("keeps the timer paused until both pointer and focus leave the Toast", () => {
    vi.useFakeTimers();
    const example = toastExamples.find((toast) => toast.kind === "success");

    if (!example) {
      throw new Error("Missing success Toast fixture.");
    }

    render(
      <UiProvider>
        <ToastControls />
      </UiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    const toast = screen.getByRole("alert");
    const closeButton = within(toast).getByRole("button", { name: "Cerrar notificación" });
    fireEvent.pointerEnter(toast);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    fireEvent.focus(closeButton);

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText(example.message)).toBeVisible();

    fireEvent.pointerLeave(toast);
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText(example.message)).toBeVisible();

    fireEvent.blur(closeButton);
    act(() => {
      vi.advanceTimersByTime(3_999);
    });
    expect(screen.getByText(example.message)).toBeVisible();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText(example.message)).not.toBeInTheDocument();
  });

  it("clears an automatic timer when its Toast is dismissed manually", () => {
    vi.useFakeTimers();

    render(
      <UiProvider>
        <ToastControls />
      </UiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(vi.getTimerCount()).toBe(1);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss success by id" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears automatic timers when the provider unmounts", () => {
    vi.useFakeTimers();

    const { unmount } = render(
      <UiProvider>
        <ToastControls />
      </UiProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show success" }));
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
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
