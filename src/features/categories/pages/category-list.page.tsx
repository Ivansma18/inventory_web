import "./category-list.page.css";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearchParams } from "react-router";

import { isCurrentSession, useSession } from "@/features/auth";
import { Button, Input, Select, useToast } from "@/shared/ui";
import type { DataTableResult, DataTableSnapshot, SelectOption } from "@/shared/ui";

import type { Category } from "../api/category-contract";
import { CategoryListTable } from "../components/category-list-table";
import { CategoryPageShell } from "../components/category-page-shell";
import { useCategoryOperations } from "../hooks/use-category-operations";
import { useCategoryList } from "../hooks/use-category-list";
import { CategoryStatusCheckCompletedError } from "../providers/category-operations.context";
import {
  categoryHasAssociatedProductsMessage,
  categoryStatusForbiddenMessage,
  isCategoryForbiddenError,
  isCategoryHasAssociatedProductsError,
  isCategoryNotFoundError,
  isCategoryRateLimitedError,
  isCategoryResponseContractError,
  isUncertainCategoryMutationError,
} from "../utils/category-api-errors";
import {
  isCategoryListSortField,
  parseCategoryListUrlState,
  serializeCategoryListUrlState,
  type CategoryListCriteria,
  type CategoryListUrlState,
} from "../utils/category-list-url-state";

const categoryStatusOptions: SelectOption[] = [
  { label: "Activas", value: "active" },
  { label: "Inactivas", value: "inactive" },
];

const categorySortOptions: SelectOption[] = [
  { label: "Nombre", value: "name" },
  { label: "Fecha de creación", value: "createdAt" },
  { label: "Fecha de actualización", value: "updatedAt" },
];

const categoryOrderOptions: SelectOption[] = [
  { label: "Ascendente", value: "asc" },
  { label: "Descendente", value: "desc" },
];

const getConfirmedWriteMessage = (state: unknown, currentLocation: string): string | null => {
  if (
    typeof state !== "object" ||
    state === null ||
    !("categoryWriteConfirmed" in state) ||
    !("categoryWriteLocation" in state) ||
    state.categoryWriteLocation !== currentLocation
  ) {
    return null;
  }

  if (state.categoryWriteConfirmed === "created") {
    return "Categoría creada correctamente.";
  }

  if (state.categoryWriteConfirmed === "updated") {
    return "Categoría actualizada correctamente.";
  }

  return null;
};

const getLateStatusFailureMessage = (error: unknown): string => {
  if (isCategoryHasAssociatedProductsError(error)) {
    return categoryHasAssociatedProductsMessage;
  }

  if (isCategoryForbiddenError(error)) {
    return categoryStatusForbiddenMessage;
  }

  if (isCategoryRateLimitedError(error)) {
    return "El servidor rechazó temporalmente el cambio por límite de solicitudes. Vuelve a Categorías para comprobar su estado e intentarlo de nuevo.";
  }

  if (isCategoryNotFoundError(error)) {
    return "La categoría ya no está disponible. El listado se actualizará al regresar a Categorías.";
  }

  return "No se pudo confirmar el resultado del cambio de estado. Revisa la categoría al regresar a Categorías.";
};

interface CategoryListSearchDraftState {
  serializedSearchParams: string;
  value: string;
}

