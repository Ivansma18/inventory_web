import "./data-table.css";

import { Column as PrimeColumn } from "primereact/column";
import { DataTable as PrimeDataTable } from "primereact/datatable";
import { Paginator as PrimePaginator } from "primereact/paginator";
import { useEffect, useRef, type ReactNode } from "react";

const PAGINATOR_TEMPLATE = "PrevPageLink PageLinks NextPageLink CurrentPageReport";
const PAGE_REPORT_TEMPLATE = "Página {currentPage} de {totalPages}";
const EMPTY_PAGE_REPORT = "0 de 0 páginas";

export interface DataTableColumn<Row extends object> {
  key: Extract<keyof Row, string>;
  header: string;
  render?: (row: Row) => ReactNode;
  sortable: boolean;
}

export type DataTableSortDirection = "asc" | "desc";

export interface DataTableSort<Row extends object> {
  columnId: Extract<keyof Row, string>;
  direction: DataTableSortDirection;
}

export interface DataTableSnapshot<Row extends object> {
  page: number;
  rows: Row[];
  total: number;
}

export type DataTableResult<Row extends object> =
  | ({ status: "ready" } & DataTableSnapshot<Row>)
  | { status: "loading"; snapshot?: DataTableSnapshot<Row> }
  | { status: "error"; message: string; snapshot?: DataTableSnapshot<Row> };

export interface DataTableProps<Row extends object> {
  columns: DataTableColumn<Row>[];
  onPageChange: (page: number) => void;
  onSortChange: (sort: DataTableSort<Row> | null) => void;
  pageSize: number;
  result: DataTableResult<Row>;
  rowKey: Extract<keyof Row, string>;
  sort: DataTableSort<Row> | null;
}

export const DataTable = <Row extends object>({
  columns,
  onPageChange,
  onSortChange,
  pageSize,
  result,
  rowKey,
  sort,
}: DataTableProps<Row>) => {
  const snapshot = result.status === "ready" ? result : result.snapshot;
  const rows = snapshot?.rows ?? [];
  const hasRows = rows.length > 0;
  const isLoading = result.status === "loading";
  const isEmpty = result.status === "ready" && rows.length === 0;
  const currentPage = snapshot?.page ?? 1;
  const total = snapshot?.total ?? 0;
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  const activeSort =
    sort && columns.some((column) => column.key === sort.columnId && column.sortable) ? sort : null;
  const sortOrder = activeSort ? (activeSort.direction === "asc" ? 1 : -1) : undefined;
  const isCorrectingPage = totalPages > 0 && currentPage > totalPages;
  const errorMessage =
    result.status === "error" ? result.message.trim() || "No se pudieron cargar los datos." : null;
  const correctionKey = useRef<string | null>(null);

  useEffect(() => {
    if (!isCorrectingPage) {
      correctionKey.current = null;
      return;
    }

    const currentCorrectionKey = `${currentPage}:${total}:${pageSize}`;
    if (correctionKey.current === currentCorrectionKey) {
      return;
    }

    correctionKey.current = currentCorrectionKey;
    onPageChange(totalPages);
  }, [currentPage, isCorrectingPage, onPageChange, pageSize, total, totalPages]);

  const handlePage = (event: { first: number }) => {
    if (pageSize <= 0) {
      return;
    }

    const requestedPage = Math.floor(event.first / pageSize) + 1;
    if (requestedPage >= 1 && requestedPage <= totalPages && requestedPage !== currentPage) {
      onPageChange(requestedPage);
    }
  };

  const handleSort = (event: { sortField: string | null }) => {
    if (event.sortField === null) {
      if (activeSort) {
        onSortChange(null);
      }

      return;
    }

    const column = columns.find(
      (candidate) => candidate.key === event.sortField && candidate.sortable,
    );
    if (!column) {
      return;
    }

    const nextSort: DataTableSort<Row> | null =
      activeSort?.columnId !== column.key
        ? { columnId: column.key, direction: "asc" }
        : activeSort.direction === "asc"
          ? { columnId: column.key, direction: "desc" }
          : null;

    onSortChange(nextSort);
  };

  return (
    <div className="ui-data-table-viewport">
      {isLoading || isCorrectingPage ? (
        <p
          aria-atomic="true"
          className="ui-data-table__feedback ui-data-table__feedback--loading"
          role="status"
        >
          {isCorrectingPage
            ? "Ajustando página..."
            : hasRows
              ? "Actualizando datos..."
              : "Cargando datos..."}
        </p>
      ) : null}
      {errorMessage ? (
        <p className="ui-data-table__feedback ui-data-table__feedback--error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {isEmpty ? (
        <p
          aria-atomic="true"
          className="ui-data-table__feedback ui-data-table__feedback--empty"
          role="status"
        >
          No hay datos para mostrar.
        </p>
      ) : null}
      {hasRows ? (
        <div aria-busy={isLoading || isCorrectingPage} className="ui-data-table__content">
          <PrimeDataTable
            alwaysShowPaginator
            className="ui-data-table"
            dataKey={rowKey}
            first={Math.max(0, (currentPage - 1) * pageSize)}
            lazy
            onPage={handlePage}
            onSort={handleSort}
            paginator={!isCorrectingPage}
            paginatorTemplate={PAGINATOR_TEMPLATE}
            currentPageReportTemplate={PAGE_REPORT_TEMPLATE}
            removableSort
            rows={pageSize}
            sortField={activeSort?.columnId}
            sortMode="single"
            sortOrder={sortOrder}
            totalRecords={total}
            value={rows as unknown as Array<Record<string, unknown>>}
          >
            {columns.map((column) => (
              <PrimeColumn
                body={column.render}
                field={column.key}
                header={column.header}
                key={column.key}
                sortable={column.sortable}
              />
            ))}
          </PrimeDataTable>
        </div>
      ) : null}
      {isEmpty && total === 0 ? (
        <PrimePaginator
          alwaysShow
          className="ui-data-table__paginator"
          currentPageReportTemplate={EMPTY_PAGE_REPORT}
          first={0}
          onPageChange={handlePage}
          rows={pageSize}
          template={PAGINATOR_TEMPLATE}
          totalRecords={0}
        />
      ) : null}
    </div>
  );
};
