import "./data-table.css";

import { Column as PrimeColumn } from "primereact/column";
import { DataTable as PrimeDataTable } from "primereact/datatable";
import type { ReactNode } from "react";

export interface DataTableColumn<Row extends object> {
  key: Extract<keyof Row, string>;
  header: string;
  render?: (row: Row) => ReactNode;
}

export interface DataTableProps<Row extends object> {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  rowKey: Extract<keyof Row, string>;
}

export const DataTable = <Row extends object>({ rows, columns, rowKey }: DataTableProps<Row>) => (
  <div className="ui-data-table-viewport">
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
);
