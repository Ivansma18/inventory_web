import { ProductResponseContractError } from "../api/product-contract";

interface ProductHttpError {
  status: number;
  code?: string;
}

const getProductHttpError = (error: unknown): ProductHttpError | undefined => {
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

export const isDuplicateProductSkuError = (error: unknown): boolean => {
  const httpError = getProductHttpError(error);
  return httpError?.status === 409 && httpError.code === "PRODUCT_SKU_ALREADY_EXISTS";
};

export const isProductForbiddenError = (error: unknown): boolean =>
  getProductHttpError(error)?.status === 403;

export const isProductUnauthorizedError = (error: unknown): boolean =>
  getProductHttpError(error)?.status === 401;

export const isUncertainProductMutationError = (error: unknown): boolean => {
  if (typeof error === "object" && error !== null && "kind" in error && error.kind === "network") {
    return true;
  }

  const status = getProductHttpError(error)?.status;
  return status !== undefined && status >= 500 && status < 600;
};

export const isProductResponseContractError = (error: unknown): boolean =>
  error instanceof ProductResponseContractError;

export const productSkuConflictMessage =
  "Este SKU ya está registrado. Desactivar un producto no libera su SKU; comprueba el valor e inténtalo con otro.";
