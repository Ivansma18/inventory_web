import "./inventory-page.css";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation, useSearchParams } from "react-router";

import { useSession } from "@/features/auth";
import { Badge, Button, DataTable, Input, Select } from "@/shared/ui";
import type { DataTableColumn, DataTableResult, DataTableSort, SelectOption } from "@/shared/ui";

import type { Inventory } from "../api/inventory-contract";
import { StockStatusBadge } from "../components/stock-status-badge";
import { useInventoryList } from "../hooks/use-inventory-list";
import { isRetryableInventoryListError } from "../utils/inventory-list-errors";
import {
  isInventoryListSortField,
  INVENTORY_LIST_PAGE_SIZE,
  parseInventoryListUrlState,
  serializeInventoryListUrlState,
} from "../utils/inventory-list-url-state";
import type {
  InventoryListCriteria,
  InventoryListUrlState,
} from "../utils/inventory-list-url-state";

const inventoryActivityOptions: SelectOption[] = [
  { label: "Activos", value: "active" },
  { label: "Inactivos", value: "inactive" },
];

const inventoryStockStatusOptions: SelectOption[] = [
  { label: "Todos los estados", value: "all" },
  { label: "Con existencias", value: "IN_STOCK" },
  { label: "Stock bajo", value: "LOW_STOCK" },
  { label: "Sin existencias", value: "OUT_OF_STOCK" },
];

const inventorySortOptions: SelectOption[] = [
  { label: "Nombre", value: "name" },
  { label: "SKU", value: "sku" },
  { label: "Existencias actuales", value: "quantity" },
  { label: "Existencias mínimas", value: "minimumStock" },
  { label: "Fecha de actualización", value: "updatedAt" },
];

const inventoryOrderOptions: SelectOption[] = [
  { label: "Ascendente", value: "asc" },
  { label: "Descendente", value: "desc" },
];

interface InventorySearchDraftState {
  serializedSearchParams: string;
  value: string;
}

export const InventoryPage = () => {
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingPageCorrection = useRef<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const serializedSearchParams = searchParams.toString();
  const urlState = useMemo(
    () => parseInventoryListUrlState(new URLSearchParams(serializedSearchParams)),
    [serializedSearchParams],
  );
  const { page, criteria, needsNormalization } = urlState;
  const [searchDraftState, setSearchDraftState] = useState<InventorySearchDraftState>(() => ({
    serializedSearchParams,
    value: criteria.search,
  }));
  let searchDraft = searchDraftState.value;
  if (searchDraftState.serializedSearchParams !== serializedSearchParams) {
    searchDraft = criteria.search;
    setSearchDraftState({ serializedSearchParams, value: criteria.search });
  }
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const inventoryList = useInventoryList(sessionId, page, criteria);

  const columns = useMemo<DataTableColumn<Inventory>[]>(
    () => [
      { key: "name", header: "Producto", sortable: true },
      { key: "sku", header: "SKU", sortable: true },
      {
        key: "quantity",
        header: "Existencias actuales",
        render: (item) => String(item.quantity),
        sortable: true,
      },
      {
        key: "minimumStock",
        header: "Mínimo de existencias",
        render: (item) => String(item.minimumStock),
        sortable: true,
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
  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [pathname]);
  useEffect(() => {
    if (needsNormalization) {
      setSearchParams(serializeInventoryListUrlState(urlState), { replace: true });
    }
  }, [needsNormalization, setSearchParams, urlState]);

  const navigateToListState = (nextState: InventoryListUrlState, replace = false) => {
    const nextSearchParams = serializeInventoryListUrlState(nextState);
    if (nextSearchParams.toString() !== serializedSearchParams) {
      setSearchParams(nextSearchParams, { replace });
    }
  };

  const navigateToPage = (nextPage: number, replace = false) => {
    navigateToListState({ page: nextPage, criteria }, replace);
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

  const updateCriteria = (updates: Partial<InventoryListCriteria>, forcePageReset = false) => {
    const nextCriteria = { ...criteria, ...updates };
    const hasChanged =
      nextCriteria.search !== criteria.search ||
      nextCriteria.status !== criteria.status ||
      nextCriteria.stockStatus !== criteria.stockStatus ||
      nextCriteria.sort !== criteria.sort ||
      nextCriteria.order !== criteria.order;

    if (!hasChanged && (!forcePageReset || page === 1)) {
      return;
    }

    navigateToListState({ page: 1, criteria: nextCriteria });
  };

  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = searchDraft.trim();
    setSearchDraftState({ serializedSearchParams, value: search });
    updateCriteria({ search }, true);
  };

  const updateSearchDraft = (value: string) => {
    setSearchDraftState({ serializedSearchParams, value });
  };

  const clearSearch = () => {
    setSearchDraftState({ serializedSearchParams, value: "" });
    updateCriteria({ search: "" }, true);
  };
  const updateTableSort = (nextSort: DataTableSort<Inventory> | null) => {
    if (nextSort === null) {
      updateCriteria({ sort: "name", order: "asc" });
    } else if (isInventoryListSortField(nextSort.columnId)) {
      updateCriteria({ sort: nextSort.columnId, order: nextSort.direction });
    }
  };
  const tableSort: DataTableSort<Inventory> = {
    columnId: criteria.sort,
    direction: criteria.order,
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
      <form
        aria-label="Buscar y filtrar inventario"
        className="inventory-page__filters"
        onSubmit={applySearch}
        role="search"
      >
        <div className="inventory-page__search">
          <Input
            helpText="Busca por parte del nombre o SKU; no distingue mayúsculas."
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
          label="Actividad del producto"
          onValueChange={(value) => {
            if (value === "active" || value === "inactive") {
              updateCriteria({ status: value });
            }
          }}
          options={inventoryActivityOptions}
          value={criteria.status}
        />
        <Select
          label="Estado de existencias"
          onValueChange={(value) => {
            if (
              value === "all" ||
              value === "IN_STOCK" ||
              value === "LOW_STOCK" ||
              value === "OUT_OF_STOCK"
            ) {
              updateCriteria({ stockStatus: value });
            }
          }}
          options={inventoryStockStatusOptions}
          value={criteria.stockStatus}
        />
        <Select
          label="Ordenar por"
          onValueChange={(value) => {
            if (value !== null && isInventoryListSortField(value)) {
              updateCriteria({ sort: value });
            }
          }}
          options={inventorySortOptions}
          value={criteria.sort}
        />
        <Select
          label="Dirección del orden"
          onValueChange={(value) => {
            if (value === "asc" || value === "desc") {
              updateCriteria({ order: value });
            }
          }}
          options={inventoryOrderOptions}
          value={criteria.order}
        />
      </form>
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
        onSortChange={updateTableSort}
        pageSize={INVENTORY_LIST_PAGE_SIZE}
        result={result}
        rowKey="productUuid"
        sort={tableSort}
      />
    </section>
  );
};
