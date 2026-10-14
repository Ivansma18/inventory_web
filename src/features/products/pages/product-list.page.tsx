import "./product-list.page.css";

import { useState } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/features/auth";
import { Badge, Button, DataTable } from "@/shared/ui";
import type { DataTableColumn, DataTableResult, DataTableSnapshot } from "@/shared/ui";

import type { Product } from "../api/product-contract";
import { ProductPageShell } from "../components/product-page-shell";
import {
  PRODUCT_LIST_PAGE_SIZE,
  productListQueryKey,
  useProductList,
} from "../hooks/use-product-list";

const currencyFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const productColumns: DataTableColumn<Product>[] = [
  { key: "sku", header: "SKU", sortable: false },
  { key: "name", header: "Nombre", sortable: false },
  {
    key: "purchasePrice",
    header: "Precio de compra",
    render: (product) => currencyFormatter.format(product.purchasePrice),
    sortable: false,
  },
  {
    key: "salePrice",
    header: "Precio de venta",
    render: (product) => currencyFormatter.format(product.salePrice),
    sortable: false,
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

const ignoreSortChange = () => undefined;

export const ProductListPage = () => {
  const session = useSession();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedSearch = searchParams.get("search")?.trim() ?? "";
  const hasAppliedSearch = appliedSearch.length > 0;
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const productList = useProductList(sessionId, page);

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
  const clearSearch = () => {
    setPage(1);
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("search");
      return next;
    });
  };
  const correctPage = (correctedPage: number) => {
    if (sessionId !== null) {
      void queryClient.invalidateQueries({
        queryKey: productListQueryKey(sessionId, correctedPage),
        exact: true,
      });
    }
  };

  return (
    <ProductPageShell contentWidth="wide" description="Catálogo de productos" title="Productos">
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
        onSortChange={ignoreSortChange}
        pageSize={PRODUCT_LIST_PAGE_SIZE}
        result={result}
        rowKey="uuid"
        sort={null}
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
