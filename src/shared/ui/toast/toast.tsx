import "./toast.css";

import { Toast as PrimeToast } from "primereact/toast";
import type { ToastMessage } from "primereact/toast";
import { useCallback, useMemo, useRef } from "react";
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

export const ToastProvider = ({ children }: ToastProviderProps) => {
  const toastRef = useRef<PrimeToast>(null);
  const messagesById = useRef(new Map<string, ToastMessage>());
  const nextId = useRef(0);

  const show = useCallback(({ kind, message }: ToastOptions) => {
    if (message.trim().length === 0) {
      throw new Error("Toast requires a non-empty message.");
    }

    const id = `ui-toast-${++nextId.current}`;
    const toastMessage: ToastMessage = {
      id,
      severity: primeSeverityByKind[kind],
      summary: summaryByKind[kind],
      detail: message,
      sticky: true,
      closable: true,
    };

    messagesById.current.set(id, toastMessage);
    toastRef.current?.show(toastMessage);

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    const toastMessage = messagesById.current.get(id);
    if (!toastMessage) {
      return;
    }

    messagesById.current.delete(id);
    toastRef.current?.remove(toastMessage);
  }, []);

  const handleRemove = useCallback((toastMessage: ToastMessage) => {
    if (toastMessage.id) {
      messagesById.current.delete(toastMessage.id);
    }
  }, []);

  const value = useMemo(() => ({ show, dismiss }), [dismiss, show]);

  return (
    <toastContext.Provider value={value}>
      {children}
      <PrimeToast
        className="ui-toast"
        onRemove={handleRemove}
        position="top-right"
        pt={{ closeButton: { "aria-label": "Cerrar notificación" } }}
        ref={toastRef}
      />
    </toastContext.Provider>
  );
};
