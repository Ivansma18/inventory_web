import "./product-edit-form.css";

import { useRef, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Badge, Button, Input, Textarea, useToast } from "@/shared/ui";

import type { Product } from "../api/product-contract";
import { ProductEditCategoryField } from "./product-edit-category-field";
import { useUpdateProduct } from "../hooks/use-update-product";
import {
  productEditSchema,
  type ProductEditFormInput,
  type ProductEditFormValues,
} from "../schemas/product-edit.schema";
import { formatProductPrice } from "../utils/product-price";
import { buildProductUpdatePayload } from "../utils/product-update-payload";

interface ProductEditFormProps {
  product: Product;
  sessionId: string | null;
}

export const ProductEditForm = ({ product, sessionId }: ProductEditFormProps) => {
  const submitLock = useRef(false);
  const toast = useToast();
  const updateProductMutation = useUpdateProduct();
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
  const operationPending = updateProductMutation.isPending || form.formState.isSubmitting;

  const submitProduct = async (values: ProductEditFormValues) => {
    const payload = buildProductUpdatePayload(product, values);

    if (Object.keys(payload).length === 0) {
      return;
    }

    try {
      await updateProductMutation.mutateAsync({ uuid: product.uuid, payload });
    } catch {
      return;
    }

    toast.show({ kind: "success", message: "Producto actualizado correctamente." });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLock.current || updateProductMutation.isPending) {
      return;
    }

    submitLock.current = true;
    void form
      .handleSubmit(
        submitProduct,
        () => undefined,
      )(event)
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

      <form
        aria-busy={operationPending || undefined}
        aria-labelledby="product-edit-form-heading"
        className="product-edit-form__fields"
        noValidate
        onSubmit={handleFormSubmit}
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

        <Controller
          control={form.control}
          name="categoryUuid"
          render={({ field, fieldState }) => (
            <ProductEditCategoryField
              error={fieldState.error?.message}
              disabled={operationPending}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              originalCategoryUuid={product.categoryUuid}
              sessionId={sessionId}
              value={field.value}
            />
          )}
        />

        <div className="product-edit-form__actions">
          {operationPending ? (
            <p className="product-edit-form__status" role="status">
              Guardando cambios del producto…
            </p>
          ) : null}
          <Button disabled={operationPending} loading={operationPending} type="submit">
            {operationPending ? "Guardando cambios…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </section>
  );
};
