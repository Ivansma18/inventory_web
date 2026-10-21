import { createContext } from "react";

export type CategoryOperationPhase =
  "pending" | "confirmed" | "rejected" | "uncertain" | "checking" | "check-failed" | "not-found";

export interface CategoryOperation {
  readonly id: string;
  readonly sessionId: string;
  readonly uuid: string;
  readonly previousIsActive: boolean;
  readonly requestedIsActive: boolean;
  readonly phase: CategoryOperationPhase;
}

export interface CategoryOperationsContextValue {
  operations: readonly CategoryOperation[];
  registerOperation: (operation: CategoryOperation) => void;
  setOperationPhase: (operationId: string, phase: CategoryOperationPhase) => void;
  removeOperation: (operationId: string) => void;
  getOperationForCategory: (uuid: string) => CategoryOperation | undefined;
}

export const CategoryOperationsContext = createContext<CategoryOperationsContextValue | null>(null);
