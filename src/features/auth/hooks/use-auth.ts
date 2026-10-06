import { authClient } from "../api/auth-client";
import type { UseAuthResult } from "../types/auth";

export const useAuth = (): UseAuthResult => {
  const signInState = authClient.useInventorySignIn();
  const signOutState = authClient.useInventorySignOut();

  return {
    isSigningIn: signInState.isPending,
    isSigningOut: signOutState.isPending,
    signIn: (credentials) => authClient.signInWithEmail(credentials),
    signOut: () => authClient.signOutInventory(),
  };
};
