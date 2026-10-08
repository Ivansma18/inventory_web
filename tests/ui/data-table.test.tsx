import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "@/shared/ui";
import type { DataTableColumn, DataTableProps, DataTableResult } from "@/shared/ui";

interface InventoryRow {
  id: string;
  sku: string;
  name: string;
  quantity: number;
}

const inventoryRows: InventoryRow[] = [
  { id: "product-1", sku: "SKU-01", name: "Keyboard", quantity: 12 },
  { id: "product-2", sku: "SKU-02", name: "Mouse", quantity: 8 },
];

const inventoryColumns: DataTableColumn<InventoryRow>[] = [
  { key: "sku", header: "SKU" },
  { key: "name", header: "Producto" },
  { key: "quantity", header: "Cantidad", render: (row) => `${row.quantity} unidades` },
];

const invalidColumn: DataTableColumn<InventoryRow> = {
  // @ts-expect-error DataTable columns are constrained to keys from their row type.
  key: "missing",
  header: "Dato inexistente",
};

void invalidColumn;

// @ts-expect-error DataTable requires a stateful result in its own public contract.
const missingResult: DataTableProps<InventoryRow> = {
  columns: inventoryColumns,
  rowKey: "id",
};

void missingResult;

describe("DataTable", () => {
  it("renders typed row values under its own column headers", () => {
    const result: DataTableResult<InventoryRow> = { status: "ready", rows: inventoryRows };

    render(<DataTable columns={inventoryColumns} result={result} rowKey="id" />);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "SKU" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Producto" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cantidad" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Keyboard" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "12 unidades" })).toBeInTheDocument();
  });

  it("renders rows in the supplied order after data is reordered", () => {
    const rows: InventoryRow[] = [
      { id: "row-a", sku: "SKU-A", name: "Alpha", quantity: 1 },
      { id: "row-b", sku: "SKU-B", name: "Beta", quantity: 2 },
    ];
    const columns: DataTableColumn<InventoryRow>[] = [{ key: "name", header: "Nombre" }];
    const { rerender } = render(
      <DataTable columns={columns} result={{ status: "ready", rows }} rowKey="id" />,
    );

    const getBodyRowNames = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent);
    expect(getBodyRowNames()).toEqual(["Alpha", "Beta"]);

    rerender(
      <DataTable
        columns={columns}
        result={{ status: "ready", rows: [rows[1], rows[0]] }}
        rowKey="id"
      />,
    );

    expect(getBodyRowNames()).toEqual(["Beta", "Alpha"]);
  });

  it("identifies initial loading without presenting an empty state", () => {
    render(<DataTable columns={inventoryColumns} result={{ status: "loading" }} rowKey="id" />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando datos...");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("No hay datos para mostrar.")).not.toBeInTheDocument();
  });

  it("shows the empty state only after an empty successful result", () => {
    render(
      <DataTable columns={inventoryColumns} result={{ status: "ready", rows: [] }} rowKey="id" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No hay datos para mostrar.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("discards the previous snapshot when an empty result succeeds", () => {
    const { rerender } = render(
      <DataTable
        columns={inventoryColumns}
        result={{ status: "loading", snapshot: inventoryRows }}
        rowKey="id"
      />,
    );

    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();

    rerender(
      <DataTable columns={inventoryColumns} result={{ status: "ready", rows: [] }} rowKey="id" />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No hay datos para mostrar.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "SKU-01" })).not.toBeInTheDocument();
  });

  it("identifies an initial error without showing an empty state", () => {
    render(
      <DataTable
        columns={inventoryColumns}
        result={{ status: "error", message: "No se pudo cargar el inventario." }}
        rowKey="id"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el inventario.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("No hay datos para mostrar.")).not.toBeInTheDocument();
  });

  it("uses a safe fallback when an error message is blank", () => {
    render(
      <DataTable
        columns={inventoryColumns}
        result={{ status: "error", message: "   " }}
        rowKey="id"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los datos.");
  });

  it("keeps the last successful rows visible with a loading status", () => {
    render(
      <DataTable
        columns={inventoryColumns}
        result={{ status: "loading", snapshot: inventoryRows }}
        rowKey="id"
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Actualizando datos...");
    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Keyboard" })).toBeInTheDocument();
  });

  it("keeps the last successful rows visible when an update fails", () => {
    render(
      <DataTable
        columns={inventoryColumns}
        result={{
          status: "error",
          message: "No se pudo actualizar el inventario.",
          snapshot: inventoryRows,
        }}
        rowKey="id"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo actualizar el inventario.");
    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Keyboard" })).toBeInTheDocument();
  });
});
