import { authClient } from "../api/auth-client";
import type { UseSessionResult } from "../types/auth";

export const useSession = (): UseSessionResult => {
  const session = authClient.useInventorySession();
  const verification = authClient.useInventorySessionVerification();

  return {
    ...session,
    verification,
    isPending: session.status === "pending",
    refetch: () => authClient.refreshSession(),
  };
};
