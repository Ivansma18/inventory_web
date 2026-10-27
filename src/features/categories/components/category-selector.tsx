import "./category-selector.css";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { Button, Input, Select } from "@/shared/ui";
import type { SelectOption } from "@/shared/ui";

import { CATEGORY_LIST_PAGE_SIZE } from "../api/categories-api";
import type { Category } from "../api/category-contract";
import { useActiveCategories } from "../hooks/use-active-categories";
import { useCategory } from "../hooks/use-category";
import { isCategoryNotFoundError } from "../utils/category-api-errors";

export interface CategorySelectorProps {
  sessionId: string | null;
  value: string | null;
  onValueChange: (value: string | null) => void;
  originalCategoryUuid?: string | null;
  disabled?: boolean;
  refreshRequired?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
  allowEmptySelection?: boolean;
  emptyMessage?: string;
  onBlur?: () => void;
  onActiveCategorySelected?: () => void;
  onOptionsRefreshed?: () => void;
  onCategorySelectionInvalidated?: (categoryUuid: string) => void;
}

interface CategoryOption extends SelectOption {
  category?: Category;
}

export const CategorySelector = ({
  sessionId,
  value,
  onValueChange,
  originalCategoryUuid = null,
  disabled = false,
  refreshRequired = false,
  error,
  label = "Categoría",
  required = false,
  allowEmptySelection = originalCategoryUuid === null,
  emptyMessage,
  onBlur,
  onActiveCategorySelected,
  onOptionsRefreshed,
  onCategorySelectionInvalidated,
}: CategorySelectorProps) => {
  const categorySelectId = useId();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [retainedCategory, setRetainedCategory] = useState<Category | null>(null);
  const handledInvalidSelection = useRef<string | null>(null);
  const restoreSelectFocus = useRef(false);
  const categories = useActiveCategories(sessionId, { page, search });
  const visibleCategories = categories.data?.data ?? [];
  const originalCategoryIsVisible = visibleCategories.some(
    (category) => category.uuid === originalCategoryUuid,
  );
  const shouldLoadOriginalCategory =
    originalCategoryUuid !== null &&
    (categories.isError || (categories.isSuccess && !originalCategoryIsVisible));
  const originalCategoryQuery = useCategory(
    sessionId,
    shouldLoadOriginalCategory ? originalCategoryUuid : null,
  );
  const isNewCategorySelection = value !== null && value !== originalCategoryUuid;
  const selectedCategoryUuid = isNewCategorySelection ? value : null;
  const selectedCategoryQuery = useCategory(sessionId, selectedCategoryUuid, {
    revalidateOnMount: true,
  });
  const selectedCategoryIsUnavailable =
    selectedCategoryUuid !== null &&
    ((selectedCategoryQuery.isSuccess && !selectedCategoryQuery.data.isActive) ||
      (selectedCategoryQuery.isError && isCategoryNotFoundError(selectedCategoryQuery.error)));
  const originalCategory =
    visibleCategories.find((category) => category.uuid === originalCategoryUuid) ??
    (originalCategoryQuery.data?.uuid === originalCategoryUuid ? originalCategoryQuery.data : null);

  useEffect(() => {
    if (selectedCategoryUuid === null || !selectedCategoryIsUnavailable) {
      handledInvalidSelection.current = null;
      return;
    }

    if (handledInvalidSelection.current === selectedCategoryUuid) {
      return;
    }

    handledInvalidSelection.current = selectedCategoryUuid;
    setRetainedCategory(null);
    onCategorySelectionInvalidated?.(selectedCategoryUuid);
    onValueChange(originalCategoryUuid);
  }, [
    onCategorySelectionInvalidated,
    onValueChange,
    originalCategoryUuid,
    selectedCategoryIsUnavailable,
    selectedCategoryUuid,
  ]);

  useLayoutEffect(() => {
    if (!restoreSelectFocus.current) {
      return;
    }

    restoreSelectFocus.current = false;
    document.getElementById(categorySelectId)?.focus();
  }, [categorySelectId, value]);

  const categoryOptions: CategoryOption[] = visibleCategories.map((category) => ({
    label: category.name,
    value: category.uuid,
    category,
  }));
  const addOption = (option: CategoryOption) => {
    if (!categoryOptions.some((current) => current.value === option.value)) {
      categoryOptions.push(option);
    }
  };

  if (
    retainedCategory !== null &&
    retainedCategory.uuid === value &&
    retainedCategory.uuid !== originalCategoryUuid
  ) {
    addOption({
      label: retainedCategory.name,
      value: retainedCategory.uuid,
      category: retainedCategory,
    });
  }

  if (originalCategoryUuid !== null) {
    addOption({
      label: originalCategory
        ? `${originalCategory.name}${originalCategory.isActive ? "" : " (categoría actual)"}`
        : "Categoría actual",
      value: originalCategoryUuid,
      category: originalCategory ?? undefined,
    });
  }

  if (value !== null) {
    addOption({ label: "Categoría seleccionada", value });
  }

  const totalPages = Math.max(
    1,
    Math.ceil(
      (categories.data?.pagination.total ?? 0) /
        (categories.data?.pagination.limit ?? CATEGORY_LIST_PAGE_SIZE),
    ),
  );
  const resolvedEmptyMessage = categories.isPending
    ? "Cargando categorías activas…"
    : categories.isError
      ? "No se pudieron cargar las categorías activas."
      : search
        ? "No se encontraron categorías activas."
        : (emptyMessage ??
          (originalCategoryUuid === null
            ? "No hay categorías activas."
            : "No hay categorías activas para reemplazar la categoría actual."));

  const applySearch = () => {
    setPage(1);
    setSearch(searchDraft.trim());
  };

  const handleValueChange = (nextValue: string | null) => {
    restoreSelectFocus.current = nextValue !== value;
    onValueChange(nextValue);

    if (nextValue === null) {
      setRetainedCategory(null);
      return;
    }

    const nextActiveCategory = visibleCategories.find((category) => category.uuid === nextValue);
    const nextRetainedCategory =
      nextActiveCategory ??
      (retainedCategory?.uuid === nextValue ? retainedCategory : null) ??
      (originalCategory?.uuid === nextValue ? originalCategory : null);

    setRetainedCategory(nextRetainedCategory);

    if (nextActiveCategory) {
      onActiveCategorySelected?.();
    }
  };

  const refreshOptions = async () => {
    const [result] = await Promise.all([
      categories.refetch(),
      ...(selectedCategoryUuid === null ? [] : [selectedCategoryQuery.refetch()]),
    ]);

    if (result.isSuccess) {
      onOptionsRefreshed?.();
    }
  };

  return (
    <div className="category-selector">
      <div className="category-selector__search">
        <Input
          disabled={disabled || refreshRequired}
          helpText="Busca por nombre entre categorías activas."
          label="Buscar categorías activas"
          onValueChange={setSearchDraft}
          type="search"
          value={searchDraft}
        />
        <Button
          disabled={disabled || refreshRequired}
          onClick={applySearch}
          type="button"
          variant="secondary"
        >
          Buscar categorías
        </Button>
      </div>

      {categories.isFetching && visibleCategories.length > 0 ? (
        <p className="category-selector__status" role="status">
          Consultando categorías activas…
        </p>
      ) : null}

      {categories.isError ? (
        <div className="category-selector__error" role="alert">
          <p>No se pudieron cargar las categorías activas.</p>
          <Button
            disabled={disabled}
            loading={categories.isFetching}
            onClick={() => void refreshOptions()}
            type="button"
            variant="secondary"
          >
            {refreshRequired ? "Actualizar categorías activas" : "Reintentar"}
          </Button>
        </div>
      ) : null}

      {refreshRequired && !categories.isError ? (
        <div className="category-selector__recovery">
          <Button
            disabled={disabled || categories.isFetching}
            loading={categories.isFetching}
            onClick={() => void refreshOptions()}
            type="button"
            variant="secondary"
          >
            Actualizar categorías activas
          </Button>
        </div>
      ) : null}

      {originalCategoryQuery.isFetching ? (
        <p className="category-selector__status" role="status">
          Consultando la categoría actual…
        </p>
      ) : null}

      {originalCategoryQuery.isError ? (
        <div className="category-selector__error" role="alert">
          <p>La categoría actual no está disponible. Se conservará mientras no elijas otra.</p>
          <Button
            disabled={disabled}
            loading={originalCategoryQuery.isFetching}
            onClick={() => void originalCategoryQuery.refetch()}
            type="button"
            variant="secondary"
          >
            Reintentar categoría actual
          </Button>
        </div>
      ) : null}

      <Select
        allowEmptySelection={allowEmptySelection}
        disabled={disabled || refreshRequired || categories.isPending || categories.isError}
        emptyMessage={resolvedEmptyMessage}
        error={error}
        id={categorySelectId}
        key={`${value ?? "empty"}:${
          categoryOptions.find((option) => option.value === value)?.label ?? ""
        }`}
        label={label}
        onBlur={onBlur}
        onValueChange={handleValueChange}
        options={categoryOptions}
        placeholder={required ? "Selecciona una categoría" : "Sin categoría"}
        required={required}
        value={value}
      />

      {categories.data && categories.data.pagination.total > categories.data.pagination.limit ? (
        <div className="category-selector__pagination">
          <Button
            disabled={disabled || refreshRequired || page <= 1}
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            type="button"
            variant="secondary"
          >
            Página anterior de categorías
          </Button>
          <span aria-live="polite">
            Página {categories.data.pagination.page} de {totalPages}
          </span>
          <Button
            disabled={disabled || refreshRequired || page >= totalPages}
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            type="button"
            variant="secondary"
          >
            Página siguiente de categorías
          </Button>
        </div>
      ) : null}
    </div>
  );
};
