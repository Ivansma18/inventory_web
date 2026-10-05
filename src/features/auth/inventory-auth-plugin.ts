import type { BetterAuthClientPlugin, BetterFetchResponse } from "better-auth/client";
import { atom, onMount } from "nanostores";

import type { components } from "@/shared/api/generated/auth-contracts";

import type { PublicAuthResponse } from "./auth-contract";
import { publicAuthResponseSchema } from "./auth-contract";
import { AUTH_REQUEST_TIMEOUT_MS, AuthResponseContractError } from "./api/auth-transport";

type AuthCredentials = components["schemas"]["AuthCredentials"];
type AuthOperation = "session" | "sign-in" | "sign-out";

export interface InventorySessionContractError {
  kind: "contract";
  operation: "session" | "sign-in" | "sign-out";
  status: number;
  message: string;
}

export interface InventoryAuthHttpError {
  kind: "http";
  operation: AuthOperation;
  status: number;
  message: string;
}

export interface InventoryAuthNetworkError {
  kind: "network";
  operation: AuthOperation;
  message: string;
}

export type InventorySessionError =
  InventorySessionContractError | InventoryAuthHttpError | InventoryAuthNetworkError;

export type InventorySessionState =
  | {
      status: "pending";
      user: null;
      session: null;
      isRefetching: false;
      isAuthenticated: false;
      isUnauthenticated: false;
      error: null;
    }
  | {
      status: "authenticated";
      user: PublicAuthResponse["data"]["user"];
      session: PublicAuthResponse["data"]["session"];
      isRefetching: boolean;
      isAuthenticated: true;
      isUnauthenticated: false;
      error: null;
    }
  | {
      status: "unauthenticated";
      user: null;
      session: null;
      isRefetching: boolean;
      isAuthenticated: false;
      isUnauthenticated: true;
      error: null;
    }
  | {
      status: "unconfirmed";
      user: null;
      session: null;
      isRefetching: boolean;
      isAuthenticated: false;
      isUnauthenticated: false;
      error: InventorySessionError;
    };

type InventoryUnconfirmedState = Extract<InventorySessionState, { status: "unconfirmed" }>;

export interface InventorySignInState {
  isPending: boolean;
}

export interface InventorySignOutState {
  isPending: boolean;
}

export type InventoryAuthActionError =
  | {
      kind: "precondition";
      sessionStatus: InventorySessionState["status"];
      message: string;
    }
  | {
      kind: "credentials";
      status: 401;
      code?: "UNAUTHORIZED";
      message: string;
    }
  | InventorySessionError;

export type InventorySignInResult =
  { data: PublicAuthResponse; error: null } | { data: null; error: InventoryAuthActionError };

export type InventorySignOutResult =
  | { data: null; error: null }
  | {
      data: null;
      error: InventoryAuthHttpError | InventoryAuthNetworkError | InventorySessionContractError;
    };

export type InventorySessionQueryResult =
  { data: PublicAuthResponse; error: null } | { data: null; error: null | InventorySessionError };

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
  const inventorySignIn = atom<InventorySignInState>({ isPending: false });
  const inventorySignOut = atom<InventorySignOutState>({ isPending: false });

  const refreshSession = async (
    request: () => Promise<BetterFetchResponse<unknown>>,
  ): Promise<InventorySessionQueryResult> => {
    const current = inventorySession.get();
    const hasConfirmedSession =
      current.status === "authenticated" || current.status === "unauthenticated";

    if (current.status !== "pending") {
      inventorySession.set({ ...current, isRefetching: true });
    }

    try {
      const result = await request();

      if (result.error) {
        if (result.error.status === 401) {
          inventorySession.set(createUnauthenticatedState());
          return { data: null, error: null };
        }

        const error = createHttpError("session", result.error.status);
        if (!hasConfirmedSession) {
          inventorySession.set(createUnconfirmedState(error));
        }
        return { data: null, error };
      }

      const parsed = publicAuthResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        const error = createContractError(200, "session");
        inventorySession.set(createUnconfirmedState(error));
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
      return { data: parsed.data, error: null };
    } catch (error: unknown) {
      if (error instanceof AuthResponseContractError) {
        const contractError = createContractError(error.status, "session");
        inventorySession.set(createUnconfirmedState(contractError));
        return { data: null, error: contractError };
      }

      const networkError = createNetworkError("session");
      if (!hasConfirmedSession) {
        inventorySession.set(createUnconfirmedState(networkError));
      }
      return { data: null, error: networkError };
    } finally {
      const latest = inventorySession.get();
      if (latest.isRefetching) {
        inventorySession.set({ ...latest, isRefetching: false });
      }
    }
  };

  const performSignInWithEmail = async (
    credentials: AuthCredentials,
    request: () => Promise<BetterFetchResponse<unknown>>,
  ): Promise<InventorySignInResult> => {
    const current = inventorySession.get();
    if (current.status !== "unauthenticated") {
      return {
        data: null,
        error: {
          kind: "precondition",
          sessionStatus: current.status,
          message: "Sign-in requires a confirmed unauthenticated session.",
        },
      };
    }

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
      inventorySignIn.set({ isPending: false });
    }
  };

  const performSignOut = async (
    request: () => Promise<BetterFetchResponse<null>>,
  ): Promise<InventorySignOutResult> => {
    inventorySignOut.set({ isPending: true });

    try {
      const result = await request();
      if (result.error) {
        return {
          data: null,
          error: createHttpError("sign-out", result.error.status),
        };
      }

      inventorySession.set(createUnauthenticatedState());
      return { data: null, error: null };
    } catch (error: unknown) {
      if (error instanceof AuthResponseContractError) {
        return {
          data: null,
          error: createContractError(error.status, "sign-out"),
        };
      }

      return { data: null, error: createNetworkError("sign-out") };
    } finally {
      inventorySignOut.set({ isPending: false });
    }
  };

  const plugin = {
    id: "inventory-auth",
    getAtoms: ($fetch) => {
      onMount(inventorySession, () => {
        void refreshSession(() =>
          $fetch<unknown>("/get-session", {
            method: "GET",
            credentials: "include",
            timeout: AUTH_REQUEST_TIMEOUT_MS,
          }),
        ).catch(() => undefined);
      });

      return { inventorySession, inventorySignIn, inventorySignOut };
    },
    getActions: ($fetch) => ({
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
