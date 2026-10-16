import "./product-edit-category-field.css";

import { useState } from "react";

import {
  CATEGORY_LIST_PAGE_SIZE,
  useActiveCategories,
  useCategory,
  type Category,
} from "@/features/categories";
import { Button, Input, Select } from "@/shared/ui";
import type { SelectOption } from "@/shared/ui";

interface ProductEditCategoryFieldProps {
  disabled?: boolean;
  error?: string;
  onBlur: () => void;
  onValueChange: (value: string | null) => void;
  originalCategoryUuid: string | null;
  sessionId: string | null;
  value: string | null;
}

export const ProductEditCategoryField = ({
  disabled = false,
  error,
  onBlur,
  onValueChange,
  originalCategoryUuid,
  sessionId,
  value,
}: ProductEditCategoryFieldProps) => {
  const [categorySearchDraft, setCategorySearchDraft] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const categories = useActiveCategories(sessionId, { page: categoryPage, search: categorySearch });
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
  const originalCategory =
    visibleCategories.find((category) => category.uuid === originalCategoryUuid) ??
    (originalCategoryQuery.data?.uuid === originalCategoryUuid ? originalCategoryQuery.data : null);

  const categoryOptions: SelectOption[] = visibleCategories.map((category) => ({
    label: category.name,
    value: category.uuid,
  }));

  if (
    selectedCategory &&
    !categoryOptions.some((option) => option.value === selectedCategory.uuid)
  ) {
    categoryOptions.push({
      label: selectedCategory.name,
      value: selectedCategory.uuid,
    });
  }

  if (
    originalCategoryUuid !== null &&
    !categoryOptions.some((option) => option.value === originalCategoryUuid)
  ) {
    categoryOptions.push({
      label: originalCategory
        ? `${originalCategory.name}${originalCategory.isActive ? "" : " (categoría actual)"}`
        : "Categoría actual",
      value: originalCategoryUuid,
    });
  }

  const totalPages = Math.max(
    1,
    Math.ceil(
      (categories.data?.pagination.total ?? 0) /
        (categories.data?.pagination.limit ?? CATEGORY_LIST_PAGE_SIZE),
    ),
  );

  const applyCategorySearch = () => {
    setCategoryPage(1);
    setCategorySearch(categorySearchDraft.trim());
  };

  const handleCategoryChange = (nextCategoryUuid: string | null) => {
    if (nextCategoryUuid === null && originalCategoryUuid !== null) {
      return;
    }

    onValueChange(nextCategoryUuid);

    if (nextCategoryUuid === null) {
      setSelectedCategory(null);
      return;
    }

    setSelectedCategory(
      visibleCategories.find((category) => category.uuid === nextCategoryUuid) ??
        (originalCategory?.uuid === nextCategoryUuid ? originalCategory : null),
    );
  };

  const emptyCategoryMessage = categories.isPending
    ? "Cargando categorías activas…"
    : categories.isError
      ? "No se pudieron cargar las categorías activas."
      : categorySearch
        ? "No se encontraron categorías activas."
        : "No hay categorías activas.";

  return (
    <div className="product-edit-category-field">
      <div className="product-edit-category-field__search">
        <Input
          disabled={disabled}
          helpText="Busca por nombre entre categorías activas."
          label="Buscar categorías activas"
          onValueChange={setCategorySearchDraft}
          type="search"
          value={categorySearchDraft}
        />
        <Button disabled={disabled} onClick={applyCategorySearch} type="button" variant="secondary">
          Buscar categorías
        </Button>
      </div>

      {originalCategoryUuid === null && value === null ? (
        <p className="product-edit-category-field__status" role="status">
          Sin categoría
        </p>
      ) : null}

      {categories.isPending ? (
        <p className="product-edit-category-field__status" role="status">
          Cargando categorías activas…
        </p>
      ) : null}

      {categories.isFetching && categories.data ? (
        <p className="product-edit-category-field__status" role="status">
          Consultando categorías activas…
        </p>
      ) : null}

      {categories.isError ? (
        <div className="product-edit-category-field__error" role="alert">
          <p>No se pudieron cargar las categorías activas.</p>
          <Button
            disabled={disabled}
            loading={categories.isFetching}
            onClick={() => void categories.refetch()}
            type="button"
            variant="secondary"
          >
            Reintentar categorías
          </Button>
        </div>
      ) : null}

      {originalCategoryQuery.isFetching ? (
        <p className="product-edit-category-field__status" role="status">
          Consultando la categoría actual…
        </p>
      ) : null}

      {originalCategoryQuery.isError ? (
        <div className="product-edit-category-field__error" role="alert">
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

      {categories.isSuccess && categories.data.pagination.total === 0 ? (
        <p className="product-edit-category-field__status" role="status">
          {categorySearch
            ? "No se encontraron categorías activas."
            : originalCategoryUuid === null
              ? "No hay categorías activas; el producto seguirá sin categoría."
              : "No hay categorías activas para reemplazar la categoría actual."}
        </p>
      ) : null}

      <Select
        allowEmptySelection={originalCategoryUuid === null}
        disabled={disabled || categories.isPending || categories.isError}
        emptyMessage={emptyCategoryMessage}
        error={error}
        key={`${value ?? "empty"}:${categoryOptions.find((option) => option.value === value)?.label ?? ""}`}
        label="Categoría"
        onBlur={onBlur}
        onValueChange={handleCategoryChange}
        options={categoryOptions}
        placeholder={originalCategoryUuid === null ? "Sin categoría" : "Selecciona una categoría"}
        required={originalCategoryUuid !== null}
        value={value}
      />

      {categories.data && categories.data.pagination.total > categories.data.pagination.limit ? (
        <div className="product-edit-category-field__pagination">
          <Button
            disabled={disabled || categoryPage <= 1}
            onClick={() => setCategoryPage((page) => Math.max(1, page - 1))}
            type="button"
            variant="secondary"
          >
            Página anterior de categorías
          </Button>
          <span aria-live="polite">
            Página {categories.data.pagination.page} de {totalPages}
          </span>
          <Button
            disabled={disabled || categoryPage >= totalPages}
            onClick={() => setCategoryPage((page) => Math.min(totalPages, page + 1))}
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
