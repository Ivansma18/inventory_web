import "./category-list.page.css";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";

import { useSession } from "@/features/auth";
import { Button, Input, Select } from "@/shared/ui";
import type { DataTableResult, DataTableSnapshot, SelectOption } from "@/shared/ui";

import type { Category } from "../api/category-contract";
import { CategoryListTable } from "../components/category-list-table";
import { CategoryPageShell } from "../components/category-page-shell";
import { useCategoryList } from "../hooks/use-category-list";
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

interface CategoryListSearchDraftState {
  serializedSearchParams: string;
  value: string;
}

export const CategoryListPage = () => {
  const session = useSession();
  const [searchParams, setSearchParams] = useSearchParams();
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
  const categoryList = useCategoryList(sessionId, page, criteria);
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
      <CategoryListTable
        criteria={criteria}
        onClearSearch={clearSearch}
        onPageChange={changePage}
        onPageCorrection={correctPage}
        onRetry={() => void categoryList.refetch()}
        result={result}
      />
    </CategoryPageShell>
  );
};
