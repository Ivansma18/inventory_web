export { useAuth } from "./hooks/use-auth";
export { useSession } from "./hooks/use-session";
export { isCurrentSession } from "./api/auth-client";

export type {
  AuthActionError,
  AuthContractError,
  AuthHttpError,
  AuthNetworkError,
  AuthOperationState,
  AuthPreconditionError,
  AuthSession,
  AuthSessionError,
  AuthSessionQueryResult,
  AuthSessionState,
  AuthSessionVerificationState,
  AuthSignOutError,
  AuthSignInResult,
  AuthSignOutResult,
  AuthUser,
  SignInCredentials,
  UseAuthResult,
  UseSessionResult,
} from "./types/auth";
