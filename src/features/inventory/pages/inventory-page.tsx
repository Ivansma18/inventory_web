import "./inventory-page.css";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router";

import { useSession } from "@/features/auth";
import { DataTable, Badge } from "@/shared/ui";
import type { DataTableColumn, DataTableResult } from "@/shared/ui";

import type { Inventory } from "../api/inventory-contract";
import { StockStatusBadge } from "../components/stock-status-badge";
import { useInventoryList } from "../hooks/use-inventory-list";
import {
  INVENTORY_LIST_PAGE_SIZE,
  parseInventoryListUrlState,
  serializeInventoryListUrlState,
} from "../utils/inventory-list-url-state";

export const InventoryPage = () => {
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const { page, criteria } = useMemo(
    () => parseInventoryListUrlState(new URLSearchParams(serializedSearchParams)),
    [serializedSearchParams],
  );
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const inventoryList = useInventoryList(sessionId, page, criteria);

  const columns = useMemo<DataTableColumn<Inventory>[]>(
    () => [
      { key: "name", header: "Producto", sortable: false },
      { key: "sku", header: "SKU", sortable: false },
      {
        key: "quantity",
        header: "Existencias actuales",
        render: (item) => String(item.quantity),
        sortable: false,
      },
      {
        key: "minimumStock",
        header: "Mínimo de existencias",
        render: (item) => String(item.minimumStock),
        sortable: false,
      },
      {
        key: "isActive",
        header: "Actividad",
        render: (item) => (
          <span className="inventory-page__activity">
            <Badge
              label={item.isActive ? "Activo" : "Inactivo"}
              tone={item.isActive ? "success" : "neutral"}
            />
          </span>
        ),
        sortable: false,
      },
      {
        key: "status",
        header: "Estado de existencias",
        render: (item) => <StockStatusBadge status={item.status} />,
        sortable: false,
      },
    ],
    [],
  );

  const snapshot = inventoryList.data
    ? {
        rows: inventoryList.data.data,
        total: inventoryList.data.pagination.total,
        page,
      }
    : undefined;
  const result: DataTableResult<Inventory> = inventoryList.isFetching
    ? { status: "loading", ...(snapshot ? { snapshot } : {}) }
    : inventoryList.isError
      ? {
          status: "error",
          message: "No se pudo cargar el inventario.",
          ...(snapshot ? { snapshot } : {}),
        }
      : snapshot
        ? { status: "ready", ...snapshot }
        : { status: "loading" };

  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const changePage = (nextPage: number) => {
    if (nextPage === page) {
      return;
    }

    const nextSearchParams = serializeInventoryListUrlState({ page: nextPage, criteria });
    if (nextSearchParams.toString() !== serializedSearchParams) {
      setSearchParams(nextSearchParams);
    }
  };

  return (
    <section aria-labelledby="inventory-page-heading" className="inventory-page">
      <div className="inventory-page__content">
        <h1
          className="inventory-page__heading"
          id="inventory-page-heading"
          ref={headingRef}
          tabIndex={-1}
        >
          Inventario
        </h1>
        <p className="inventory-page__description">
          Consulta las existencias registradas de tus productos.
        </p>
      </div>
      {inventoryList.data ? (
        <p className="inventory-page__summary" role="status">
          {inventoryList.data.pagination.total} producto
          {inventoryList.data.pagination.total === 1 ? "" : "s"}
        </p>
      ) : null}
      <DataTable
        allowHorizontalScroll
        columns={columns}
        onPageChange={changePage}
        onSortChange={() => undefined}
        pageSize={INVENTORY_LIST_PAGE_SIZE}
        result={result}
        rowKey="productUuid"
        sort={null}
      />
    </section>
  );
};
