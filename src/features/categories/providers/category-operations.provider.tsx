import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { isCurrentSession, useSession } from "@/features/auth";

import { CategoryOperationsContext } from "./category-operations.context";
import type { CategoryOperation, CategoryOperationPhase } from "./category-operations.context";

export interface CategoryOperationsProviderProps {
  children: ReactNode;
}

interface SessionScopedCategoryOperationsProps extends CategoryOperationsProviderProps {
  sessionId: string | null;
}

const SessionScopedCategoryOperations = ({
  children,
  sessionId,
}: SessionScopedCategoryOperationsProps) => {
  const [operations, setOperations] = useState<CategoryOperation[]>([]);

  const registerOperation = useCallback(
    (operation: CategoryOperation) => {
      if (sessionId === null || operation.sessionId !== sessionId || !isCurrentSession(sessionId)) {
        return;
      }

      setOperations((current) => {
        if (current.some((registered) => registered.id === operation.id)) {
          return current;
        }

        return [...current, { ...operation }];
      });
    },
    [sessionId],
  );

  const setOperationPhase = useCallback(
    (operationId: string, phase: CategoryOperationPhase) => {
      if (sessionId === null || !isCurrentSession(sessionId)) {
        return;
      }

      setOperations((current) =>
        current.map((operation) =>
          operation.id === operationId ? { ...operation, phase } : operation,
        ),
      );
    },
    [sessionId],
  );

  const removeOperation = useCallback(
    (operationId: string) => {
      if (sessionId === null || !isCurrentSession(sessionId)) {
        return;
      }

      setOperations((current) => current.filter((operation) => operation.id !== operationId));
    },
    [sessionId],
  );

  const getOperationForCategory = useCallback(
    (uuid: string) => operations.find((operation) => operation.uuid === uuid),
    [operations],
  );

  const contextValue = useMemo(
    () => ({
      operations,
      registerOperation,
      setOperationPhase,
      removeOperation,
      getOperationForCategory,
    }),
    [operations, registerOperation, setOperationPhase, removeOperation, getOperationForCategory],
  );

  return (
    <CategoryOperationsContext.Provider value={contextValue}>
      {children}
    </CategoryOperationsContext.Provider>
  );
};

export const CategoryOperationsProvider = ({ children }: CategoryOperationsProviderProps) => {
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;

  return (
    <SessionScopedCategoryOperations key={sessionId ?? "no-session"} sessionId={sessionId}>
      {children}
    </SessionScopedCategoryOperations>
  );
};
