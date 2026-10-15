import "./product-create-form.css";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useSession } from "@/features/auth";
import { useActiveCategories, type Category } from "@/features/categories";
import { Button, Input, Select, Textarea } from "@/shared/ui";
import type { SelectOption } from "@/shared/ui";

import {
  DEFAULT_PRODUCT_CREATE_VALUES,
  productCreateSchema,
  type ProductCreateFormInput,
  type ProductCreateFormValues,
} from "../schemas/product-create.schema";

export const ProductCreateForm = () => {
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const [categorySearchDraft, setCategorySearchDraft] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const categories = useActiveCategories(sessionId, { page: categoryPage, search: categorySearch });
  const form = useForm<ProductCreateFormInput, unknown, ProductCreateFormValues>({
    defaultValues: DEFAULT_PRODUCT_CREATE_VALUES,
    mode: "onBlur",
    resolver: zodResolver(productCreateSchema),
  });
  const visibleCategories = categories.data?.data ?? [];
  const categoryOptions: SelectOption[] = visibleCategories.map((category) => ({
    label: category.name,
    value: category.uuid,
  }));

  if (
    selectedCategory &&
    !visibleCategories.some((category) => category.uuid === selectedCategory.uuid)
  ) {
    categoryOptions.push({ label: selectedCategory.name, value: selectedCategory.uuid });
  }

  const totalPages = Math.max(
    1,
    Math.ceil((categories.data?.pagination.total ?? 0) / (categories.data?.pagination.limit ?? 15)),
  );
  const hasNoActiveCategories =
    categories.isSuccess && !categorySearch && categories.data.pagination.total === 0;
  const emptyCategoryMessage = categories.isPending
    ? "Cargando categorías activas…"
    : categories.isError
      ? "No se pudieron cargar las categorías."
      : hasNoActiveCategories
        ? "No hay categorías activas. No se puede crear un producto hasta que exista una."
        : categorySearch
          ? "No se encontraron categorías activas."
          : "No hay opciones disponibles.";

  const applyCategorySearch = () => {
    setCategoryPage(1);
    setCategorySearch(categorySearchDraft.trim());
  };

  return (
    <section aria-labelledby="product-create-form-heading" className="product-create-form">
      <div className="product-create-form__header">
        <h2 className="product-create-form__heading" id="product-create-form-heading">
          Datos del producto
        </h2>
        <p className="product-create-form__intro">
          Completa la información básica y asígnale una categoría activa.
        </p>
      </div>

      <form
        aria-labelledby="product-create-form-heading"
        className="product-create-form__fields"
        noValidate
        onSubmit={form.handleSubmit(() => undefined)}
      >
        <Controller
          control={form.control}
          name="sku"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error?.message}
              label="SKU (obligatorio)"
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              required
              value={field.value}
            />
          )}
        />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error?.message}
              label="Nombre (obligatorio)"
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              required
              value={field.value}
            />
          )}
        />

        <Controller
          control={form.control}
          name="purchasePrice"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error?.message}
              helpText="Usa coma o punto decimal; máximo dos decimales."
              inputMode="decimal"
              label="Precio de compra (obligatorio)"
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              required
              value={field.value}
            />
          )}
        />

        <Controller
          control={form.control}
          name="salePrice"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error?.message}
              helpText="Usa coma o punto decimal; máximo dos decimales."
              inputMode="decimal"
              label="Precio de venta (obligatorio)"
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              required
              value={field.value}
            />
          )}
        />

        <Controller
          control={form.control}
          name="description"
          render={({ field }) => (
            <Textarea
              label="Descripción (opcional)"
              onValueChange={field.onChange}
              rows={4}
              value={field.value}
            />
          )}
        />

        <div className="product-create-form__category">
          <div className="product-create-form__category-search">
            <Input
              helpText="Busca por nombre entre categorías activas."
              label="Buscar categorías activas"
              onValueChange={setCategorySearchDraft}
              type="search"
              value={categorySearchDraft}
            />
            <Button onClick={applyCategorySearch} type="button" variant="secondary">
              Buscar categorías
            </Button>
          </div>

          {categories.isFetching && categoryOptions.length > 0 ? (
            <p className="product-create-form__category-status" role="status">
              Consultando categorías activas…
            </p>
          ) : null}

          {categories.isError ? (
            <div className="product-create-form__category-error" role="alert">
              <p>No se pudieron cargar las categorías activas.</p>
              <Button
                loading={categories.isFetching}
                onClick={() => void categories.refetch()}
                type="button"
                variant="secondary"
              >
                Reintentar
              </Button>
            </div>
          ) : null}

          <Controller
            control={form.control}
            name="categoryUuid"
            render={({ field, fieldState }) => (
              <Select
                emptyMessage={emptyCategoryMessage}
                error={fieldState.error?.message}
                label="Categoría (obligatorio)"
                onBlur={field.onBlur}
                onValueChange={(value) => {
                  field.onChange(value ?? "");
                  setSelectedCategory(
                    value
                      ? (visibleCategories.find((category) => category.uuid === value) ??
                          selectedCategory)
                      : null,
                  );
                }}
                options={categoryOptions}
                required
                value={field.value || null}
              />
            )}
          />

          {categories.data &&
          categories.data.pagination.total > categories.data.pagination.limit ? (
            <div className="product-create-form__category-pagination">
              <Button
                disabled={categoryPage <= 1}
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
                disabled={categoryPage >= totalPages}
                onClick={() => setCategoryPage((page) => Math.min(totalPages, page + 1))}
                type="button"
                variant="secondary"
              >
                Página siguiente de categorías
              </Button>
            </div>
          ) : null}
        </div>
      </form>
    </section>
  );
};
