import type { BetterAuthClientPlugin, BetterFetchResponse } from "better-auth/client";
import { atom, onMount } from "nanostores";

import { publicAuthResponseSchema } from "./auth-contract";
import { AUTH_REQUEST_TIMEOUT_MS, AuthResponseContractError } from "./api/auth-transport";
import type {
  AuthContractError as InventorySessionContractError,
  AuthHttpError as InventoryAuthHttpError,
  AuthNetworkError as InventoryAuthNetworkError,
  AuthOperationState as InventorySignInState,
  AuthSignOutError as InventorySignOutError,
  AuthSignOutOperationState as InventorySignOutState,
  AuthSessionError as InventorySessionError,
  AuthSessionQueryResult as InventorySessionQueryResult,
  AuthSessionState as InventorySessionState,
  AuthSessionVerificationState as InventorySessionVerificationState,
  AuthSignInResult as InventorySignInResult,
  AuthSignOutResult as InventorySignOutResult,
  SignInCredentials as AuthCredentials,
} from "./types/auth";

type AuthOperation = "session" | "sign-in" | "sign-out";
type AuthMutationOperation = "sign-in" | "sign-out";

type InventoryUnconfirmedState = Extract<InventorySessionState, { status: "unconfirmed" }>;

const createPendingState = (): InventorySessionState => ({
  status: "pending",
  user: null,
  session: null,
  isRefetching: false,
  isAuthenticated: false,
  isUnauthenticated: false,
  error: null,
});

const createUnauthenticatedState = (): InventorySessionState => ({
  status: "unauthenticated",
  user: null,
  session: null,
  isRefetching: false,
  isAuthenticated: false,
  isUnauthenticated: true,
  error: null,
});

const createContractError = (
  status: number,
  operation: InventorySessionContractError["operation"],
): InventorySessionContractError => ({
  kind: "contract",
  operation,
  status,
  message: "The authentication response did not match the public contract.",
});

const createHttpError = (operation: AuthOperation, status: number): InventoryAuthHttpError => ({
  kind: "http",
  operation,
  status,
  message: "The authentication request failed.",
});

const createNetworkError = (operation: AuthOperation): InventoryAuthNetworkError => ({
  kind: "network",
  operation,
  message: "The authentication server could not be reached.",
});

const createAuthPreconditionError = (
  sessionStatus: InventorySessionState["status"],
  activeOperation?: AuthMutationOperation,
) => ({
  kind: "precondition" as const,
  sessionStatus,
  ...(activeOperation ? { activeOperation } : {}),
  message: activeOperation
    ? "Another authentication operation is already in progress."
    : "Sign-in requires a confirmed unauthenticated session.",
});

const createUnconfirmedState = (error: InventorySessionError): InventoryUnconfirmedState => ({
  status: "unconfirmed",
  user: null,
  session: null,
  isRefetching: false,
  isAuthenticated: false,
  isUnauthenticated: false,
  error,
});

const hasUnauthorizedCode = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null || !("error" in error)) {
    return false;
  }

  const responseError = error.error;
  return (
    typeof responseError === "object" &&
    responseError !== null &&
    "code" in responseError &&
    responseError.code === "UNAUTHORIZED"
  );
};

