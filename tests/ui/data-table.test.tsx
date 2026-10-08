import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DataTable } from "@/shared/ui";
import type { DataTableColumn, DataTableProps } from "@/shared/ui";

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

// @ts-expect-error DataTable requires a stable row-key field in its own public contract.
const missingRowKey: DataTableProps<InventoryRow> = {
  rows: inventoryRows,
  columns: inventoryColumns,
};

void missingRowKey;

describe("DataTable", () => {
  it("renders typed row values under its own column headers", () => {
    render(<DataTable columns={inventoryColumns} rowKey="id" rows={inventoryRows} />);

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
    const { rerender } = render(<DataTable columns={columns} rowKey="id" rows={rows} />);

    const getBodyRowNames = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent);
    expect(getBodyRowNames()).toEqual(["Alpha", "Beta"]);

    rerender(<DataTable columns={columns} rowKey="id" rows={[rows[1], rows[0]]} />);

    expect(getBodyRowNames()).toEqual(["Beta", "Alpha"]);
  });
});
