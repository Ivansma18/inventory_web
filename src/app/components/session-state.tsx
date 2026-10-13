import "./session-state.css";

import { Button } from "@/shared/ui";

type SessionStateKind = "checking" | "error" | "signed-out";

export interface SessionStateProps {
  state: SessionStateKind;
  onRetry?: () => void;
}

const sessionStateCopy: Record<SessionStateKind, { heading: string; message: string }> = {
  checking: {
    heading: "Comprobando tu sesión",
    message: "Estamos verificando tu acceso a Inventory.",
  },
  error: {
    heading: "No se pudo comprobar la sesión",
    message: "Comprueba tu conexión e inténtalo de nuevo.",
  },
  "signed-out": {
    heading: "Sesión no iniciada",
    message: "No hay una sesión activa para esta aplicación.",
  },
};

export const SessionState = ({ state, onRetry }: SessionStateProps) => {
  const copy = sessionStateCopy[state];
  const isError = state === "error";

  return (
    <section className="session-state" data-state={state}>
      <div
        aria-atomic="true"
        aria-live={isError ? "assertive" : "polite"}
        className="session-state__announcement"
        role={isError ? "alert" : "status"}
      >
        <h1 className="session-state__heading">{copy.heading}</h1>
        <p className="session-state__message">{copy.message}</p>
      </div>
      {isError && onRetry ? (
        <div className="session-state__actions">
          <Button onClick={onRetry}>Reintentar</Button>
        </div>
      ) : null}
    </section>
  );
};
