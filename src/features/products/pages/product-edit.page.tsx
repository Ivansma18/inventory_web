import "./product-edit.page.css";

import { useNavigate, useParams, useSearchParams } from "react-router";

import { useSession } from "@/features/auth";
import { Button } from "@/shared/ui";

import { productUuidSchema } from "../api/product-contract";
import { ProductEditForm } from "../components/product-edit-form";
import { ProductPageShell } from "../components/product-page-shell";
import { useProduct } from "../hooks/use-product";
import type { ProductEditNavigationIntegration } from "../types/product-edit-navigation";
import {
  DEFAULT_PRODUCT_LIST_RETURN_TO,
  parseProductEditReturnTo,
} from "../utils/product-edit-return-to";

const getHttpErrorStatus = (error: unknown): number | null => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("kind" in error) ||
    error.kind !== "http" ||
    !("status" in error) ||
    typeof error.status !== "number"
  ) {
    return null;
  }

  return error.status;
};

const isNetworkError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "kind" in error && error.kind === "network";

const isRetryableProductLoadError = (error: unknown): boolean => {
  if (isNetworkError(error)) {
    return true;
  }

  const status = getHttpErrorStatus(error);
  return status !== null && status >= 500 && status < 600;
};

export interface ProductEditPageProps {
  navigation?: ProductEditNavigationIntegration;
}

export const ProductEditPage = ({ navigation }: ProductEditPageProps = {}) => {
  const { uuid = "" } = useParams();
  const [searchParams] = useSearchParams();
  const session = useSession();
  const navigate = useNavigate();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const productQuery = useProduct(sessionId, uuid);
  const validUuid = productUuidSchema.safeParse(uuid).success;
  const returnTo =
    navigation?.resolveReturnTo(searchParams) ??
    parseProductEditReturnTo(searchParams.get("returnTo")) ??
    DEFAULT_PRODUCT_LIST_RETURN_TO;
  const isNotFound = getHttpErrorStatus(productQuery.error) === 404;
  const canRetry = isRetryableProductLoadError(productQuery.error);
  const returnToList = () => navigate(returnTo);

  return (
    <ProductPageShell
      description="Consulta y edita la información del producto."
      title="Editar producto"
    >
      {!validUuid ? (
        <div className="product-edit-page__feedback">
          <p className="product-edit-page__error" role="alert">
            La dirección del producto no es válida.
          </p>
          <div className="product-edit-page__actions">
            <Button onClick={returnToList} variant="secondary">
              Volver al listado
            </Button>
          </div>
        </div>
      ) : productQuery.isPending ? (
        <p aria-live="polite" className="product-edit-page__status" role="status">
          Cargando datos del producto…
        </p>
      ) : productQuery.isError ? (
        <div className="product-edit-page__feedback">
          <p className="product-edit-page__error" role="alert">
            {isNotFound
              ? "No se encontró el producto."
              : canRetry
                ? "No se pudo cargar el producto por un problema de conexión o del servidor."
                : "No se pudieron cargar los datos del producto."}
          </p>
          {canRetry && productQuery.isFetching ? (
            <p className="product-edit-page__status" role="status">
              Reintentando la carga del producto…
            </p>
          ) : null}
          <div className="product-edit-page__actions">
            <Button onClick={returnToList} variant="secondary">
              Volver al listado
            </Button>
            {canRetry ? (
              <Button
                loading={productQuery.isFetching}
                onClick={() => void productQuery.refetch()}
                variant="secondary"
              >
                Reintentar
              </Button>
            ) : null}
          </div>
        </div>
      ) : productQuery.data ? (
        <ProductEditForm
          key={productQuery.data.uuid}
          product={productQuery.data}
          returnTo={returnTo}
          sessionId={sessionId}
        />
      ) : null}
    </ProductPageShell>
  );
};
