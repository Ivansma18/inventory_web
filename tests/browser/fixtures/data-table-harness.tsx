import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import { DataTable } from "@/shared/ui";
import type { DataTableColumn, DataTableResult, DataTableSort } from "@/shared/ui";

interface DataTableFixtureRow {
  id: string;
  sku: string;
  name: string;
  category: string;
  location: string;
  supplier: string;
  lot: string;
  unit: string;
  status: string;
  reference: string;
}

const PAGE_SIZE = 5;
const fixtureRows: DataTableFixtureRow[] = Array.from({ length: 25 }, (_, index) => ({
  id: `row-${index + 1}`,
  sku: `SKU-${String(index + 1).padStart(2, "0")}`,
  name: ["Zulu", "Delta", "Alpha", "Echo", "Bravo"][index % 5] + ` ${index + 1}`,
  category: `Category ${String(index + 1).padStart(2, "0")}`,
  location: `Warehouse location ${String(index + 1).padStart(2, "0")}`,
  supplier: `Supplier ${String(index + 1).padStart(2, "0")}`,
  lot: `LOT-${String(index + 1).padStart(4, "0")}`,
  unit: `Unit-${index + 1}`,
  status: index % 2 === 0 ? "Available" : "Reserved",
  reference: `REF-${String(index + 1).padStart(6, "0")}`,
}));

const columns: DataTableColumn<DataTableFixtureRow>[] = [
  { key: "sku", header: "SKU", sortable: true },
  { key: "name", header: "Nombre", sortable: true },
  { key: "category", header: "Categoría", sortable: true },
  { key: "location", header: "Ubicación", sortable: true },
  { key: "supplier", header: "Proveedor", sortable: true },
  { key: "lot", header: "Lote", sortable: true },
  { key: "unit", header: "Unidad", sortable: true },
  { key: "status", header: "Estado", sortable: true },
  { key: "reference", header: "Referencia", sortable: true },
];

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("DataTable browser harness root is missing.");
}

const DataTableHarness = () => {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<DataTableSort<DataTableFixtureRow> | null>(null);
  const sortedRows = useMemo(() => {
    if (!sort) {
      return fixtureRows;
    }

    const direction = sort.direction === "asc" ? 1 : -1;
    return [...fixtureRows].sort(
      (left, right) =>
        String(left[sort.columnId]).localeCompare(String(right[sort.columnId])) * direction,
    );
  }, [sort]);
  const result: DataTableResult<DataTableFixtureRow> = {
    status: "ready",
    page,
    rows: sortedRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: sortedRows.length,
  };

  return (
    <main>
      <h1>DataTable de prueba</h1>
      <style>{`.ui-data-table table { min-width: 72rem; }`}</style>
      <DataTable
        columns={columns}
        onPageChange={setPage}
        onSortChange={(nextSort) => {
          setSort(nextSort);
          setPage(1);
        }}
        pageSize={PAGE_SIZE}
        result={result}
        rowKey="id"
        sort={sort}
      />
    </main>
  );
};

createRoot(rootElement).render(<DataTableHarness />);
