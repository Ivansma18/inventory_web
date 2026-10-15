import "./product-list.page.css";

import { useState, type FormEvent } from "react";
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
  DEFAULT_PRODUCT_LIST_CRITERIA,
  PRODUCT_LIST_PAGE_SIZE,
  productListQueryKey,
  useProductList,
  type ProductListCriteria,
  type ProductListSortField,
} from "../hooks/use-product-list";

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

const isProductSortField = (value: string): value is ProductListSortField =>
  sortOptions.some((option) => option.value === value);

export const ProductListPage = () => {
  const session = useSession();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const [criteria, setCriteria] = useState<ProductListCriteria>(() => ({
    ...DEFAULT_PRODUCT_LIST_CRITERIA,
    search: searchParams.get("search") ?? "",
  }));
  const [searchDraft, setSearchDraft] = useState(() => searchParams.get("search") ?? "");
  const appliedSearch = criteria.search.trim();
  const hasAppliedSearch = appliedSearch.length > 0;
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const productList = useProductList(sessionId, page, criteria);

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
  const updateCriteria = (updates: Partial<ProductListCriteria>) => {
    setPage(1);
    setCriteria((current) => ({ ...current, ...updates }));
  };
  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateCriteria({ search: searchDraft.trim() });
  };
  const clearSearch = () => {
    setSearchDraft("");
    updateCriteria({ search: "" });
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("search");
      return next;
    });
  };
  const updateTableSort = (nextSort: { columnId: string; direction: "asc" | "desc" } | null) => {
    if (nextSort === null) {
      updateCriteria({ sort: "name", order: "asc" });
    } else if (isProductSortField(nextSort.columnId)) {
      updateCriteria({ sort: nextSort.columnId, order: nextSort.direction });
    }
  };
  const correctPage = (correctedPage: number) => {
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
            onValueChange={setSearchDraft}
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
            if (value !== null && isProductSortField(value)) {
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
        onPageChange={setPage}
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
