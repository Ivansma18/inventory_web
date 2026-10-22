import "./category-list-table.css";

import { useCallback, useMemo, useState } from "react";

import { Badge, Button, DataTable, Dialog } from "@/shared/ui";
import type { DataTableColumn, DataTableResult } from "@/shared/ui";

import { CATEGORY_LIST_PAGE_SIZE } from "../api/categories-api";
import type { Category } from "../api/category-contract";
import { useCategoryOperations } from "../hooks/use-category-operations";
import {
  categoryHasAssociatedProductsMessage,
  categoryStatusForbiddenMessage,
  categoryStatusRateLimitedMessage,
  isCategoryForbiddenError,
  isCategoryHasAssociatedProductsError,
  isCategoryRateLimitedError,
} from "../utils/category-api-errors";
import type { CategoryListCriteria } from "../utils/category-list-url-state";

const getCategoryListFocusFallback = (): HTMLElement => {
  const heading = document.getElementById("category-page-heading");
  if (!heading) {
    throw new Error("The category page heading is required to restore focus after confirmation.");
  }

  return heading;
};

interface CategoryListRowActionsProps {
  category: Category;
  onEditCategory: (category: Category) => void;
  onRequestStatusChange: (category: Category) => void;
}

interface CategoryStatusFailure {
  message: string;
  canRetryManually: boolean;
}

const CategoryListRowActions = ({
  category,
  onEditCategory,
  onRequestStatusChange,
}: CategoryListRowActionsProps) => {
  const { getOperationForCategory } = useCategoryOperations();
  const isPending = getOperationForCategory(category.uuid)?.phase === "pending";

  return (
    <div className="category-list-table__row-actions">
      <Button disabled={isPending} onClick={() => onEditCategory(category)} variant="secondary">
        Editar
      </Button>
      <Button
        loading={isPending}
        onClick={() => onRequestStatusChange(category)}
        variant="secondary"
      >
        {category.isActive ? "Desactivar" : "Activar"}
      </Button>
    </div>
  );
};

export interface CategoryListTableProps {
  criteria: CategoryListCriteria;
  onClearSearch: () => void;
  onConfirmStatusChange: (category: Category) => Promise<void>;
  onEditCategory: (category: Category) => void;
  onPageChange: (page: number) => void;
  onPageCorrection: (page: number) => void;
  onRetry: () => void;
  pendingCategoryUuids: readonly string[];
  result: DataTableResult<Category>;
}

export const CategoryListTable = ({
  criteria,
  onClearSearch,
  onConfirmStatusChange,
  onEditCategory,
  onPageChange,
  onPageCorrection,
  onRetry,
  pendingCategoryUuids,
  result,
}: CategoryListTableProps) => {
  const hasAppliedSearch = criteria.search.trim().length > 0;
  const [categoryToConfirm, setCategoryToConfirm] = useState<Category | null>(null);
  const [statusError, setStatusError] = useState<CategoryStatusFailure | null>(null);
  const [retryingCategoryUuid, setRetryingCategoryUuid] = useState<string | null>(null);
  const openStatusConfirmation = useCallback((category: Category) => {
    setStatusError(null);
    setCategoryToConfirm(category);
  }, []);
  const closeStatusConfirmation = useCallback(() => setCategoryToConfirm(null), []);
  const confirmStatusChange = useCallback(async () => {
    const category = categoryToConfirm;
    if (category === null || pendingCategoryUuids.includes(category.uuid)) {
      return;
    }

    if (result.status === "ready") {
      const currentCategory = result.rows.find(
        (listedCategory) => listedCategory.uuid === category.uuid,
      );

      if (!currentCategory) {
        setStatusError({
          message:
            "La categoría ya no aparece en la consulta actual. Se actualizará el listado; comprueba su disponibilidad antes de iniciar otra acción.",
          canRetryManually: false,
        });
        void onRetry();
        return;
      }

      if (currentCategory.isActive !== category.isActive) {
        setStatusError({
          message:
            "El estado de la categoría cambió desde que abriste la confirmación. Se actualizará el listado; revisa su estado antes de iniciar otra acción.",
          canRetryManually: false,
        });
        void onRetry();
        return;
      }
    }

    const isManualRetry = statusError?.canRetryManually === true;
    setStatusError(null);
    setRetryingCategoryUuid(isManualRetry ? category.uuid : null);
    try {
      await onConfirmStatusChange(category);
      setStatusError(null);
      setCategoryToConfirm((current) => (current?.uuid === category.uuid ? null : current));
    } catch (error: unknown) {
      if (isCategoryHasAssociatedProductsError(error)) {
        setStatusError({ message: categoryHasAssociatedProductsMessage, canRetryManually: false });
      } else if (isCategoryForbiddenError(error)) {
        setStatusError({ message: categoryStatusForbiddenMessage, canRetryManually: false });
      } else if (isCategoryRateLimitedError(error)) {
        setStatusError({ message: categoryStatusRateLimitedMessage, canRetryManually: true });
      } else {
        setStatusError({
          message:
            "No se pudo confirmar el cambio de estado. Revisa el estado de la categoría antes de volver a intentarlo.",
          canRetryManually: false,
        });
      }
    } finally {
      if (isManualRetry) {
        setRetryingCategoryUuid((current) => (current === category.uuid ? null : current));
      }
    }
  }, [
    categoryToConfirm,
    onConfirmStatusChange,
    onRetry,
    pendingCategoryUuids,
    result,
    statusError,
  ]);
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
          <CategoryListRowActions
            category={category}
            onEditCategory={onEditCategory}
            onRequestStatusChange={openStatusConfirmation}
          />
        ),
        sortable: false,
      },
    ],
    [onEditCategory, openStatusConfirmation],
  );
  const isStatusPending =
    categoryToConfirm !== null && pendingCategoryUuids.includes(categoryToConfirm.uuid);
  const isManualRetryPending =
    categoryToConfirm !== null && retryingCategoryUuid === categoryToConfirm.uuid;
  const canSubmitStatusChange = statusError === null || statusError.canRetryManually;

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
                {isStatusPending || statusError !== null ? "Cerrar" : "Cancelar"}
              </Button>
              {canSubmitStatusChange ? (
                <Button loading={isStatusPending} onClick={() => void confirmStatusChange()}>
                  {statusError?.canRetryManually || isManualRetryPending
                    ? "Reintentar"
                    : categoryToConfirm.isActive
                      ? "Desactivar"
                      : "Activar"}
                </Button>
              ) : null}
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
            {isStatusPending ? (
              <p role="status">
                {isManualRetryPending
                  ? "Reintentando el cambio de estado…"
                  : "Actualizando el estado de la categoría…"}
              </p>
            ) : null}
            {statusError ? <p role="alert">{statusError.message}</p> : null}
          </div>
        ) : null}
      </Dialog>
      {statusError && categoryToConfirm === null ? (
        <p className="category-list-table__status-error" role="alert">
          {statusError.message}
        </p>
      ) : null}
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
