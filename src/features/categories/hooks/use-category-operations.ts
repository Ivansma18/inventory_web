import { useContext } from "react";

import { CategoryOperationsContext } from "../providers/category-operations.context";
import type { CategoryOperationsContextValue } from "../providers/category-operations.context";

export const useCategoryOperations = (): CategoryOperationsContextValue => {
  const context = useContext(CategoryOperationsContext);
  if (context === null) {
    throw new Error("useCategoryOperations must be used within CategoryOperationsProvider.");
  }

  return context;
};
