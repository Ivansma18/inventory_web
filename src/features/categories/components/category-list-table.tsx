import "./category-list-table.css";

import { useMemo, useState } from "react";

import { Badge, Button, DataTable, Dialog } from "@/shared/ui";
import type { DataTableColumn, DataTableResult } from "@/shared/ui";

import { CATEGORY_LIST_PAGE_SIZE } from "../api/categories-api";
import type { Category } from "../api/category-contract";
import type { CategoryListCriteria } from "../utils/category-list-url-state";

const getCategoryListFocusFallback = (): HTMLElement => {
  const heading = document.getElementById("category-page-heading");
  if (!heading) {
    throw new Error("The category page heading is required to restore focus after confirmation.");
  }

  return heading;
};

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
  const [categoryToConfirm, setCategoryToConfirm] = useState<Category | null>(null);
  const columns = useMemo<DataTableColumn<Category>[]>(
    () => [
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
      {
        key: "uuid",
        header: "Acciones",
        render: (category) => (
          <div className="category-list-table__row-actions">
            <Button onClick={() => setCategoryToConfirm(category)} variant="secondary">
              {category.isActive ? "Desactivar" : "Activar"}
            </Button>
          </div>
        ),
        sortable: false,
      },
    ],
    [],
  );
  const closeStatusConfirmation = () => setCategoryToConfirm(null);
  const confirmStatusChange = () => setCategoryToConfirm(null);

  return (
    <>
      <DataTable
        allowHorizontalScroll
        columns={columns}
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
      <Dialog
        fallbackFocusTarget={getCategoryListFocusFallback}
        footer={
          categoryToConfirm ? (
            <div className="category-list-table__status-confirmation-actions">
              <Button onClick={closeStatusConfirmation} variant="secondary">
                Cancelar
              </Button>
              <Button onClick={confirmStatusChange}>
                {categoryToConfirm.isActive ? "Desactivar" : "Activar"}
              </Button>
            </div>
          ) : undefined
        }
        onCloseRequest={closeStatusConfirmation}
        open={categoryToConfirm !== null}
        title={categoryToConfirm?.isActive ? "Confirmar desactivación" : "Confirmar activación"}
      >
        {categoryToConfirm ? (
          <div className="category-list-table__status-confirmation">
            <p>
              ¿Quieres {categoryToConfirm.isActive ? "desactivar" : "activar"} la categoría{" "}
              <strong>{categoryToConfirm.name}</strong>?
            </p>
            {categoryToConfirm.isActive ? (
              <p>La categoría se conservará en el catálogo; desactivarla no la elimina.</p>
            ) : null}
          </div>
        ) : null}
      </Dialog>
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
