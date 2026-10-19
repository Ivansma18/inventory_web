import "./product-list.page.css";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { Badge, Button, DataTable, Dialog, Input, Select, useToast } from "@/shared/ui";
import type {
  DataTableColumn,
  DataTableResult,
  DataTableSnapshot,
  SelectOption,
} from "@/shared/ui";

import type { Product } from "../api/product-contract";
import { ProductPageShell } from "../components/product-page-shell";
import { ProductStatusAction } from "../components/product-status-action";
import {
  useChangeProductStatus,
  usePendingProductStatusUuids,
} from "../hooks/use-change-product-status";
import {
  isProductForbiddenError,
  isProductNotFoundError,
  isProductResponseContractError,
  isProductUnauthorizedError,
  isUncertainProductMutationError,
} from "../utils/product-api-errors";
import { formatProductPrice } from "../utils/product-price";
import {
  buildProductListQuery,
  isProductListSortField,
  PRODUCT_LIST_PAGE_SIZE,
  productListQueryKey,
  productListQueryPrefix,
  useProductList,
  type ProductListCriteria,
} from "../hooks/use-product-list";
import {
  parseProductListUrlState,
  serializeProductListUrlState,
  type ProductListUrlState,
} from "../utils/product-list-url-state";
import { buildProductEditLocation } from "../utils/product-edit-return-to";

const productColumns: DataTableColumn<Product>[] = [
  { key: "sku", header: "SKU", sortable: true },
  { key: "name", header: "Nombre", sortable: true },
  {
    key: "purchasePrice",
    header: "Precio de compra",
    render: (product) => formatProductPrice(product.purchasePrice),
    sortable: true,
  },
  {
    key: "salePrice",
    header: "Precio de venta",
    render: (product) => formatProductPrice(product.salePrice),
    sortable: true,
  },
  {
    key: "isActive",
    header: "Estado",
    render: (product) => (
      <Badge
        label={product.isActive ? "Activo" : "Inactivo"}
        tone={product.isActive ? "success" : "neutral"}
      />
    ),
    sortable: false,
  },
];

const statusOptions: SelectOption[] = [
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
];

const sortOptions = [
  { label: "Nombre", value: "name" },
  { label: "SKU", value: "sku" },
  { label: "Precio de compra", value: "purchasePrice" },
  { label: "Precio de venta", value: "salePrice" },
  { label: "Fecha de creación", value: "createdAt" },
  { label: "Fecha de actualización", value: "updatedAt" },
] satisfies SelectOption[];

const orderOptions: SelectOption[] = [
  { label: "Ascendente", value: "asc" },
  { label: "Descendente", value: "desc" },
];

const getProductListFocusFallback = () => {
  const heading = document.getElementById("product-page-heading");

  if (!heading) {
    throw new Error("The product list heading is required to restore focus after confirmation.");
  }

  return heading;
};

type ProductStatusFailureReason =
  "not-found" | "forbidden" | "uncertain" | "invalid-response" | "other";

interface ProductStatusFailure {
  productUuid: string;
  reason: ProductStatusFailureReason;
}

