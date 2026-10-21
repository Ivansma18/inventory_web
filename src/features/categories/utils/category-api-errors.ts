interface CategoryHttpError {
  status: number;
  code?: string;
}

const getCategoryHttpError = (error: unknown): CategoryHttpError | undefined => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("kind" in error) ||
    error.kind !== "http" ||
    !("status" in error) ||
    typeof error.status !== "number"
  ) {
    return undefined;
  }

  return {
    status: error.status,
    ...("code" in error && typeof error.code === "string" ? { code: error.code } : {}),
  };
};

export const isDuplicateCategoryNameError = (error: unknown): boolean => {
  const httpError = getCategoryHttpError(error);
  return httpError?.status === 409 && httpError.code === "CATEGORY_NAME_ALREADY_EXISTS";
};

export const categoryNameConflictMessage =
  "Ya existe una categoría con este nombre. Elige otro nombre.";
