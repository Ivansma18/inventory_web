import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { DataTable } from "@/shared/ui";
import type {
  DataTableColumn,
  DataTableProps,
  DataTableResult,
  DataTableSort,
  DataTableSnapshot,
} from "@/shared/ui";

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

const inventorySnapshot: DataTableSnapshot<InventoryRow> = {
  page: 1,
  rows: inventoryRows,
  total: 2,
};

const inventoryColumns: DataTableColumn<InventoryRow>[] = [
  { key: "sku", header: "SKU", sortable: true },
  { key: "name", header: "Producto", sortable: true },
  {
    key: "quantity",
    header: "Cantidad",
    render: (row) => `${row.quantity} unidades`,
    sortable: false,
  },
];

const invalidColumn: DataTableColumn<InventoryRow> = {
  // @ts-expect-error DataTable columns are constrained to keys from their row type.
  key: "missing",
  header: "Dato inexistente",
  sortable: false,
};

void invalidColumn;

// @ts-expect-error DataTable requires a stateful result in its own public contract.
const missingResult: DataTableProps<InventoryRow> = {
  columns: inventoryColumns,
  rowKey: "id",
};

void missingResult;

interface RenderInventoryTableOptions {
  onPageChange?: (page: number) => void;
  onSortChange?: (sort: DataTableSort<InventoryRow> | null) => void;
  pageSize?: number;
  sort?: DataTableSort<InventoryRow> | null;
}

const createInventoryTable = (
  result: DataTableResult<InventoryRow>,
  {
    onPageChange = () => undefined,
    onSortChange = () => undefined,
    pageSize = 2,
    sort = null,
  }: RenderInventoryTableOptions = {},
) => (
  <DataTable
    columns={inventoryColumns}
    onPageChange={onPageChange}
    onSortChange={onSortChange}
    pageSize={pageSize}
    result={result}
    rowKey="id"
    sort={sort}
  />
);

const renderInventoryTable = (
  result: DataTableResult<InventoryRow>,
  options?: RenderInventoryTableOptions,
) => render(createInventoryTable(result, options));

const getSortedHeaderNames = () =>
  screen
    .getAllByRole("columnheader")
    .filter((header) =>
      ["ascending", "descending"].includes(header.getAttribute("aria-sort") ?? ""),
    )
    .map((header) => header.textContent);