export const createInventoryAuthPlugin = () => {
  const inventorySession = atom<InventorySessionState>(createPendingState());
  const inventorySessionVerification = atom<InventorySessionVerificationState>({
    status: "pending",
    error: null,
  });
  const inventorySignIn = atom<InventorySignInState>({ isPending: false });
  const inventorySignOut = atom<InventorySignOutState>({ isPending: false, error: null });
  let initialSessionQueryStarted = false;
  let sessionOperationVersion = 0;
  let activeAuthOperation: AuthMutationOperation | null = null;
  let activeSessionVerification: {
    version: number;
    promise: Promise<InventorySessionQueryResult>;
  } | null = null;

  const runSessionVerification = async (
    request: () => Promise<BetterFetchResponse<unknown>>,
    requestOperationVersion: number,
    hasConfirmedSession: boolean,
  ): Promise<InventorySessionQueryResult> => {
    const responseIsStale = () => requestOperationVersion !== sessionOperationVersion;

    try {
      const result = await request();
      if (responseIsStale()) {
        return { data: null, error: null, stale: true };
      }

      if (result.error) {
        if (result.error.status === 401) {
          inventorySession.set(createUnauthenticatedState());
          inventorySessionVerification.set({ status: "success", error: null });
          return { data: null, error: null };
        }

        const error = createHttpError("session", result.error.status);
        inventorySessionVerification.set({ status: "error", error });
        if (!hasConfirmedSession) {
          inventorySession.set(createUnconfirmedState(error));
        }
        return { data: null, error };
      }

      const parsed = publicAuthResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        const error = createContractError(200, "session");
        inventorySession.set(createUnconfirmedState(error));
        inventorySessionVerification.set({ status: "error", error });
        return { data: null, error };
      }

      inventorySession.set({
        status: "authenticated",
        user: parsed.data.data.user,
        session: parsed.data.data.session,
        isRefetching: false,
        isAuthenticated: true,
        isUnauthenticated: false,
        error: null,
      });
      inventorySessionVerification.set({ status: "success", error: null });
      return { data: parsed.data, error: null };
    } catch (error: unknown) {
      if (responseIsStale()) {
        return { data: null, error: null, stale: true };
      }

      if (error instanceof AuthResponseContractError) {
        const contractError = createContractError(error.status, "session");
        inventorySession.set(createUnconfirmedState(contractError));
        inventorySessionVerification.set({ status: "error", error: contractError });
        return { data: null, error: contractError };
      }

      const networkError = createNetworkError("session");
      inventorySessionVerification.set({ status: "error", error: networkError });
      if (!hasConfirmedSession) {
        inventorySession.set(createUnconfirmedState(networkError));
      }
      return { data: null, error: networkError };
    } finally {
      const latest = inventorySession.get();
      if (requestOperationVersion === sessionOperationVersion && latest.isRefetching) {
        inventorySession.set({ ...latest, isRefetching: false });
      }
    }
  };

  const refreshSession = (
    request: () => Promise<BetterFetchResponse<unknown>>,
  ): Promise<InventorySessionQueryResult> => {
    const requestOperationVersion = sessionOperationVersion;
    if (activeSessionVerification?.version === requestOperationVersion) {
      return activeSessionVerification.promise;
    }

    const current = inventorySession.get();
    const hasConfirmedSession =
      current.status === "authenticated" || current.status === "unauthenticated";
    let resolveOperation!: (result: InventorySessionQueryResult) => void;
    let rejectOperation!: (error: unknown) => void;
    const promise = new Promise<InventorySessionQueryResult>((resolve, reject) => {
      resolveOperation = resolve;
      rejectOperation = reject;
    });
    activeSessionVerification = { version: requestOperationVersion, promise };

    void promise
      .finally(() => {
        if (activeSessionVerification?.promise === promise) {
          activeSessionVerification = null;
        }
      })
      .catch(() => undefined);

    inventorySessionVerification.set({ status: "pending", error: null });
    if (current.status !== "pending") {
      inventorySession.set({ ...current, isRefetching: true });
    }

    void runSessionVerification(request, requestOperationVersion, hasConfirmedSession).then(
      resolveOperation,
      rejectOperation,
    );

    return promise;
  };

  const performSignInWithEmail = async (
    credentials: AuthCredentials,
    request: () => Promise<BetterFetchResponse<unknown>>,
  ): Promise<InventorySignInResult> => {
    const current = inventorySession.get();
    if (activeAuthOperation) {
      return {
        data: null,
        error: createAuthPreconditionError(current.status, activeAuthOperation),
      };
    }

    if (current.status !== "unauthenticated") {
      return {
        data: null,
        error: createAuthPreconditionError(current.status),
      };
    }

    activeAuthOperation = "sign-in";
    inventorySignIn.set({ isPending: true });

    try {
      const result = await request();

      if (result.error) {
        if (result.error.status === 401) {
          return {
            data: null,
            error: {
              kind: "credentials",
              status: 401,
              ...(hasUnauthorizedCode(result.error) ? { code: "UNAUTHORIZED" } : {}),
              message: "The email or password is incorrect.",
            },
          };
        }

        return {
          data: null,
          error: createHttpError("sign-in", result.error.status),
        };
      }

      const parsed = publicAuthResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        const error = createContractError(200, "sign-in");
        const nextState = createUnconfirmedState(error);
        inventorySession.set(nextState);
        return { data: null, error };
      }

      const nextState: InventorySessionState = {
        status: "authenticated",
        user: parsed.data.data.user,
        session: parsed.data.data.session,
        isRefetching: false,
        isAuthenticated: true,
        isUnauthenticated: false,
        error: null,
      };
      sessionOperationVersion += 1;
      inventorySession.set(nextState);

      return { data: parsed.data, error: null };
    } catch (error: unknown) {
      if (error instanceof AuthResponseContractError) {
        const contractError = createContractError(error.status, "sign-in");
        const nextState = createUnconfirmedState(contractError);
        inventorySession.set(nextState);
        return { data: null, error: contractError };
      }

      return { data: null, error: createNetworkError("sign-in") };
    } finally {
      activeAuthOperation = null;
      inventorySignIn.set({ isPending: false });
    }
  };

  const performSignOut = async (
    request: () => Promise<BetterFetchResponse<null>>,
  ): Promise<InventorySignOutResult> => {
    const current = inventorySession.get();
    if (activeAuthOperation) {
      return {
        data: null,
        error: createAuthPreconditionError(current.status, activeAuthOperation),
      };
    }

    activeAuthOperation = "sign-out";
    inventorySignOut.set({ isPending: true, error: null });
    let operationError: InventorySignOutError | null = null;

    try {
      const result = await request();
      if (result.error) {
        operationError = createHttpError("sign-out", result.error.status);
        return {
          data: null,
          error: operationError,
        };
      }

      sessionOperationVersion += 1;
      inventorySession.set(createUnauthenticatedState());
      inventorySessionVerification.set({ status: "success", error: null });
      return { data: null, error: null };
    } catch (error: unknown) {
      if (error instanceof AuthResponseContractError) {
        operationError = createContractError(error.status, "sign-out");
        return {
          data: null,
          error: operationError,
        };
      }

      operationError = createNetworkError("sign-out");
      return { data: null, error: operationError };
    } finally {
      activeAuthOperation = null;
      inventorySignOut.set({ isPending: false, error: operationError });
    }
  };

  const plugin = {
    id: "inventory-auth",
    getAtoms: ($fetch) => {
      onMount(inventorySession, () => {
        if (initialSessionQueryStarted) {
          return;
        }

        initialSessionQueryStarted = true;
        void refreshSession(() =>
          $fetch<unknown>("/get-session", {
            method: "GET",
            credentials: "include",
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          }),
        ).catch(() => undefined);
      });

      return {
        inventorySession,
        inventorySessionVerification,
        inventorySignIn,
        inventorySignOut,
      };
    },
    getActions: ($fetch) => ({
      isInventorySessionCurrent: (sessionId: string) => {
        const currentSession = inventorySession.get();
        return currentSession.status === "authenticated" && currentSession.session.id === sessionId;
      },
      signInWithEmail: (credentials: AuthCredentials) =>
        performSignInWithEmail(credentials, () =>
          $fetch<unknown>("/sign-in/email", {
            method: "POST",
            body: credentials,
            credentials: "include",
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          }),
        ),
      signOutInventory: () =>
        performSignOut(() =>
          $fetch<null>("/sign-out", {
            method: "POST",
            body: {},
            headers: { "content-type": "application/json" },
            credentials: "include",
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          }),
        ),
      refreshSession: () =>
        refreshSession(() =>
          $fetch<unknown>("/get-session", {
            method: "GET",
            credentials: "include",
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          }),
        ),
    }),
  } satisfies BetterAuthClientPlugin;

  return plugin;
};
