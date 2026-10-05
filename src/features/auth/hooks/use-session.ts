import { authClient } from "../api/auth-client";
import type { UseSessionResult } from "../types/auth";

export const useSession = (): UseSessionResult => {
  const session = authClient.useInventorySession();

  return {
    ...session,
    isPending: session.status === "pending",
    refetch: () => authClient.refreshSession(),
  };
};
