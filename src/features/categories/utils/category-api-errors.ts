import { CategoryResponseContractError } from "../api/category-contract";

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

export const isInvalidCategoryNameError = (error: unknown): boolean => {
  const httpError = getCategoryHttpError(error);
  return httpError?.status === 400 && httpError.code === "INVALID_CATEGORY_DATA";
};

export const isCategoryValidationError = (error: unknown): boolean => {
  const httpError = getCategoryHttpError(error);
  return httpError?.status === 400 && httpError.code === "VALIDATION_ERROR";
};

export const isCategoryForbiddenError = (error: unknown): boolean =>
  getCategoryHttpError(error)?.status === 403;

export const isCategoryHasAssociatedProductsError = (error: unknown): boolean => {
  const httpError = getCategoryHttpError(error);
  return httpError?.status === 409 && httpError.code === "CATEGORY_HAS_ASSOCIATED_PRODUCTS";
};

export const isCategoryNotFoundError = (error: unknown): boolean => {
  const httpError = getCategoryHttpError(error);
  return httpError?.status === 404 || httpError?.code === "CATEGORY_NOT_FOUND";
};

export const isCategoryUnauthorizedError = (error: unknown): boolean =>
  getCategoryHttpError(error)?.status === 401;

export const isUncertainCategoryMutationError = (error: unknown): boolean => {
  if (typeof error === "object" && error !== null && "kind" in error && error.kind === "network") {
    return true;
  }

  const status = getCategoryHttpError(error)?.status;
  return status !== undefined && status >= 500 && status < 600;
};

export const isCategoryResponseContractError = (error: unknown): boolean =>
  error instanceof CategoryResponseContractError;

export const categoryNameConflictMessage =
  "Ya existe una categoría con este nombre. Elige otro nombre.";

export const invalidCategoryNameMessage = "El nombre no es válido. Revísalo e inténtalo de nuevo.";

export const categoryValidationMessage =
  "El servidor rechazó los datos enviados. Revisa el formulario e inténtalo de nuevo.";

export const categoryHasAssociatedProductsMessage =
  "No se puede desactivar la categoría porque tiene productos asociados. La categoría seguirá activa. Esta acción no reasigna productos.";

export const categoryStatusForbiddenMessage =
  "No tienes permiso para cambiar el estado de esta categoría. No se realizaron cambios.";
