import "./session-state.css";

type SessionStateKind = "checking" | "error" | "signed-out";

export interface SessionStateProps {
  state: SessionStateKind;
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

export const SessionState = ({ state }: SessionStateProps) => {
  const copy = sessionStateCopy[state];
  const isError = state === "error";

  return (
    <section
      aria-atomic="true"
      aria-live={isError ? "assertive" : "polite"}
      className="session-state"
      data-state={state}
      role={isError ? "alert" : "status"}
    >
      <h1 className="session-state__heading">{copy.heading}</h1>
      <p className="session-state__message">{copy.message}</p>
    </section>
  );
};
