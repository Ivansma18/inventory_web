import type { BetterAuthClientPlugin, BetterFetchResponse } from "better-auth/client";
import { atom, onMount } from "nanostores";

import type { PublicAuthResponse } from "./auth-contract";
import { publicAuthResponseSchema } from "./auth-contract";
import { AUTH_REQUEST_TIMEOUT_MS, AuthResponseContractError } from "./api/auth-transport";

export interface InventorySessionContractError {
  kind: "contract";
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

const createUnconfirmedState = (status: number): InventorySessionState => ({
  status: "unconfirmed",
  user: null,
  session: null,
  isRefetching: false,
  isAuthenticated: false,
  isUnauthenticated: false,
  error: {
    kind: "contract",
    status,
    message: "The session response did not match the public authentication contract.",
  },
});

export const createInventoryAuthPlugin = () => {
  const inventorySession = atom<InventorySessionState>(createPendingState());

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

      return { inventorySession };
    },
    getActions: ($fetch) => ({
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
