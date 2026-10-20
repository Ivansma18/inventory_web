import "./category-list-table.css";

import { Badge, Button, DataTable } from "@/shared/ui";
import type { DataTableColumn, DataTableResult } from "@/shared/ui";

import { CATEGORY_LIST_PAGE_SIZE } from "../api/categories-api";
import type { Category } from "../api/category-contract";
import type { CategoryListCriteria } from "../utils/category-list-url-state";

const categoryColumns: DataTableColumn<Category>[] = [
  { key: "name", header: "Nombre", sortable: false },
  {
    key: "isActive",
    header: "Estado",
    render: (category) => (
      <span className="category-list-table__status">
        <Badge
          label={category.isActive ? "Activa" : "Inactiva"}
          tone={category.isActive ? "success" : "neutral"}
        />
      </span>
    ),
    sortable: false,
  },
];

export interface CategoryListTableProps {
  criteria: CategoryListCriteria;
  onClearSearch: () => void;
  onPageChange: (page: number) => void;
  onPageCorrection: (page: number) => void;
  onRetry: () => void;
  result: DataTableResult<Category>;
}

export const CategoryListTable = ({
  criteria,
  onClearSearch,
  onPageChange,
  onPageCorrection,
  onRetry,
  result,
}: CategoryListTableProps) => {
  const hasAppliedSearch = criteria.search.trim().length > 0;

  return (
    <>
      <DataTable
        allowHorizontalScroll
        columns={categoryColumns}
        emptyAction={
          hasAppliedSearch ? (
            <Button onClick={onClearSearch} variant="secondary">
              Limpiar búsqueda
            </Button>
          ) : undefined
        }
        emptyMessage={
          hasAppliedSearch
            ? "No se encontraron categorías con esta búsqueda."
            : "No hay categorías para mostrar."
        }
        onPageChange={onPageChange}
        onPageCorrection={onPageCorrection}
        onSortChange={() => {}}
        pageSize={CATEGORY_LIST_PAGE_SIZE}
        result={result}
        rowKey="uuid"
        sort={null}
      />
      {result.status === "error" ? (
        <div className="category-list-table__retry">
          <Button onClick={onRetry} variant="secondary">
            Reintentar
          </Button>
        </div>
      ) : null}
    </>
  );
};