export const ProductListPage = () => {
  const session = useSession();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const [statusConfirmationProduct, setStatusConfirmationProduct] = useState<Product | null>(null);
  const [statusFailure, setStatusFailure] = useState<ProductStatusFailure | null>(null);
  const statusSubmissionLock = useRef(new Set<string>());
  const requestStatusChange = useCallback((product: Product) => {
    setStatusFailure(null);
    setStatusConfirmationProduct(product);
  }, []);
  const [searchParams, setSearchParams] = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const urlState = useMemo(
    () => parseProductListUrlState(new URLSearchParams(serializedSearchParams)),
    [serializedSearchParams],
  );
  const { page, criteria, needsNormalization } = urlState;
  const [searchDraftState, setSearchDraftState] = useState(() => ({
    searchParams: serializedSearchParams,
    value: criteria.search,
  }));
  let searchDraft = searchDraftState.value;
  if (searchDraftState.searchParams !== serializedSearchParams) {
    searchDraft = criteria.search;
    setSearchDraftState({ searchParams: serializedSearchParams, value: criteria.search });
  }
  const pendingPageCorrection = useRef<number | null>(null);
  const appliedSearch = criteria.search.trim();
  const hasAppliedSearch = appliedSearch.length > 0;
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const productList = useProductList(sessionId, page, criteria);
  const changeStatusMutation = useChangeProductStatus(sessionId);
  const pendingProductUuids = usePendingProductStatusUuids(sessionId);
  const statusLockKey = (uuid: string) => `${sessionId ?? "no-session"}:${uuid}`;
  const statusFailureForConfirmation =
    statusConfirmationProduct !== null &&
    statusFailure?.productUuid === statusConfirmationProduct.uuid
      ? statusFailure
      : null;
  const closeStatusConfirmation = useCallback(() => {
    const productWasNotFound = statusFailureForConfirmation?.reason === "not-found";
    setStatusFailure(null);
    setStatusConfirmationProduct(null);

    if (productWasNotFound && sessionId !== null) {
      void queryClient.invalidateQueries({ queryKey: productListQueryPrefix(sessionId) });
    }
  }, [queryClient, sessionId, statusFailureForConfirmation]);
  const statusProductIsAvailable =
    statusConfirmationProduct !== null &&
    (productList.data?.data.some(
      (product) =>
        product.uuid === statusConfirmationProduct.uuid &&
        product.isActive === statusConfirmationProduct.isActive,
    ) ??
      false);
  const canRetryStatusChange =
    statusFailureForConfirmation !== null &&
    statusFailureForConfirmation.reason !== "not-found" &&
    statusFailureForConfirmation.reason !== "forbidden" &&
    statusProductIsAvailable;
  const isConfirmationPending =
    statusConfirmationProduct !== null &&
    pendingProductUuids.includes(statusConfirmationProduct.uuid);
  const confirmStatusChange = () => {
    const product = statusConfirmationProduct;

    if (product === null || sessionId === null) {
      return;
    }

    const productIsAvailable =
      productList.data?.data.some(
        (listedProduct) =>
          listedProduct.uuid === product.uuid && listedProduct.isActive === product.isActive,
      ) ?? false;

    if (!productIsAvailable || (statusFailureForConfirmation !== null && !canRetryStatusChange)) {
      return;
    }

    const lockKey = statusLockKey(product.uuid);
    if (statusSubmissionLock.current.has(lockKey) || pendingProductUuids.includes(product.uuid)) {
      return;
    }

    statusSubmissionLock.current.add(lockKey);
    setStatusFailure(null);
    void changeStatusMutation
      .mutateAsync({
        uuid: product.uuid,
        isActive: !product.isActive,
        sessionId,
      })
      .then(() => {
        setStatusConfirmationProduct((currentProduct) =>
          currentProduct?.uuid === product.uuid ? null : currentProduct,
        );
        toast.show({
          kind: "success",
          message: product.isActive
            ? "Producto desactivado correctamente."
            : "Producto activado correctamente.",
        });
      })
      .catch(async (error: unknown) => {
        if (isProductUnauthorizedError(error)) {
          const refreshedSession = await session.refetch();
          if (sessionId !== null && refreshedSession.data?.data.session.id === sessionId) {
            toast.show({
              kind: "error",
              message:
                "La sesión se verificó, pero no se confirmó el resultado del cambio de estado. Comprueba el estado del producto antes de volver a intentarlo.",
            });
          }
          return;
        }

        const reason = isProductNotFoundError(error)
          ? "not-found"
          : isProductForbiddenError(error)
            ? "forbidden"
            : isProductResponseContractError(error)
              ? "invalid-response"
              : isUncertainProductMutationError(error)
                ? "uncertain"
                : "other";

        if (reason === "not-found" && sessionId !== null) {
          void queryClient.invalidateQueries({
            queryKey: productListQueryPrefix(sessionId),
            refetchType: "none",
          });
        }

        setStatusFailure({
          productUuid: product.uuid,
          reason,
        });
      })
      .finally(() => statusSubmissionLock.current.delete(lockKey));
  };
  useEffect(() => {
    if (needsNormalization) {
      setSearchParams(serializeProductListUrlState(urlState), { replace: true });
    }
  }, [needsNormalization, setSearchParams, urlState]);

  const snapshot: DataTableSnapshot<Product> | undefined = productList.data
    ? {
        rows: productList.data.data,
        total: productList.data.pagination.total,
        page: productList.data.pagination.page,
      }
    : undefined;
  const result: DataTableResult<Product> = productList.isFetching
    ? { status: "loading", ...(snapshot ? { snapshot } : {}) }
    : productList.isPending
      ? { status: "loading" }
      : productList.isError
        ? {
            status: "error",
            message: "No se pudieron cargar los productos.",
            ...(snapshot ? { snapshot } : {}),
          }
        : snapshot
          ? { status: "ready", ...snapshot }
          : { status: "loading" };

  const hasEmptyResult =
    productList.isSuccess &&
    productList.data.data.length === 0 &&
    productList.data.pagination.total === 0;
  const navigateToListState = (nextState: ProductListUrlState, replace = false) => {
    const nextSearchParams = serializeProductListUrlState(nextState);
    if (nextSearchParams.toString() !== serializedSearchParams) {
      setSearchParams(nextSearchParams, { replace });
    }
  };
  const updateCriteria = (updates: Partial<ProductListCriteria>) => {
    const nextCriteria = { ...criteria, ...updates };
    const criteriaChanged =
      nextCriteria.search !== criteria.search ||
      nextCriteria.status !== criteria.status ||
      nextCriteria.sort !== criteria.sort ||
      nextCriteria.order !== criteria.order;

    if (criteriaChanged) {
      navigateToListState({ page: 1, criteria: nextCriteria });
    }
  };
  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateCriteria({ search: searchDraft.trim() });
  };
  const clearSearch = () => {
    setSearchDraftState({ searchParams: serializedSearchParams, value: "" });
    updateCriteria({ search: "" });
  };
  const updateSearchDraft = (value: string) => {
    setSearchDraftState({ searchParams: serializedSearchParams, value });
  };
  const updateTableSort = (nextSort: { columnId: string; direction: "asc" | "desc" } | null) => {
    if (nextSort === null) {
      updateCriteria({ sort: "name", order: "asc" });
    } else if (isProductListSortField(nextSort.columnId)) {
      updateCriteria({ sort: nextSort.columnId, order: nextSort.direction });
    }
  };
  const changePage = (nextPage: number) => {
    if (pendingPageCorrection.current === nextPage) {
      pendingPageCorrection.current = null;
      return;
    }

    navigateToListState({ page: nextPage, criteria });
  };
  const correctPage = (correctedPage: number) => {
    pendingPageCorrection.current = correctedPage;
    navigateToListState({ page: correctedPage, criteria }, true);
    if (sessionId !== null) {
      void queryClient.invalidateQueries({
        queryKey: productListQueryKey(sessionId, buildProductListQuery(criteria, correctedPage)),
        exact: true,
      });
    }
  };
  const tableSort = { columnId: criteria.sort, direction: criteria.order } as const;
  const sourceListUrl = `/products?${serializeProductListUrlState(urlState).toString()}`;
  const columns = useMemo<DataTableColumn<Product>[]>(
    () => [
      ...productColumns,
      {
        key: "uuid",
        header: "Acciones",
        render: (product) => (
          <div className="product-list__row-actions">
            <Button
              onClick={() => navigate(buildProductEditLocation(product.uuid, sourceListUrl))}
              variant="secondary"
            >
              Editar
            </Button>
            <ProductStatusAction
              onRequestChange={requestStatusChange}
              product={product}
              sessionId={sessionId}
            />
          </div>
        ),
        sortable: false,
      },
    ],
    [navigate, requestStatusChange, sessionId, sourceListUrl],
  );

  return (
    <ProductPageShell contentWidth="wide" description="Catálogo de productos" title="Productos">
      <form className="product-list__filters" onSubmit={applySearch}>
        <div className="product-list__search">
          <Input
            helpText="Busca por SKU o nombre."
            label="Buscar productos"
            onValueChange={updateSearchDraft}
            type="search"
            value={searchDraft}
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </div>
        <Select
          label="Estado del producto"
          onValueChange={(value) => {
            if (value === "active" || value === "inactive") {
              updateCriteria({ status: value });
            }
          }}
          options={statusOptions}
          value={criteria.status}
        />
        <Select
          label="Ordenar por"
          onValueChange={(value) => {
            if (value !== null && isProductListSortField(value)) {
              updateCriteria({ sort: value });
            }
          }}
          options={sortOptions}
          value={criteria.sort}
        />
        <Select
          label="Dirección del orden"
          onValueChange={(value) => {
            if (value === "asc" || value === "desc") {
              updateCriteria({ order: value });
            }
          }}
          options={orderOptions}
          value={criteria.order}
        />
      </form>
      {productList.isSuccess ? (
        <p className="product-list__summary" role="status">
          {productList.data.pagination.total} producto
          {productList.data.pagination.total === 1 ? "" : "s"}
        </p>
      ) : null}
      <DataTable
        columns={columns}
        emptyAction={
          hasEmptyResult && hasAppliedSearch ? (
            <Button onClick={clearSearch} variant="secondary">
              Limpiar búsqueda
            </Button>
          ) : undefined
        }
        emptyMessage={
          hasAppliedSearch
            ? "No se encontraron productos con esta búsqueda."
            : "No hay productos activos para mostrar."
        }
        onPageChange={changePage}
        onPageCorrection={correctPage}
        onSortChange={updateTableSort}
        pageSize={PRODUCT_LIST_PAGE_SIZE}
        result={result}
        rowKey="uuid"
        sort={tableSort}
      />
      <Dialog
        fallbackFocusTarget={getProductListFocusFallback}
        footer={
          statusConfirmationProduct ? (
            <div className="product-list__status-confirmation-actions">
              <Button onClick={closeStatusConfirmation} variant="secondary">
                {isConfirmationPending
                  ? "Cerrar"
                  : statusFailureForConfirmation?.reason === "not-found"
                    ? "Volver al listado"
                    : "Cancelar"}
              </Button>
              {statusFailureForConfirmation === null || canRetryStatusChange ? (
                <Button loading={isConfirmationPending} onClick={confirmStatusChange}>
                  {isConfirmationPending
                    ? statusConfirmationProduct.isActive
                      ? "Desactivando…"
                      : "Activando…"
                    : canRetryStatusChange
                      ? "Reintentar"
                      : statusConfirmationProduct.isActive
                        ? "Desactivar"
                        : "Activar"}
                </Button>
              ) : null}
            </div>
          ) : undefined
        }
        onCloseRequest={closeStatusConfirmation}
        open={statusConfirmationProduct !== null}
        title={
          statusFailureForConfirmation?.reason === "not-found"
            ? "Producto no encontrado"
            : statusConfirmationProduct?.isActive
              ? "Confirmar desactivación"
              : "Confirmar activación"
        }
      >
        {statusConfirmationProduct ? (
          <div className="product-list__status-confirmation">
            {statusFailureForConfirmation?.reason === "not-found" ? null : (
              <>
                <p>
                  ¿Quieres {statusConfirmationProduct.isActive ? "desactivar" : "activar"} el
                  producto <strong>{statusConfirmationProduct.name}</strong> (SKU{" "}
                  <strong>{statusConfirmationProduct.sku}</strong>)?
                </p>
                {statusConfirmationProduct.isActive ? (
                  <p>El producto se conservará en el catálogo; desactivarlo no lo elimina.</p>
                ) : null}
              </>
            )}
            {isConfirmationPending ? (
              <p aria-atomic="true" className="product-list__status-pending" role="status">
                {statusConfirmationProduct.isActive ? "Desactivando" : "Activando"} producto{" "}
                {statusConfirmationProduct.sku}…
              </p>
            ) : null}
            {statusFailureForConfirmation !== null ? (
              <p className="product-list__status-error" role="alert">
                {statusFailureForConfirmation.reason === "forbidden"
                  ? "No tienes permiso para cambiar el estado de este producto."
                  : statusFailureForConfirmation.reason === "not-found"
                    ? "No se encontró el producto. El listado se actualizará al volver."
                    : statusFailureForConfirmation.reason === "invalid-response"
                      ? "La respuesta del cambio de estado no se pudo validar. Comprueba el estado del producto antes de volver a intentarlo."
                      : statusFailureForConfirmation.reason === "uncertain"
                        ? "No se pudo confirmar el resultado del cambio de estado. Comprueba el estado del producto antes de volver a intentarlo."
                        : canRetryStatusChange
                          ? "No se pudo cambiar el estado del producto. Puedes intentarlo de nuevo."
                          : "No se pudo cambiar el estado del producto y ya no está disponible para esta operación."}
              </p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
      {productList.isError ? (
        <div className="product-list__retry">
          <Button
            loading={productList.isFetching}
            onClick={() => void productList.refetch()}
            variant="secondary"
          >
            Reintentar
          </Button>
        </div>
      ) : null}
    </ProductPageShell>
  );
};
