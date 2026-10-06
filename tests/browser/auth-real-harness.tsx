import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { useAuth, useSession } from "@/features/auth";
import type { AuthActionError, AuthSessionError, SignInCredentials } from "@/features/auth";

type HarnessCommand = "sign-in" | "sign-out" | "refetch";

interface AuthHarnessWindow extends Window {
  __inventoryAuthTestDispatcher?: EventListener;
  __inventoryAuthTestHandler?: (event: MessageEvent<unknown>) => void;
}

interface HarnessOperationState {
  command: HarnessCommand;
  status: "pending" | "succeeded" | "failed";
  error: { kind: string; operation: string | null; status: number | null } | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const summarizeError = (error: AuthActionError | AuthSessionError | null) => {
  if (!error) {
    return null;
  }

  return {
    kind: error.kind,
    operation: "operation" in error ? error.operation : null,
    status: "status" in error ? error.status : null,
    sessionStatus: "sessionStatus" in error ? error.sessionStatus : null,
    activeOperation: "activeOperation" in error ? error.activeOperation : null,
  };
};

const AuthRealHarness = () => {
  const auth = useAuth();
  const session = useSession();
  const authRef = useRef(auth);
  const sessionRef = useRef(session);
  const [operation, setOperation] = useState<HarnessOperationState | null>(null);

  const runSignIn = useCallback(async (credentials: SignInCredentials) => {
    setOperation({ command: "sign-in", status: "pending", error: null });
    const result = await authRef.current.signIn(credentials);
    setOperation({
      command: "sign-in",
      status: result.error ? "failed" : "succeeded",
      error: summarizeError(result.error),
    });
  }, []);

  const runSignOut = useCallback(async () => {
    setOperation({ command: "sign-out", status: "pending", error: null });
    const result = await authRef.current.signOut();
    setOperation({
      command: "sign-out",
      status: result.error ? "failed" : "succeeded",
      error: summarizeError(result.error),
    });
  }, []);

  const runRefetch = useCallback(async () => {
    setOperation({ command: "refetch", status: "pending", error: null });
    const result = await sessionRef.current.refetch();
    setOperation({
      command: "refetch",
      status: result.error ? "failed" : "succeeded",
      error: summarizeError(result.error),
    });
  }, []);

  useEffect(() => {
    authRef.current = auth;
    sessionRef.current = session;
  }, [auth, session]);

  useEffect(() => {
    const harnessWindow = window as AuthHarnessWindow;
    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window || event.origin !== window.location.origin) {
        return;
      }

      if (!isRecord(event.data) || event.data.channel !== "inventory-auth-test") {
        return;
      }

      if (event.data.command === "sign-in") {
        const credentials = event.data.credentials;
        if (
          !isRecord(credentials) ||
          typeof credentials.email !== "string" ||
          typeof credentials.password !== "string"
        ) {
          return;
        }

        void runSignIn({ email: credentials.email, password: credentials.password });
        return;
      }

      if (event.data.command === "sign-out") {
        void runSignOut();
        return;
      }

      if (event.data.command === "refetch") {
        void runRefetch();
      }
    };

    harnessWindow.__inventoryAuthTestHandler = handleMessage;
    if (!harnessWindow.__inventoryAuthTestDispatcher) {
      const dispatcher: EventListener = (event) =>
        harnessWindow.__inventoryAuthTestHandler?.(event as MessageEvent<unknown>);
      harnessWindow.__inventoryAuthTestDispatcher = dispatcher;
      window.addEventListener("message", dispatcher);
    }

    return () => {
      if (harnessWindow.__inventoryAuthTestHandler === handleMessage) {
        delete harnessWindow.__inventoryAuthTestHandler;
      }
    };
  }, [runRefetch, runSignIn, runSignOut]);

  const sessionSnapshot = {
    status: session.status,
    isPending: session.isPending,
    isRefetching: session.isRefetching,
    isAuthenticated: session.isAuthenticated,
    isUnauthenticated: session.isUnauthenticated,
    user: session.user ? { id: session.user.id, role: session.user.role } : null,
    session: session.session
      ? { id: session.session.id, createdAt: session.session.createdAt }
      : null,
    error: summarizeError(session.error),
  };

  return (
    <main data-testid="auth-test-harness">
      <h1>Auth test harness</h1>
      <output aria-live="polite" data-testid="auth-session-state" data-status={session.status}>
        {JSON.stringify(sessionSnapshot)}
      </output>
      <output
        aria-live="polite"
        data-testid="auth-operation-state"
        data-command={operation?.command ?? ""}
        data-status={operation?.status ?? "idle"}
      >
        {JSON.stringify(operation)}
      </output>
      <button type="button" onClick={() => void runRefetch()}>
        Refetch session
      </button>
      <button type="button" onClick={() => void runSignOut()}>
        Sign out
      </button>
    </main>
  );
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Auth test harness root element is missing.");
}

createRoot(rootElement).render(<AuthRealHarness />);
