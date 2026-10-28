import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { isCurrentSession, useSession } from "@/features/auth";

export interface InventorySessionScopeProps {
  children: ReactNode;
}

const isInventoryQueryForSession = (queryKey: readonly unknown[], sessionId: string): boolean =>
  queryKey[0] === "inventory" && queryKey[2] === sessionId;

export const InventorySessionScope = ({ children }: InventorySessionScopeProps) => {
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (sessionId === null) {
      return;
    }

    return () => {
      if (isCurrentSession(sessionId)) {
        return;
      }

      const predicate = ({ queryKey }: { queryKey: readonly unknown[] }) =>
        isInventoryQueryForSession(queryKey, sessionId);

      void queryClient.cancelQueries({ predicate });
      queryClient.removeQueries({ predicate });
    };
  }, [queryClient, sessionId]);

  return children;
};
