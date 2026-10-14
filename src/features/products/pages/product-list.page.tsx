import "./product-list.page.css";

import { useState } from "react";

import { useSession } from "@/features/auth";
import { Badge, DataTable } from "@/shared/ui";
import type { DataTableColumn, DataTableResult } from "@/shared/ui";

import type { Product } from "../api/product-contract";
import { ProductPageShell } from "../components/product-page-shell";
import { PRODUCT_LIST_PAGE_SIZE, useProductList } from "../hooks/use-product-list";

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
  const [page, setPage] = useState(1);
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const productList = useProductList(sessionId, page);

  const result: DataTableResult<Product> = productList.isPending
    ? { status: "loading" }
    : productList.isError
      ? { status: "error", message: "No se pudieron cargar los productos." }
      : {
          status: "ready",
          rows: productList.data.data,
          total: productList.data.pagination.total,
          page: productList.data.pagination.page,
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
        onPageChange={setPage}
        onSortChange={ignoreSortChange}
        pageSize={PRODUCT_LIST_PAGE_SIZE}
        result={result}
        rowKey="uuid"
        sort={null}
      />
    </ProductPageShell>
  );
};
