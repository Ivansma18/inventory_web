import "./product-edit-form.css";

import { useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router";

import { useSession } from "@/features/auth";
import { Badge, Button, Input, Textarea, useToast } from "@/shared/ui";

import type { Product } from "../api/product-contract";
import { ProductEditCategoryField } from "./product-edit-category-field";
import { useUpdateProduct } from "../hooks/use-update-product";
import { productListQueryPrefix } from "../hooks/use-product-list";
import { useFocusFirstInvalidField } from "../hooks/use-focus-first-invalid-field";
import { useProductFormNavigationGuard } from "../hooks/use-product-form-navigation-guard";
import {
  productEditSchema,
  type ProductEditFormInput,
  type ProductEditFormValues,
} from "../schemas/product-edit.schema";
import {
  isDuplicateProductSkuError,
  isProductCategoryAssignmentRejection,
  isProductForbiddenError,
  isProductNotFoundError,
  isProductResponseContractError,
  isProductUnauthorizedError,
  isUncertainProductMutationError,
  productSkuConflictMessage,
} from "../utils/product-api-errors";
import { formatProductPrice } from "../utils/product-price";
import { buildProductUpdatePayload } from "../utils/product-update-payload";
import { ProductUnsavedChangesDialog } from "./product-unsaved-changes-dialog";

interface ProductEditFormProps {
  product: Product;
  returnTo: string;
  sessionId: string | null;
}

export const ProductEditForm = ({ product, returnTo, sessionId }: ProductEditFormProps) => {
  const submitLock = useRef(false);
  const formElementRef = useRef<HTMLFormElement>(null);
  const [invalidSubmitCount, setInvalidSubmitCount] = useState(0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [productNotFound, setProductNotFound] = useState(false);
  const [categoryAssignmentRejected, setCategoryAssignmentRejected] = useState(false);
  const [categoryRefreshRequired, setCategoryRefreshRequired] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const updateProductMutation = useUpdateProduct(sessionId);
  const form = useForm<ProductEditFormInput, unknown, ProductEditFormValues>({
    defaultValues: {
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      purchasePrice: formatProductPrice(product.purchasePrice),
      salePrice: formatProductPrice(product.salePrice),
      categoryUuid: product.categoryUuid,
    },
    mode: "onBlur",
    resolver: zodResolver(productEditSchema),
  });
  useFocusFirstInvalidField(formElementRef, invalidSubmitCount);
  const operationPending = updateProductMutation.isPending || form.formState.isSubmitting;
  const {
    blocker,
    clearPendingNavigationNotice,
    dismissProtection,
    isNavigationBlockedDuringOperation,
    resetBlockedNavigation,
    showWaitingNotice,
  } = useProductFormNavigationGuard(form.formState.isDirty, operationPending);

  const submitProduct = async (values: ProductEditFormValues) => {
    if (productNotFound) {
      return;
    }

    const payload = buildProductUpdatePayload(product, values);

    if (Object.keys(payload).length === 0) {
      return;
    }

    setSaveError(null);
    try {
      await updateProductMutation.mutateAsync({ uuid: product.uuid, payload });
    } catch (error: unknown) {
      if (isProductUnauthorizedError(error)) {
        const refreshedSession = await session.refetch();
        if (sessionId !== null && refreshedSession.data?.data.session.id === sessionId) {
          toast.show({
            kind: "error",
            message:
              "La sesión se verificó, pero no se confirmó el resultado de la actualización. Revisa el producto antes de volver a intentarlo.",
          });
        }
        return;
      }

      if (isDuplicateProductSkuError(error)) {
        form.setError("sku", { type: "server", message: productSkuConflictMessage });
        return;
      }

      if (isProductCategoryAssignmentRejection(error)) {
        form.setValue("categoryUuid", product.categoryUuid, { shouldDirty: true });
        setCategoryAssignmentRejected(true);
        setCategoryRefreshRequired(true);
        return;
      }

      if (isProductNotFoundError(error)) {
        if (sessionId !== null) {
          void queryClient.invalidateQueries({
            queryKey: productListQueryPrefix(sessionId),
            refetchType: "none",
          });
        }
        setCategoryAssignmentRejected(false);
        setCategoryRefreshRequired(false);
        setProductNotFound(true);
        setSaveError(
          "No se encontró el producto. Los datos introducidos quedan en solo lectura y no se pueden guardar.",
        );
        return;
      }

      if (isProductForbiddenError(error)) {
        setSaveError("No tienes permiso para editar este producto.");
        return;
      }

      if (isProductResponseContractError(error)) {
        setSaveError(
          "La respuesta de actualización no se pudo validar. Revisa el producto antes de volver a intentarlo.",
        );
        return;
      }

      if (isUncertainProductMutationError(error)) {
        setSaveError(
          "No se pudo confirmar el resultado de la actualización. Revisa el producto antes de volver a intentarlo.",
        );
        return;
      }

      setSaveError("No se pudieron guardar los cambios. Inténtalo de nuevo.");
      return;
    }

    dismissProtection();
    resetBlockedNavigation();
    toast.show({ kind: "success", message: "Producto actualizado correctamente." });
    navigate(returnTo);
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLock.current || updateProductMutation.isPending || productNotFound) {
      return;
    }

    submitLock.current = true;
    clearPendingNavigationNotice();
    void form
      .handleSubmit(submitProduct, () => setInvalidSubmitCount((count) => count + 1))(event)
      .finally(() => {
        submitLock.current = false;
      });
  };

  return (
    <section aria-labelledby="product-edit-form-heading" className="product-edit-form">
      <div className="product-edit-form__header">
        <div className="product-edit-form__heading-row">
          <h2 className="product-edit-form__heading" id="product-edit-form-heading">
            Datos del producto
          </h2>
          <Badge
            label={product.isActive ? "Activo" : "Inactivo"}
            tone={product.isActive ? "success" : "neutral"}
          />
        </div>
        <p className="product-edit-form__intro">Información actual del producto.</p>
      </div>

      {saveError ? (
        <p className="product-edit-form__error" role="alert">
          {saveError}
        </p>
      ) : null}

      <form
        aria-busy={operationPending || undefined}
        aria-labelledby="product-edit-form-heading"
        className="product-edit-form__fields"
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
              readOnly={productNotFound}
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
              readOnly={productNotFound}
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
              readOnly={productNotFound}
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
              readOnly={productNotFound}
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
              readOnly={productNotFound}
              label="Descripción (opcional)"
              onValueChange={field.onChange}
              rows={4}
              value={field.value}
            />
          )}
        />

        <Controller
          control={form.control}
          name="categoryUuid"
          render={({ field, fieldState }) => (
            <ProductEditCategoryField
              categoryAssignmentRejected={categoryAssignmentRejected}
              categoryRefreshRequired={categoryRefreshRequired}
              error={fieldState.error?.message}
              disabled={operationPending || productNotFound}
              onActiveCategorySelected={() => {
                setCategoryAssignmentRejected(false);
                setCategoryRefreshRequired(false);
              }}
              onCategoryOptionsRefreshed={() => setCategoryRefreshRequired(false)}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              originalCategoryUuid={product.categoryUuid}
              sessionId={sessionId}
              value={field.value}
            />
          )}
        />

        <div className="product-edit-form__actions">
          {showWaitingNotice ? (
            <p className="product-edit-form__status" role="status">
              Espera a que termine el guardado antes de salir de esta página.
            </p>
          ) : null}
          {operationPending ? (
            <p className="product-edit-form__status" role="status">
              Guardando cambios del producto…
            </p>
          ) : null}
          <div className="product-edit-form__buttons">
            <Button
              disabled={operationPending}
              onClick={() => navigate(returnTo)}
              type="button"
              variant="secondary"
            >
              {productNotFound ? "Volver al listado" : "Cancelar"}
            </Button>
            {productNotFound ? null : (
              <Button disabled={operationPending} loading={operationPending} type="submit">
                {operationPending ? "Guardando cambios…" : "Guardar cambios"}
              </Button>
            )}
          </div>
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
