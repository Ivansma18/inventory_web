import "./data-table.css";

import { Column as PrimeColumn } from "primereact/column";
import { DataTable as PrimeDataTable } from "primereact/datatable";
import type { ReactNode } from "react";

export interface DataTableColumn<Row extends object> {
  key: Extract<keyof Row, string>;
  header: string;
  render?: (row: Row) => ReactNode;
}

export type DataTableResult<Row extends object> =
  | { status: "ready"; rows: Row[] }
  | { status: "loading"; snapshot?: Row[] }
  | { status: "error"; message: string; snapshot?: Row[] };

export interface DataTableProps<Row extends object> {
  columns: DataTableColumn<Row>[];
  result: DataTableResult<Row>;
  rowKey: Extract<keyof Row, string>;
}

export const DataTable = <Row extends object>({ columns, result, rowKey }: DataTableProps<Row>) => {
  const rows = result.status === "ready" ? result.rows : (result.snapshot ?? []);
  const hasRows = rows.length > 0;
  const isLoading = result.status === "loading";
  const isEmpty = result.status === "ready" && rows.length === 0;
  const errorMessage =
    result.status === "error" ? result.message.trim() || "No se pudieron cargar los datos." : null;

  return (
    <div className="ui-data-table-viewport">
      {isLoading ? (
        <p
          aria-atomic="true"
          className="ui-data-table__feedback ui-data-table__feedback--loading"
          role="status"
        >
          {hasRows ? "Actualizando datos..." : "Cargando datos..."}
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
        <div aria-busy={isLoading} className="ui-data-table__content">
          <PrimeDataTable
            className="ui-data-table"
            dataKey={rowKey}
            value={rows as unknown as Array<Record<string, unknown>>}
          >
            {columns.map((column) => (
              <PrimeColumn
                body={column.render}
                field={column.key}
                header={column.header}
                key={column.key}
              />
            ))}
          </PrimeDataTable>
        </div>
      ) : null}
    </div>
  );
};