describe("DataTable", () => {
  it("renders typed row values under its own column headers", () => {
    const result: DataTableResult<InventoryRow> = {
      ...inventorySnapshot,
      status: "ready",
    };

    renderInventoryTable(result);

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
    const columns: DataTableColumn<InventoryRow>[] = [
      { key: "name", header: "Nombre", sortable: true },
    ];
    const { rerender } = render(
      <DataTable
        columns={columns}
        onPageChange={() => undefined}
        onSortChange={() => undefined}
        pageSize={2}
        result={{ status: "ready", rows, page: 1, total: 2 }}
        rowKey="id"
        sort={null}
      />,
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
        onPageChange={() => undefined}
        onSortChange={() => undefined}
        pageSize={2}
        result={{ status: "ready", rows: [rows[1], rows[0]], page: 1, total: 2 }}
        rowKey="id"
        sort={null}
      />,
    );

    expect(getBodyRowNames()).toEqual(["Beta", "Alpha"]);
  });

  it("identifies initial loading without presenting an empty state", () => {
    renderInventoryTable({ status: "loading" });

    expect(screen.getByRole("status")).toHaveTextContent("Cargando datos...");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("No hay datos para mostrar.")).not.toBeInTheDocument();
  });

  it("shows the empty state only after an empty successful result", () => {
    renderInventoryTable({ status: "ready", rows: [], page: 0, total: 0 });

    expect(screen.getByRole("status")).toHaveTextContent("No hay datos para mostrar.");
    expect(screen.getByText("0 de 0 páginas")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous page/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /next page/i })).toBeDisabled();
  });

  it("discards the previous snapshot when an empty result succeeds", () => {
    const onPageChange = vi.fn();
    const { rerender } = renderInventoryTable(
      { status: "loading", snapshot: inventorySnapshot },
      { onPageChange },
    );

    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();

    rerender(
      <DataTable
        columns={inventoryColumns}
        onPageChange={onPageChange}
        onSortChange={() => undefined}
        pageSize={2}
        result={{ status: "ready", rows: [], page: 0, total: 0 }}
        rowKey="id"
        sort={null}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No hay datos para mostrar.");
    expect(screen.getByText("0 de 0 páginas")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("cell", { name: "SKU-01" })).not.toBeInTheDocument();
    expect(onPageChange).not.toHaveBeenCalled();
  });

  it("identifies an initial error without showing an empty state", () => {
    renderInventoryTable({ status: "error", message: "No se pudo cargar el inventario." });

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar el inventario.");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText("No hay datos para mostrar.")).not.toBeInTheDocument();
  });

  it("uses a safe fallback when an error message is blank", () => {
    renderInventoryTable({ status: "error", message: "   " });

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar los datos.");
  });

  it("keeps the last successful rows visible with a loading status", () => {
    renderInventoryTable({ status: "loading", snapshot: inventorySnapshot });

    expect(screen.getByRole("status")).toHaveTextContent("Actualizando datos...");
    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Keyboard" })).toBeInTheDocument();
  });

  it("keeps the last successful rows visible when an update fails", () => {
    renderInventoryTable({
      status: "error",
      message: "No se pudo actualizar el inventario.",
      snapshot: inventorySnapshot,
    });

    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo actualizar el inventario.");
    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Keyboard" })).toBeInTheDocument();
  });

  it("requests one-based page changes while the consumer controls the visible page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    renderInventoryTable(
      { status: "ready", rows: inventoryRows, page: 2, total: 10 },
      { onPageChange },
    );

    expect(screen.getByText("Página 2 de 5")).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    const pageThreeButton = screen
      .getAllByRole("button")
      .find((button) => button.textContent?.trim() === "3");
    expect(pageThreeButton).toBeDefined();
    if (!pageThreeButton) {
      throw new Error("The third page control should be available.");
    }

    await user.click(pageThreeButton);

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(screen.getByText("Página 2 de 5")).toBeInTheDocument();
  });

  it("blocks requests before the first page and allows the next page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    renderInventoryTable(
      { status: "ready", rows: inventoryRows, page: 1, total: 6 },
      { onPageChange },
    );

    const previousPage = screen.getByRole("button", { name: /previous page/i });
    expect(previousPage).toBeDisabled();
    await user.click(previousPage);
    expect(onPageChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /next page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("blocks requests after the last page and allows the previous page", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();

    renderInventoryTable(
      { status: "ready", rows: inventoryRows, page: 3, total: 6 },
      { onPageChange },
    );

    const nextPage = screen.getByRole("button", { name: /next page/i });
    expect(nextPage).toBeDisabled();
    await user.click(nextPage);
    expect(onPageChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /previous page/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("cycles a controlled column through ascending, descending, and no sort", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const rows = [inventoryRows[1], inventoryRows[0]];
    const result: DataTableResult<InventoryRow> = {
      status: "ready",
      rows,
      page: 1,
      total: 2,
    };
    const { rerender } = renderInventoryTable(result, { onSortChange });

    await user.click(screen.getByRole("columnheader", { name: "Producto" }));

    expect(onSortChange).toHaveBeenNthCalledWith(1, { columnId: "name", direction: "asc" });
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(["SKU-02Mouse8 unidades", "SKU-01Keyboard12 unidades"]);

    rerender(
      createInventoryTable(result, {
        onSortChange,
        sort: { columnId: "name", direction: "asc" },
      }),
    );
    expect(screen.getByRole("columnheader", { name: "Producto" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    await user.click(screen.getByRole("columnheader", { name: "Producto" }));
    expect(onSortChange).toHaveBeenNthCalledWith(2, { columnId: "name", direction: "desc" });

    rerender(
      createInventoryTable(result, {
        onSortChange,
        sort: { columnId: "name", direction: "desc" },
      }),
    );
    expect(screen.getByRole("columnheader", { name: "Producto" })).toHaveAttribute(
      "aria-sort",
      "descending",
    );

    await user.click(screen.getByRole("columnheader", { name: "Producto" }));
    expect(onSortChange).toHaveBeenNthCalledWith(3, null);

    rerender(createInventoryTable(result, { onSortChange, sort: null }));
    expect(getSortedHeaderNames()).toEqual([]);
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.textContent),
    ).toEqual(["SKU-02Mouse8 unidades", "SKU-01Keyboard12 unidades"]);
  });

  it("starts a new sortable column ascending and keeps only that column active", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const result: DataTableResult<InventoryRow> = {
      status: "ready",
      rows: inventoryRows,
      page: 1,
      total: 2,
    };
    const { rerender } = renderInventoryTable(result, {
      onSortChange,
      sort: { columnId: "name", direction: "desc" },
    });

    await user.click(screen.getByRole("columnheader", { name: "Cantidad" }));
    expect(onSortChange).not.toHaveBeenCalled();

    await user.click(screen.getByRole("columnheader", { name: "SKU" }));
    expect(onSortChange).toHaveBeenCalledTimes(1);
    expect(onSortChange).toHaveBeenCalledWith({ columnId: "sku", direction: "asc" });

    rerender(
      createInventoryTable(result, {
        onSortChange,
        sort: { columnId: "sku", direction: "asc" },
      }),
    );

    expect(screen.getByRole("columnheader", { name: "SKU" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(getSortedHeaderNames()).toEqual(["SKU"]);
  });

  it("requests the last valid page once and keeps rows visible during correction", () => {
    const onPageChange = vi.fn();
    const updatedOnPageChange = vi.fn();
    const { rerender } = render(
      <StrictMode>
        <DataTable
          columns={inventoryColumns}
          onPageChange={onPageChange}
          onSortChange={() => undefined}
          pageSize={2}
          result={{ status: "ready", rows: inventoryRows, page: 7, total: 6 }}
          rowKey="id"
          sort={null}
        />
      </StrictMode>,
    );

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(onPageChange).toHaveBeenCalledWith(3);
    expect(screen.getByRole("status")).toHaveTextContent("Ajustando página...");
    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Keyboard" })).toBeInTheDocument();

    rerender(
      <StrictMode>
        <DataTable
          columns={inventoryColumns}
          onPageChange={updatedOnPageChange}
          onSortChange={() => undefined}
          pageSize={2}
          result={{
            status: "loading",
            snapshot: { rows: inventoryRows, page: 7, total: 6 },
          }}
          rowKey="id"
          sort={null}
        />
      </StrictMode>,
    );

    expect(onPageChange).toHaveBeenCalledTimes(1);
    expect(updatedOnPageChange).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Ajustando página...");
    expect(screen.getByRole("cell", { name: "SKU-01" })).toBeInTheDocument();

    rerender(
      <StrictMode>
        <DataTable
          columns={inventoryColumns}
          onPageChange={updatedOnPageChange}
          onSortChange={() => undefined}
          pageSize={2}
          result={{ status: "ready", rows: [inventoryRows[1]], page: 3, total: 6 }}
          rowKey="id"
          sort={null}
        />
      </StrictMode>,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Página 3 de 3")).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "Mouse" })).toBeInTheDocument();
  });
});
