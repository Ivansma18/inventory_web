import type { components } from "@/shared/api/generated/auth-contracts";

export type AuthUser = components["schemas"]["PublicAuthUser"];
export type AuthSession = components["schemas"]["PublicAuthSession"];
export type SignInCredentials = components["schemas"]["AuthCredentials"];

type AuthOperation = "session" | "sign-in" | "sign-out";

export interface AuthContractError {
  kind: "contract";
  operation: AuthOperation;
  status: number;
  message: string;
}

export interface AuthHttpError {
  kind: "http";
  operation: AuthOperation;
  status: number;
  message: string;
}

export interface AuthNetworkError {
  kind: "network";
  operation: AuthOperation;
  message: string;
}

export type AuthSessionError = AuthContractError | AuthHttpError | AuthNetworkError;

export type AuthSessionState =
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
      user: AuthUser;
      session: AuthSession;
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
      error: AuthSessionError;
    };

export interface AuthOperationState {
  isPending: boolean;
}

export interface AuthPreconditionError {
  kind: "precondition";
  sessionStatus: AuthSessionState["status"];
  activeOperation?: "sign-in" | "sign-out";
  message: string;
}

export type AuthActionError =
  | AuthPreconditionError
  | {
      kind: "credentials";
      status: 401;
      code?: "UNAUTHORIZED";
      message: string;
    }
  | AuthSessionError;

export type AuthSignInResult =
  | { data: components["schemas"]["PublicAuthResponse"]; error: null }
  | { data: null; error: AuthActionError };

export type AuthSignOutResult =
  | { data: null; error: null }
  | {
      data: null;
      error: AuthHttpError | AuthNetworkError | AuthContractError | AuthPreconditionError;
    };

export type AuthSessionQueryResult =
  | { data: components["schemas"]["PublicAuthResponse"]; error: null }
  | { data: null; error: AuthSessionError }
  | { data: null; error: null }
  | { data: null; error: null; stale: true };

export type UseSessionResult = AuthSessionState & {
  isPending: boolean;
  refetch: () => Promise<AuthSessionQueryResult>;
};

export interface UseAuthResult {
  isSigningIn: boolean;
  isSigningOut: boolean;
  signIn: (credentials: SignInCredentials) => Promise<AuthSignInResult>;
  signOut: () => Promise<AuthSignOutResult>;
}
