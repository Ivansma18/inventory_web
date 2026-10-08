import "./toast.css";

import { Toast as PrimeToast } from "primereact/toast";
import type { ToastMessage } from "primereact/toast";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import { toastContext } from "./toast-context";

export type ToastKind = "success" | "info" | "warning" | "error";

export interface ToastOptions {
  kind: ToastKind;
  message: string;
}

export interface ToastApi {
  show: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

interface ToastProviderProps {
  children: ReactNode;
}

const primeSeverityByKind: Record<ToastKind, NonNullable<ToastMessage["severity"]>> = {
  success: "success",
  info: "info",
  warning: "warn",
  error: "error",
};

const summaryByKind: Record<ToastKind, string> = {
  success: "Éxito",
  info: "Información",
  warning: "Advertencia",
  error: "Error",
};

const toastDurationMs = 5_000;

type ToastPauseReason = "focus" | "pointer";

interface ToastTimer {
  remainingMs: number;
  startedAt: number | null;
  timeoutId: ReturnType<typeof setTimeout> | null;
  pausedBy: Set<ToastPauseReason>;
}

const clearToastTimer = (timer: ToastTimer) => {
  if (timer.timeoutId !== null) {
    clearTimeout(timer.timeoutId);
  }
};

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const toastRef = useRef<PrimeToast>(null);
  const messagesById = useRef(new Map<string, ToastMessage>());
  const timersById = useRef(new Map<string, ToastTimer>());
  const nextId = useRef(0);

  const clearTimer = useCallback((id: string) => {
    const timer = timersById.current.get(id);
    if (!timer) {
      return;
    }

    clearToastTimer(timer);
    timersById.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      const toastMessage = messagesById.current.get(id);
      if (!toastMessage) {
        clearTimer(id);
        return;
      }

      clearTimer(id);
      messagesById.current.delete(id);
      toastRef.current?.remove(toastMessage);
    },
    [clearTimer],
  );

  const startTimer = useCallback(
    (id: string, timer: ToastTimer) => {
      if (timer.pausedBy.size > 0) {
        return;
      }

      timer.startedAt = performance.now();
      timer.timeoutId = setTimeout(() => dismiss(id), timer.remainingMs);
    },
    [dismiss],
  );

  const setTimerPaused = useCallback(
    (id: string, reason: ToastPauseReason, paused: boolean) => {
      const timer = timersById.current.get(id);
      if (!timer) {
        return;
      }

      if (paused) {
        if (timer.pausedBy.has(reason)) {
          return;
        }

        if (timer.pausedBy.size === 0) {
          clearToastTimer(timer);
          timer.timeoutId = null;

          if (timer.startedAt !== null) {
            timer.remainingMs = Math.max(
              0,
              timer.remainingMs - (performance.now() - timer.startedAt),
            );
            timer.startedAt = null;
          }
        }

        timer.pausedBy.add(reason);
        return;
      }

      if (!timer.pausedBy.delete(reason)) {
        return;
      }

      if (timer.pausedBy.size === 0) {
        startTimer(id, timer);
      }
    },
    [startTimer],
  );

  const show = useCallback(
    ({ kind, message }: ToastOptions) => {
      if (message.trim().length === 0) {
        throw new Error("Toast requires a non-empty message.");
      }

      const id = `ui-toast-${++nextId.current}`;
      const hasAutoDismiss = kind === "success" || kind === "info";
      const toastMessage: ToastMessage = {
        id,
        severity: primeSeverityByKind[kind],
        summary: summaryByKind[kind],
        detail: message,
        sticky: true,
        closable: true,
        ...(hasAutoDismiss && {
          pt: {
            root: {
              onPointerEnter: () => setTimerPaused(id, "pointer", true),
              onPointerLeave: () => setTimerPaused(id, "pointer", false),
              onFocusCapture: () => setTimerPaused(id, "focus", true),
              onBlurCapture: (event) => {
                if (
                  event.relatedTarget instanceof Node &&
                  event.currentTarget.contains(event.relatedTarget)
                ) {
                  return;
                }

                setTimerPaused(id, "focus", false);
              },
            },
          },
        }),
      };

      messagesById.current.set(id, toastMessage);

      if (hasAutoDismiss) {
        const timer: ToastTimer = {
          remainingMs: toastDurationMs,
          startedAt: null,
          timeoutId: null,
          pausedBy: new Set(),
        };
        timersById.current.set(id, timer);
        startTimer(id, timer);
      }

      toastRef.current?.show(toastMessage);

      return id;
    },
    [setTimerPaused, startTimer],
  );

  const handleRemove = useCallback(
    (toastMessage: ToastMessage) => {
      if (toastMessage.id) {
        messagesById.current.delete(toastMessage.id);
        clearTimer(toastMessage.id);
      }
    },
    [clearTimer],
  );

  useEffect(
    () => () => {
      timersById.current.forEach(clearToastTimer);
      timersById.current.clear();
      messagesById.current.clear();
    },
    [],
  );

  const value = useMemo(() => ({ show, dismiss }), [dismiss, show]);

  return (
    <toastContext.Provider value={value}>
      {children}
      <PrimeToast
        className="ui-toast"
        onRemove={handleRemove}
        position="top-right"
        pt={{
          closeButton: { "aria-label": "Cerrar notificación" },
          message: {
            role: "alert",
            "aria-live": "assertive",
            "aria-atomic": true,
          },
        }}
        ref={toastRef}
      />
    </toastContext.Provider>
  );
};
