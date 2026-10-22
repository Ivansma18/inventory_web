import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { isCurrentSession, useSession } from "@/features/auth";

import { useChangeCategoryStatus } from "../hooks/use-change-category-status";
import { CategoryOperationsContext } from "./category-operations.context";
import type { CategoryOperation, CategoryOperationPhase } from "./category-operations.context";
import type { CategoryStatusChangeRequest } from "./category-operations.context";

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
  const statusLocks = useRef(new Set<string>());
  const operationSequence = useRef(0);
  const { mutateAsync: mutateStatus } = useChangeCategoryStatus(sessionId);

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

  const requestStatusChange = useCallback(
    async ({ uuid, previousIsActive, requestedIsActive }: CategoryStatusChangeRequest) => {
      if (
        sessionId === null ||
        !isCurrentSession(sessionId) ||
        previousIsActive === requestedIsActive
      ) {
        throw new Error("The category status change is not available.");
      }

      if (
        statusLocks.current.has(uuid) ||
        operations.some((operation) => operation.uuid === uuid)
      ) {
        throw new Error("A category operation is already registered for this category.");
      }

      statusLocks.current.add(uuid);
      operationSequence.current += 1;
      const operationId = `${sessionId}:category-status:${operationSequence.current}`;
      registerOperation({
        id: operationId,
        sessionId,
        uuid,
        previousIsActive,
        requestedIsActive,
        phase: "pending",
      });

      try {
        const category = await mutateStatus({
          uuid,
          isActive: requestedIsActive,
          sessionId,
        });

        if (!isCurrentSession(sessionId)) {
          throw new Error("The category status result belongs to an inactive session.");
        }

        setOperationPhase(operationId, "confirmed");
        return category;
      } finally {
        statusLocks.current.delete(uuid);
        removeOperation(operationId);
      }
    },
    [operations, registerOperation, removeOperation, sessionId, setOperationPhase, mutateStatus],
  );

  const contextValue = useMemo(
    () => ({
      operations,
      registerOperation,
      setOperationPhase,
      removeOperation,
      getOperationForCategory,
      requestStatusChange,
    }),
    [
      operations,
      registerOperation,
      setOperationPhase,
      removeOperation,
      getOperationForCategory,
      requestStatusChange,
    ],
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
