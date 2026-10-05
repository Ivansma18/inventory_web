import type { BetterAuthClientPlugin, BetterFetchResponse } from "better-auth/client";
import { atom, onMount } from "nanostores";

import type { components } from "@/shared/api/generated/auth-contracts";

import type { PublicAuthResponse } from "./auth-contract";
import { publicAuthResponseSchema } from "./auth-contract";
import { AUTH_REQUEST_TIMEOUT_MS, AuthResponseContractError } from "./api/auth-transport";

type AuthCredentials = components["schemas"]["AuthCredentials"];

export interface InventorySessionContractError {
  kind: "contract";
  operation: "session" | "sign-in";
  status: number;
  message: string;
}

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
      error: InventorySessionContractError;
    };

type InventoryUnconfirmedState = Extract<InventorySessionState, { status: "unconfirmed" }>;

export interface InventorySignInState {
  isPending: boolean;
}

export interface InventorySignOutState {
  isPending: boolean;
}

export interface InventoryAuthHttpError {
  kind: "http";
  status: number;
  message: string;
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
  | InventorySessionContractError
  | InventoryAuthHttpError;

export type InventorySignInResult =
  { data: PublicAuthResponse; error: null } | { data: null; error: InventoryAuthActionError };

export type InventorySignOutResult =
  { data: null; error: null } | { data: null; error: InventoryAuthHttpError };

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

const createUnconfirmedState = (
  status: number,
  operation: InventorySessionContractError["operation"] = "session",
): InventoryUnconfirmedState => ({
  status: "unconfirmed",
  user: null,
  session: null,
  isRefetching: false,
  isAuthenticated: false,
  isUnauthenticated: false,
  error: {
    kind: "contract",
    operation,
    status,
    message: "The authentication response did not match the public contract.",
  },
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
  ): Promise<void> => {
    const current = inventorySession.get();
    if (current.status !== "pending") {
      inventorySession.set({ ...current, isRefetching: true });
    }

    try {
      const result = await request();

      if (result.error) {
        if (result.error.status === 401) {
          inventorySession.set(createUnauthenticatedState());
        }
        return;
      }

      const parsed = publicAuthResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        inventorySession.set(createUnconfirmedState(200));
        return;
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
    } catch (error: unknown) {
      if (error instanceof AuthResponseContractError) {
        inventorySession.set(createUnconfirmedState(error.status));
        return;
      }

      throw error;
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
          error: {
            kind: "http",
            status: result.error.status,
            message: "The authentication request failed.",
          },
        };
      }

      const parsed = publicAuthResponseSchema.safeParse(result.data);
      if (!parsed.success) {
        const nextState = createUnconfirmedState(200, "sign-in");
        inventorySession.set(nextState);
        return { data: null, error: nextState.error };
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
        const nextState = createUnconfirmedState(error.status, "sign-in");
        inventorySession.set(nextState);
        return { data: null, error: nextState.error };
      }

      throw error;
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
          error: {
            kind: "http",
            status: result.error.status,
            message: "The authentication request failed.",
          },
        };
      }

      inventorySession.set(createUnauthenticatedState());
      return { data: null, error: null };
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
