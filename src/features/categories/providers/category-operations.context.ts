import { createContext } from "react";

import type { Category } from "../api/category-contract";

export class CategoryStatusCheckCompletedError extends Error {
  constructor(readonly category: Category) {
    super(
      `La categoría "${category.name}" está ${category.isActive ? "activa" : "inactiva"} actualmente. Esta lectura no confirma si la solicitud anterior causó el cambio.`,
    );
    this.name = "CategoryStatusCheckCompletedError";
  }
}

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

export interface CategoryStatusChangeRequest {
  uuid: Category["uuid"];
  previousIsActive: boolean;
  requestedIsActive: boolean;
}

export interface CategoryOperationsContextValue {
  operations: readonly CategoryOperation[];
  registerOperation: (operation: CategoryOperation) => void;
  setOperationPhase: (operationId: string, phase: CategoryOperationPhase) => void;
  removeOperation: (operationId: string) => void;
  getOperationForCategory: (uuid: string) => CategoryOperation | undefined;
  retryStatusCheck: (operationId: string) => Promise<Category | undefined>;
  requestStatusChange: (request: CategoryStatusChangeRequest) => Promise<Category>;
}

export const CategoryOperationsContext = createContext<CategoryOperationsContextValue | null>(null);
