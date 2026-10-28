import "./inventory-page.css";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router";

import { useSession } from "@/features/auth";
import { Button, DataTable, Badge } from "@/shared/ui";
import type { DataTableColumn, DataTableResult } from "@/shared/ui";

import type { Inventory } from "../api/inventory-contract";
import { StockStatusBadge } from "../components/stock-status-badge";
import { useInventoryList } from "../hooks/use-inventory-list";
import { isRetryableInventoryListError } from "../utils/inventory-list-errors";
import {
  INVENTORY_LIST_PAGE_SIZE,
  parseInventoryListUrlState,
  serializeInventoryListUrlState,
} from "../utils/inventory-list-url-state";

export const InventoryPage = () => {
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingPageCorrection = useRef<number | null>(null);
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
  const hasAppliedSearch = criteria.search.trim().length > 0;
  const clearSearch = () => {
    setSearchParams(
      serializeInventoryListUrlState({
        page: 1,
        criteria: { ...criteria, search: "" },
      }),
    );
  };

  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const navigateToPage = (nextPage: number, replace = false) => {
    const nextSearchParams = serializeInventoryListUrlState({ page: nextPage, criteria });
    if (nextSearchParams.toString() !== serializedSearchParams) {
      setSearchParams(nextSearchParams, { replace });
    }
  };

  const changePage = (nextPage: number) => {
    if (pendingPageCorrection.current === nextPage) {
      pendingPageCorrection.current = null;
      return;
    }

    if (nextPage === page) {
      return;
    }

    navigateToPage(nextPage);
  };

  const correctPage = (correctedPage: number) => {
    pendingPageCorrection.current = correctedPage;
    navigateToPage(correctedPage, true);
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
        emptyAction={
          hasAppliedSearch ? (
            <Button onClick={clearSearch} variant="secondary">
              Limpiar búsqueda
            </Button>
          ) : undefined
        }
        emptyMessage={
          hasAppliedSearch
            ? "No se encontraron productos con esta búsqueda."
            : "No hay productos de inventario para mostrar."
        }
        errorAction={
          inventoryList.isError && isRetryableInventoryListError(inventoryList.error) ? (
            <Button onClick={() => void inventoryList.refetch()} variant="secondary">
              Reintentar consulta
            </Button>
          ) : undefined
        }
        onPageChange={changePage}
        onPageCorrection={correctPage}
        onSortChange={() => undefined}
        pageSize={INVENTORY_LIST_PAGE_SIZE}
        result={result}
        rowKey="productUuid"
        sort={null}
      />
    </section>
  );
};
