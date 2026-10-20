import "./product-create-form.css";

import { useRef, useState, type FormEvent } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";

import { useSession } from "@/features/auth";
import { useActiveCategories, type Category } from "@/features/categories";
import { Button, Input, Select, Textarea, useToast } from "@/shared/ui";
import type { SelectOption } from "@/shared/ui";

import type { ProductCreatePayload } from "../api/product-contract";
import { useCreateProduct } from "../hooks/use-create-product";
import { useFocusFirstInvalidField } from "../hooks/use-focus-first-invalid-field";
import { useProductFormNavigationGuard } from "../hooks/use-product-form-navigation-guard";
import {
  DEFAULT_PRODUCT_CREATE_VALUES,
  productCreateSchema,
  type ProductCreateFormInput,
  type ProductCreateFormValues,
} from "../schemas/product-create.schema";
import {
  isDuplicateProductSkuError,
  isProductCategoryAssignmentRejection,
  isProductForbiddenError,
  isProductResponseContractError,
  isProductUnauthorizedError,
  isUncertainProductMutationError,
  productSkuConflictMessage,
} from "../utils/product-api-errors";
import { ProductUnsavedChangesDialog } from "./product-unsaved-changes-dialog";

const rejectedCategoryMessage =
  "No se pudo asignar esta categoría. Actualiza las opciones y selecciona una categoría activa.";
const categoryReselectionMessage = "Selecciona una categoría activa.";

