import { useEffect } from "react";

import { isCurrentSession } from "@/features/auth";

const revalidatedErrors = new WeakMap<object, Set<string>>();

export const useInventoryAuthRevalidation = (
  sessionId: string | null,
  error: unknown,
  isUnauthorized: (error: unknown) => boolean,
  refetchSession: () => Promise<unknown>,
) => {
  useEffect(() => {
    if (
      sessionId === null ||
      !isUnauthorized(error) ||
      typeof error !== "object" ||
      error === null ||
      !isCurrentSession(sessionId)
    ) {
      return;
    }

    const checkedSessions = revalidatedErrors.get(error) ?? new Set<string>();
    if (checkedSessions.has(sessionId)) {
      return;
    }

    checkedSessions.add(sessionId);
    revalidatedErrors.set(error, checkedSessions);
    void refetchSession();
  }, [error, isUnauthorized, refetchSession, sessionId]);
};