export const CategoryListPage = () => {
  const session = useSession();
  const queryClient = useQueryClient();
  const location = useLocation();
  const currentLocation = `${location.pathname}${location.search}`;
  const navigate = useNavigate();
  const toast = useToast();
  const { operations, removeOperation, requestStatusChange, retryStatusCheck } =
    useCategoryOperations();
  const isCategoryListMounted = useRef(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusWriteConfirmation, setStatusWriteConfirmation] = useState<{
    message: string;
    location: string;
  } | null>(null);
  const confirmedWriteMessage =
    (statusWriteConfirmation?.location === currentLocation
      ? statusWriteConfirmation.message
      : null) ?? getConfirmedWriteMessage(location.state, currentLocation);
  const serializedSearchParams = searchParams.toString();
  const urlState = useMemo(
    () => parseCategoryListUrlState(new URLSearchParams(serializedSearchParams)),
    [serializedSearchParams],
  );
  const { page, criteria, needsNormalization } = urlState;
  const [searchDraftState, setSearchDraftState] = useState<CategoryListSearchDraftState>(() => ({
    serializedSearchParams,
    value: criteria.search,
  }));
  let searchDraft = searchDraftState.value;
  if (searchDraftState.serializedSearchParams !== serializedSearchParams) {
    searchDraft = criteria.search;
    setSearchDraftState({ serializedSearchParams, value: criteria.search });
  }
  const pendingPageCorrection = useRef<number | null>(null);
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const pendingCategoryUuids = useMemo(
    () =>
      operations
        .filter((operation) => operation.phase === "pending" || operation.phase === "checking")
        .map((operation) => operation.uuid),
    [operations],
  );
  const checkingCategoryUuids = useMemo(
    () =>
      operations
        .filter((operation) => operation.phase === "checking")
        .map((operation) => operation.uuid),
    [operations],
  );
  const notFoundCategoryUuids = useMemo(
    () =>
      operations
        .filter((operation) => operation.phase === "not-found")
        .map((operation) => operation.uuid),
    [operations],
  );
  const categoryList = useCategoryList(sessionId, page, criteria);
  useEffect(() => {
    isCategoryListMounted.current = true;
    return () => {
      isCategoryListMounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (
      sessionId === null ||
      !isCurrentSession(sessionId) ||
      !categoryList.isSuccess ||
      categoryList.isFetching ||
      categoryList.isStale
    ) {
      return;
    }

    for (const operation of operations) {
      if (operation.sessionId === sessionId && operation.phase === "confirmed") {
        removeOperation(operation.id);
      }
    }
  }, [
    categoryList.isFetching,
    categoryList.isStale,
    categoryList.isSuccess,
    operations,
    removeOperation,
    sessionId,
  ]);
  const snapshot: DataTableSnapshot<Category> | undefined = categoryList.data
    ? {
        rows: categoryList.data.data,
        total: categoryList.data.pagination.total,
        page,
      }
    : undefined;
  const result: DataTableResult<Category> = categoryList.isFetching
    ? { status: "loading", ...(snapshot ? { snapshot } : {}) }
    : categoryList.isPending
      ? { status: "loading" }
      : categoryList.isError
        ? {
            status: "error",
            message: "No se pudieron cargar las categorías.",
            ...(snapshot ? { snapshot } : {}),
          }
        : snapshot
          ? { status: "ready", ...snapshot }
          : { status: "loading" };
  useEffect(() => {
    if (needsNormalization) {
      setSearchParams(serializeCategoryListUrlState(urlState), { replace: true });
    }
  }, [needsNormalization, setSearchParams, urlState]);
  const navigateToListState = (nextState: CategoryListUrlState, replace = false) => {
    const nextSearchParams = serializeCategoryListUrlState(nextState);
    if (nextSearchParams.toString() !== serializedSearchParams) {
      setSearchParams(nextSearchParams, { replace });
    }
  };
  const navigateToPage = (nextPage: number, replace = false) => {
    navigateToListState({ page: nextPage, criteria }, replace);
  };
  const changePage = (nextPage: number) => {
    if (pendingPageCorrection.current === nextPage) {
      pendingPageCorrection.current = null;
      return;
    }

    navigateToPage(nextPage);
  };
  const correctPage = (correctedPage: number) => {
    pendingPageCorrection.current = correctedPage;
    navigateToPage(correctedPage, true);
  };
  const updateCriteria = (updates: Partial<CategoryListCriteria>) => {
    const nextCriteria = { ...criteria, ...updates };
    const hasChanged =
      nextCriteria.search !== criteria.search ||
      nextCriteria.status !== criteria.status ||
      nextCriteria.sort !== criteria.sort ||
      nextCriteria.order !== criteria.order;

    if (!hasChanged) {
      return;
    }

    navigateToListState({ page: 1, criteria: nextCriteria });
  };
  const applySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const search = searchDraft.trim();
    setSearchDraftState({ serializedSearchParams, value: search });
    updateCriteria({ search });
  };
  const clearSearch = () => {
    setSearchDraftState({ serializedSearchParams, value: "" });
    updateCriteria({ search: "" });
  };
  const updateSearchDraft = (value: string) => {
    setSearchDraftState({ serializedSearchParams, value });
  };
  const editCategory = useCallback(
    (category: Category) => {
      if (pendingCategoryUuids.includes(category.uuid)) {
        return;
      }

      const returnTo = `/categories?${serializeCategoryListUrlState(urlState).toString()}`;
      const editSearchParams = new URLSearchParams({ returnTo });
      void navigate(
        `/categories/${encodeURIComponent(category.uuid)}/edit?${editSearchParams.toString()}`,
      );
    },
    [navigate, pendingCategoryUuids, urlState],
  );
  const confirmCategoryStatusChange = useCallback(
    async (category: Category) => {
      try {
        await requestStatusChange({
          uuid: category.uuid,
          previousIsActive: category.isActive,
          requestedIsActive: !category.isActive,
        });

        if (sessionId !== null && isCurrentSession(sessionId)) {
          setStatusWriteConfirmation({
            message: `Categoría ${category.isActive ? "desactivada" : "activada"} correctamente.`,
            location: currentLocation,
          });
          toast.show({
            kind: "success",
            message: `Categoría ${category.isActive ? "desactivada" : "activada"} correctamente.`,
          });
        }
      } catch (error: unknown) {
        if (!isCategoryListMounted.current && sessionId !== null && isCurrentSession(sessionId)) {
          const statusCheckCompleted = error instanceof CategoryStatusCheckCompletedError;
          toast.show({
            kind: statusCheckCompleted ? "info" : "error",
            message: statusCheckCompleted ? error.message : getLateStatusFailureMessage(error),
          });
          if (
            !statusCheckCompleted &&
            !isUncertainCategoryMutationError(error) &&
            !isCategoryResponseContractError(error)
          ) {
            void queryClient.invalidateQueries({
              queryKey: ["categories", "management-list", sessionId],
            });
          }
        }

        throw error;
      }
    },
    [currentLocation, queryClient, requestStatusChange, sessionId, toast],
  );
  const retryCategoryStatusCheck = useCallback(
    async (operationId: string) => {
      const operation = operations.find((candidate) => candidate.id === operationId);
      if (operation === undefined) {
        return;
      }

      const observedCategory = await retryStatusCheck(operationId);
      if (
        observedCategory?.isActive === operation.requestedIsActive &&
        sessionId !== null &&
        isCurrentSession(sessionId)
      ) {
        toast.show({
          kind: "info",
          message: `La categoría "${observedCategory.name}" está ${
            observedCategory.isActive ? "activa" : "inactiva"
          } actualmente. Esta lectura no confirma si la solicitud anterior causó el cambio.`,
        });
      }
    },
    [operations, retryStatusCheck, sessionId, toast],
  );

  return (
    <CategoryPageShell
      description="Organiza las categorías que utilizas para clasificar tus productos."
      title="Categorías"
    >
      <form
        aria-label="Buscar y filtrar categorías"
        className="category-list__filters"
        onSubmit={applySearch}
        role="search"
      >
        <div className="category-list__search">
          <Input
            helpText="Busca por parte del nombre; no distingue mayúsculas."
            label="Buscar categorías"
            onValueChange={updateSearchDraft}
            type="search"
            value={searchDraft}
          />
          <Button type="submit" variant="secondary">
            Buscar
          </Button>
        </div>
        <Select
          label="Estado de categoría"
          onValueChange={(value) => {
            if (value === "active" || value === "inactive") {
              updateCriteria({ status: value });
            }
          }}
          options={categoryStatusOptions}
          value={criteria.status}
        />
        <Select
          label="Ordenar por"
          onValueChange={(value) => {
            if (value !== null && isCategoryListSortField(value)) {
              updateCriteria({ sort: value });
            }
          }}
          options={categorySortOptions}
          value={criteria.sort}
        />
        <Select
          label="Dirección del orden"
          onValueChange={(value) => {
            if (value === "asc" || value === "desc") {
              updateCriteria({ order: value });
            }
          }}
          options={categoryOrderOptions}
          value={criteria.order}
        />
      </form>
      {categoryList.isSuccess ? (
        <p className="category-list__summary" role="status">
          {categoryList.data.pagination.total} categoría
          {categoryList.data.pagination.total === 1 ? "" : "s"}
        </p>
      ) : null}
      {confirmedWriteMessage && categoryList.isError ? (
        <div className="category-list__write-confirmation" role="status">
          <strong>{confirmedWriteMessage}</strong>
          <span>
            No se pudo actualizar el listado. Reintenta únicamente la consulta; la escritura ya fue
            confirmada y no se volverá a enviar.
          </span>
        </div>
      ) : null}
      <CategoryListTable
        criteria={criteria}
        onClearSearch={clearSearch}
        onConfirmStatusChange={confirmCategoryStatusChange}
        onEditCategory={editCategory}
        onPageChange={changePage}
        onPageCorrection={correctPage}
        onRetry={() => categoryList.refetch()}
        onRetryStatusCheck={(operationId) => void retryCategoryStatusCheck(operationId)}
        checkingCategoryUuids={checkingCategoryUuids}
        notFoundCategoryUuids={notFoundCategoryUuids}
        pendingCategoryUuids={pendingCategoryUuids}
        retryLabel={confirmedWriteMessage ? "Reintentar solo la consulta" : undefined}
        result={result}
      />
    </CategoryPageShell>
  );
};
