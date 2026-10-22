import { useCallback, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { isCurrentSession, useSession } from "@/features/auth";
import { useQueryClient } from "@tanstack/react-query";

import { getCategory } from "../api/categories-api";
import {
  isCategoryNotFoundError,
  isCategoryResponseContractError,
  isUncertainCategoryMutationError,
} from "../utils/category-api-errors";
import { categoryDetailQueryKey } from "../hooks/use-category";
import { useChangeCategoryStatus } from "../hooks/use-change-category-status";
import { CategoryOperationsContext } from "./category-operations.context";
import { CategoryStatusCheckCompletedError } from "./category-operations.context";
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
  const checksInFlight = useRef(new Set<string>());
  const operationUuidsById = useRef(new Map<string, string>());
  const operationSequence = useRef(0);
  const queryClient = useQueryClient();
  const { mutateAsync: mutateStatus } = useChangeCategoryStatus(sessionId);

  const registerOperation = useCallback(
    (operation: CategoryOperation) => {
      if (sessionId === null || operation.sessionId !== sessionId || !isCurrentSession(sessionId)) {
        return;
      }

      operationUuidsById.current.set(operation.id, operation.uuid);
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

      const uuid = operationUuidsById.current.get(operationId);
      if (uuid !== undefined) {
        statusLocks.current.delete(uuid);
        operationUuidsById.current.delete(operationId);
      }

      setOperations((current) => current.filter((operation) => operation.id !== operationId));
    },
    [sessionId],
  );

  const getOperationForCategory = useCallback(
    (uuid: string) => operations.find((operation) => operation.uuid === uuid),
    [operations],
  );

  const checkUncertainStatus = useCallback(
    async (operationId: string, uuid: string) => {
      if (sessionId === null || !isCurrentSession(sessionId) || checksInFlight.current.has(uuid)) {
        return undefined;
      }

      checksInFlight.current.add(uuid);
      setOperationPhase(operationId, "checking");

      try {
        const detailKey = categoryDetailQueryKey(sessionId, uuid);
        await queryClient.cancelQueries({ queryKey: detailKey, exact: true });
        if (!isCurrentSession(sessionId)) {
          return;
        }

        const observedCategory = await queryClient.fetchQuery({
          queryKey: detailKey,
          queryFn: ({ signal }) => getCategory({ uuid }, signal),
          staleTime: 0,
          retry: false,
        });

        if (!isCurrentSession(sessionId)) {
          return;
        }

        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["categories", "management-list", sessionId],
          }),
          queryClient.invalidateQueries({
            queryKey: ["categories", "active-list", sessionId],
            refetchType: "none",
          }),
        ]);

        if (isCurrentSession(sessionId)) {
          setOperationPhase(operationId, "confirmed");
          return observedCategory;
        }

        return undefined;
      } catch (error: unknown) {
        if (isCurrentSession(sessionId)) {
          setOperationPhase(
            operationId,
            isCategoryNotFoundError(error) ? "not-found" : "check-failed",
          );
        }

        return undefined;
      } finally {
        checksInFlight.current.delete(uuid);
      }
    },
    [queryClient, sessionId, setOperationPhase],
  );

  const retryStatusCheck = useCallback(
    async (operationId: string) => {
      if (sessionId === null || !isCurrentSession(sessionId)) {
        return undefined;
      }

      const operation = operations.find(
        (candidate) => candidate.id === operationId && candidate.sessionId === sessionId,
      );
      if (operation?.phase !== "check-failed") {
        return undefined;
      }

      return checkUncertainStatus(operation.id, operation.uuid);
    },
    [checkUncertainStatus, operations, sessionId],
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

      let preserveOperation = false;

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
      } catch (error: unknown) {
        if (isUncertainCategoryMutationError(error) || isCategoryResponseContractError(error)) {
          preserveOperation = true;
          setOperationPhase(operationId, "uncertain");
          const observedCategory = await checkUncertainStatus(operationId, uuid);
          if (observedCategory?.isActive === requestedIsActive) {
            throw new CategoryStatusCheckCompletedError(observedCategory);
          }
        }

        throw error;
      } finally {
        if (!preserveOperation) {
          removeOperation(operationId);
        }
      }
    },
    [
      checkUncertainStatus,
      operations,
      registerOperation,
      removeOperation,
      sessionId,
      setOperationPhase,
      mutateStatus,
    ],
  );

  const contextValue = useMemo(
    () => ({
      operations,
      registerOperation,
      setOperationPhase,
      removeOperation,
      getOperationForCategory,
      retryStatusCheck,
      requestStatusChange,
    }),
    [
      operations,
      registerOperation,
      setOperationPhase,
      removeOperation,
      getOperationForCategory,
      retryStatusCheck,
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