export const ProductCreateForm = () => {
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const navigate = useNavigate();
  const toast = useToast();
  const submitLock = useRef(false);
  const formElementRef = useRef<HTMLFormElement>(null);
  const [invalidSubmitCount, setInvalidSubmitCount] = useState(0);
  const [categorySearchDraft, setCategorySearchDraft] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);
  const [categoryRefreshRequired, setCategoryRefreshRequired] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const categories = useActiveCategories(sessionId, { page: categoryPage, search: categorySearch });
  const form = useForm<ProductCreateFormInput, unknown, ProductCreateFormValues>({
    defaultValues: DEFAULT_PRODUCT_CREATE_VALUES,
    mode: "onBlur",
    resolver: zodResolver(productCreateSchema),
  });
  useFocusFirstInvalidField(formElementRef, invalidSubmitCount, form.formState.errors);
  const createProductMutation = useCreateProduct(sessionId);
  const operationPending = createProductMutation.isPending || form.formState.isSubmitting;
  const {
    blocker,
    clearPendingNavigationNotice,
    dismissProtection,
    isNavigationBlockedDuringOperation,
    resetBlockedNavigation,
    showWaitingNotice,
  } = useProductFormNavigationGuard(form.formState.isDirty, operationPending);
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

  const refreshRejectedCategory = async () => {
    const result = await categories.refetch();

    if (result.isSuccess) {
      setCategoryRefreshRequired(false);
      form.setError("categoryUuid", { type: "server", message: categoryReselectionMessage });
    }
  };

  const submitProduct = async (values: ProductCreateFormValues) => {
    const payload: ProductCreatePayload = {
      sku: values.sku,
      name: values.name,
      ...(values.description.length > 0 ? { description: values.description } : {}),
      purchasePrice: values.purchasePrice,
      salePrice: values.salePrice,
      categoryUuid: values.categoryUuid,
    };

    try {
      await createProductMutation.mutateAsync(payload);
    } catch (error: unknown) {
      if (isProductUnauthorizedError(error)) {
        const refreshedSession = await session.refetch();
        if (sessionId !== null && refreshedSession.data?.data.session.id === sessionId) {
          toast.show({
            kind: "error",
            message:
              "La sesión se verificó, pero no se confirmó el resultado de la creación. Revisa el catálogo antes de volver a intentarlo.",
          });
        }
        return;
      }

      if (isProductCategoryAssignmentRejection(error)) {
        form.setValue("categoryUuid", "", { shouldDirty: true });
        setSelectedCategory(null);
        setCategoryRefreshRequired(true);
        form.setError("categoryUuid", { type: "server", message: rejectedCategoryMessage });
        return;
      }

      if (isDuplicateProductSkuError(error)) {
        form.setError("sku", { type: "server", message: productSkuConflictMessage });
        return;
      }

      if (isProductForbiddenError(error)) {
        form.setError("root.server", {
          type: "server",
          message: "No tienes permiso para crear productos.",
        });
        return;
      }

      if (isProductResponseContractError(error)) {
        form.setError("root.server", {
          type: "server",
          message:
            "La respuesta de creación no se pudo validar. Revisa el catálogo antes de volver a intentarlo.",
        });
        return;
      }

      if (isUncertainProductMutationError(error)) {
        form.setError("root.server", {
          type: "server",
          message:
            "No se pudo confirmar el resultado de la creación. Revisa el catálogo antes de volver a intentarlo.",
        });
        return;
      }

      form.setError("root.server", {
        type: "server",
        message: "No se pudo crear el producto. Inténtalo de nuevo.",
      });
      return;
    }

    dismissProtection();
    resetBlockedNavigation();
    toast.show({ kind: "success", message: "Producto creado correctamente." });
    void navigate("/products?page=1&status=active&sort=name&order=asc", { replace: true });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLock.current || createProductMutation.isPending) {
      return;
    }

    submitLock.current = true;
    clearPendingNavigationNotice();
    form.clearErrors("root.server");

    void form
      .handleSubmit(submitProduct, () => setInvalidSubmitCount((count) => count + 1))(event)
      .finally(() => {
        submitLock.current = false;
      });
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
        aria-busy={operationPending || undefined}
        aria-labelledby="product-create-form-heading"
        className="product-create-form__fields"
        noValidate
        onSubmit={handleFormSubmit}
        ref={formElementRef}
      >
        <Controller
          control={form.control}
          name="sku"
          render={({ field, fieldState }) => (
            <Input
              error={fieldState.error?.message}
              disabled={operationPending}
              label="SKU (obligatorio)"
              onBlur={field.onBlur}
              onValueChange={(value) => {
                field.onChange(value);
                if (fieldState.error?.type === "server") {
                  form.clearErrors("sku");
                }
              }}
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
              disabled={operationPending}
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
              disabled={operationPending}
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
              disabled={operationPending}
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
              disabled={operationPending}
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
              disabled={operationPending}
              helpText="Busca por nombre entre categorías activas."
              label="Buscar categorías activas"
              onValueChange={setCategorySearchDraft}
              type="search"
              value={categorySearchDraft}
            />
            <Button
              disabled={operationPending}
              onClick={applyCategorySearch}
              type="button"
              variant="secondary"
            >
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
                disabled={operationPending}
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

                  if (value) {
                    form.clearErrors("categoryUuid");
                    setCategoryRefreshRequired(false);
                  }
                }}
                options={categoryOptions}
                required
                disabled={operationPending || categoryRefreshRequired}
                value={field.value || null}
              />
            )}
          />

          {categoryRefreshRequired ? (
            <div className="product-create-form__category-recovery">
              <Button
                disabled={operationPending}
                loading={categories.isFetching}
                onClick={() => void refreshRejectedCategory()}
                type="button"
                variant="secondary"
              >
                Actualizar categorías activas
              </Button>
            </div>
          ) : null}

          {categories.data &&
          categories.data.pagination.total > categories.data.pagination.limit ? (
            <div className="product-create-form__category-pagination">
              <Button
                disabled={operationPending || categoryPage <= 1}
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
                disabled={operationPending || categoryPage >= totalPages}
                onClick={() => setCategoryPage((page) => Math.min(totalPages, page + 1))}
                type="button"
                variant="secondary"
              >
                Página siguiente de categorías
              </Button>
            </div>
          ) : null}
        </div>

        <div className="product-create-form__actions">
          {form.formState.errors.root?.server?.message ? (
            <p className="product-create-form__submit-error" role="alert">
              {form.formState.errors.root.server.message}
            </p>
          ) : null}
          {showWaitingNotice ? (
            <p className="product-create-form__submit-status" role="status">
              Espera a que termine el guardado antes de salir de esta página.
            </p>
          ) : null}
          {operationPending ? (
            <p className="product-create-form__submit-status" role="status">
              Creando producto…
            </p>
          ) : null}
          <Button disabled={operationPending} loading={operationPending} type="submit">
            {operationPending ? "Creando producto…" : "Crear producto"}
          </Button>
        </div>
      </form>
      <ProductUnsavedChangesDialog
        onContinueEditing={() => {
          if (blocker.state === "blocked") {
            blocker.reset();
          }
        }}
        onDiscardChanges={() => {
          if (blocker.state === "blocked") {
            dismissProtection();
            blocker.proceed();
          }
        }}
        open={blocker.state === "blocked" && !isNavigationBlockedDuringOperation}
      />
    </section>
  );
};
