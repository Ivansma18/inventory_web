import "./category-list-table.css";

import { useCallback, useMemo, useState } from "react";

import { Badge, Button, DataTable, Dialog } from "@/shared/ui";
import type { DataTableColumn, DataTableResult } from "@/shared/ui";

import { CATEGORY_LIST_PAGE_SIZE } from "../api/categories-api";
import type { Category } from "../api/category-contract";
import { useCategoryOperations } from "../hooks/use-category-operations";
import { CategoryStatusCheckCompletedError } from "../providers/category-operations.context";
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
  onRetryStatusCheck: (operationId: string) => void;
  onRefreshList: () => void;
  onRequestStatusChange: (category: Category) => void;
}

interface CategoryStatusFeedback {
  kind: "alert" | "status";
  message: string;
  canRetryManually: boolean;
}

const CategoryListRowActions = ({
  category,
  onEditCategory,
  onRetryStatusCheck,
  onRefreshList,
  onRequestStatusChange,
}: CategoryListRowActionsProps) => {
  const { getOperationForCategory } = useCategoryOperations();
  const operation = getOperationForCategory(category.uuid);
  const isPending = operation?.phase === "pending" || operation?.phase === "checking";
  const isCheckFailed = operation?.phase === "check-failed";
  const isNotFound = operation?.phase === "not-found";

  return (
    <div className="category-list-table__row-actions">
      <Button
        disabled={operation?.phase === "pending" || isNotFound}
        onClick={() => onEditCategory(category)}
        variant="secondary"
      >
        Editar
      </Button>
      <Button
        disabled={operation !== undefined && !isPending && !isCheckFailed && !isNotFound}
        loading={isPending}
        onClick={() => {
          if (isCheckFailed && operation) {
            onRetryStatusCheck(operation.id);
            return;
          }

          if (isNotFound) {
            onRefreshList();
            return;
          }

          onRequestStatusChange(category);
        }}
        variant="secondary"
      >
        {isCheckFailed
          ? "Reintentar comprobación"
          : isNotFound
            ? "Actualizar listado"
            : operation?.phase === "checking"
              ? "Comprobando estado…"
              : category.isActive
                ? "Desactivar"
                : "Activar"}
      </Button>
      {isCheckFailed ? (
        <p className="category-list-table__row-status-error" role="alert">
          No se pudo comprobar el estado. Reintenta la consulta para habilitar el cambio.
        </p>
      ) : isNotFound ? (
        <p className="category-list-table__row-status-error" role="alert">
          No se encontró la categoría. Actualiza el listado antes de continuar.
        </p>
      ) : null}
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
  onRetry: () => Promise<unknown> | void;
  onRetryStatusCheck: (operationId: string) => void;
  checkingCategoryUuids: readonly string[];
  notFoundCategoryUuids: readonly string[];
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
  onRetryStatusCheck,
  checkingCategoryUuids,
  notFoundCategoryUuids,
  pendingCategoryUuids,
  result,
}: CategoryListTableProps) => {
  const hasAppliedSearch = criteria.search.trim().length > 0;
  const [categoryToConfirm, setCategoryToConfirm] = useState<Category | null>(null);
  const [statusError, setStatusError] = useState<CategoryStatusFeedback | null>(null);
  const [retryingCategoryUuid, setRetryingCategoryUuid] = useState<string | null>(null);
  const [isReturningToList, setIsReturningToList] = useState(false);
  const openStatusConfirmation = useCallback((category: Category) => {
    setStatusError(null);
    setCategoryToConfirm(category);
  }, []);
  const closeStatusConfirmation = useCallback(() => setCategoryToConfirm(null), []);
  const returnToUpdatedList = useCallback(async () => {
    setIsReturningToList(true);
    try {
      await onRetry();
    } finally {
      setStatusError(null);
      setCategoryToConfirm(null);
      setIsReturningToList(false);
    }
  }, [onRetry]);
  const confirmStatusChange = useCallback(async () => {
    const category = categoryToConfirm;
    if (
      category === null ||
      pendingCategoryUuids.includes(category.uuid) ||
      notFoundCategoryUuids.includes(category.uuid)
    ) {
      return;
    }

    if (result.status === "ready") {
      const currentCategory = result.rows.find(
        (listedCategory) => listedCategory.uuid === category.uuid,
      );

      if (!currentCategory) {
        setStatusError({
          kind: "alert",
          message:
            "La categoría ya no aparece en la consulta actual. Se actualizará el listado; comprueba su disponibilidad antes de iniciar otra acción.",
          canRetryManually: false,
        });
        void onRetry();
        return;
      }

      if (currentCategory.isActive !== category.isActive) {
        setStatusError({
          kind: "alert",
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
      if (error instanceof CategoryStatusCheckCompletedError) {
        setStatusError({ kind: "status", message: error.message, canRetryManually: false });
      } else if (isCategoryHasAssociatedProductsError(error)) {
        setStatusError({
          kind: "alert",
          message: categoryHasAssociatedProductsMessage,
          canRetryManually: false,
        });
      } else if (isCategoryForbiddenError(error)) {
        setStatusError({
          kind: "alert",
          message: categoryStatusForbiddenMessage,
          canRetryManually: false,
        });
      } else if (isCategoryRateLimitedError(error)) {
        setStatusError({
          kind: "alert",
          message: categoryStatusRateLimitedMessage,
          canRetryManually: true,
        });
      } else {
        setStatusError({
          kind: "alert",
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
    notFoundCategoryUuids,
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
            onRetryStatusCheck={onRetryStatusCheck}
            onRefreshList={() => void onRetry()}
            onRequestStatusChange={openStatusConfirmation}
          />
        ),
        sortable: false,
      },
    ],
    [onEditCategory, onRetry, onRetryStatusCheck, openStatusConfirmation],
  );
  const isStatusPending =
    categoryToConfirm !== null && pendingCategoryUuids.includes(categoryToConfirm.uuid);
  const isStatusChecking =
    categoryToConfirm !== null && checkingCategoryUuids.includes(categoryToConfirm.uuid);
  const isCategoryNotFound =
    categoryToConfirm !== null && notFoundCategoryUuids.includes(categoryToConfirm.uuid);
  const visibleRows = result.status === "ready" ? result.rows : (result.snapshot?.rows ?? []);
  const hasNotFoundCategoryOutsideCurrentQuery =
    categoryToConfirm === null &&
    notFoundCategoryUuids.some(
      (uuid) => !visibleRows.some((listedCategory) => listedCategory.uuid === uuid),
    );
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
              {isCategoryNotFound ? (
                <Button loading={isReturningToList} onClick={() => void returnToUpdatedList()}>
                  {isReturningToList ? "Actualizando listado…" : "Volver al listado"}
                </Button>
              ) : null}
              {!isCategoryNotFound ? (
                <>
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
                </>
              ) : null}
            </div>
          ) : undefined
        }
        onCloseRequest={closeStatusConfirmation}
        open={categoryToConfirm !== null}
        title={
          isCategoryNotFound
            ? "Categoría no encontrada"
            : categoryToConfirm?.isActive
              ? "Confirmar desactivación"
              : "Confirmar activación"
        }
      >
        {categoryToConfirm ? (
          <div className="category-list-table__status-confirmation">
            {isCategoryNotFound ? (
              <p role="alert">
                No se encontró la categoría <strong>{categoryToConfirm.name}</strong>. No se puede
                confirmar su estado y no se volverá a enviar el cambio.
              </p>
            ) : null}
            {!isCategoryNotFound ? (
              <>
                <p>
                  ¿Quieres {categoryToConfirm.isActive ? "desactivar" : "activar"} la categoría{" "}
                  <strong>{categoryToConfirm.name}</strong>?
                </p>
                {categoryToConfirm.isActive ? (
                  <p>La categoría se conservará en el catálogo; desactivarla no la elimina.</p>
                ) : null}
                {isStatusPending ? (
                  <p role="status">
                    {isStatusChecking
                      ? "Comprobando el estado vigente de la categoría…"
                      : isManualRetryPending
                        ? "Reintentando el cambio de estado…"
                        : "Actualizando el estado de la categoría…"}
                  </p>
                ) : null}
                {isStatusChecking ? (
                  <p role="alert">
                    No se pudo confirmar el cambio de estado. Se está comprobando el estado vigente
                    antes de permitir otro cambio.
                  </p>
                ) : statusError ? (
                  <p role={statusError.kind}>{statusError.message}</p>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </Dialog>
      {hasNotFoundCategoryOutsideCurrentQuery ? (
        <div className="category-list-table__not-found-return" role="alert">
          <p>
            La categoría comprobada ya no aparece en esta consulta. Actualiza el listado para
            confirmar los resultados vigentes.
          </p>
          <Button onClick={() => void onRetry()} variant="secondary">
            Actualizar listado
          </Button>
        </div>
      ) : null}
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
