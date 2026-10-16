import "./product-edit-form.css";

import type { FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Badge, Button, Input, Textarea } from "@/shared/ui";

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

  const submitProduct = (values: ProductEditFormValues) => {
    const payload = buildProductUpdatePayload(product, values);

    if (Object.keys(payload).length === 0) {
      return;
    }

    updateProductMutation.mutate({ uuid: product.uuid, payload });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void form.handleSubmit(submitProduct)(event);
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

        <Controller
          control={form.control}
          name="categoryUuid"
          render={({ field, fieldState }) => (
            <ProductEditCategoryField
              error={fieldState.error?.message}
              onBlur={field.onBlur}
              onValueChange={field.onChange}
              originalCategoryUuid={product.categoryUuid}
              sessionId={sessionId}
              value={field.value}
            />
          )}
        />

        <div className="product-edit-form__actions">
          <Button type="submit">Guardar cambios</Button>
        </div>
      </form>
    </section>
  );
};
