import "./product-list.page.css";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { Badge, Button, DataTable, Input, Select } from "@/shared/ui";
import type {
  DataTableColumn,
  DataTableResult,
  DataTableSnapshot,
  SelectOption,
} from "@/shared/ui";

import type { Product } from "../api/product-contract";
import { ProductPageShell } from "../components/product-page-shell";
import {
  buildProductListQuery,
  isProductListSortField,
  PRODUCT_LIST_PAGE_SIZE,
  productListQueryKey,
  useProductList,
  type ProductListCriteria,
} from "../hooks/use-product-list";
import {
  parseProductListUrlState,
  serializeProductListUrlState,
  type ProductListUrlState,
} from "../utils/product-list-url-state";

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const productColumns: DataTableColumn<Product>[] = [
  { key: "sku", header: "SKU", sortable: true },
  { key: "name", header: "Nombre", sortable: true },
  {
    key: "purchasePrice",
    header: "Precio de compra",
    render: (product) => currencyFormatter.format(product.purchasePrice),
    sortable: true,
  },
  {
    key: "salePrice",
    header: "Precio de venta",
    render: (product) => currencyFormatter.format(product.salePrice),
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

export const ProductListPage = () => {
  const session = useSession();
  const queryClient = useQueryClient();
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
        <p aria-live="polite" className="product-list__summary">
          {productList.data.pagination.total} producto
          {productList.data.pagination.total === 1 ? "" : "s"}
        </p>
      ) : null}
      <DataTable
        columns={productColumns}
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
