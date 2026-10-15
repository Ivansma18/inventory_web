import * as z from "zod";

const requiredTrimmedText = (message: string) => z.string().trim().min(1, { message });

export const productCreateSchema = z.object({
  sku: requiredTrimmedText("El SKU es obligatorio."),
  name: requiredTrimmedText("El nombre es obligatorio."),
  description: z.string(),
  purchasePrice: requiredTrimmedText("El precio de compra es obligatorio."),
  salePrice: requiredTrimmedText("El precio de venta es obligatorio."),
  categoryUuid: z
    .string()
    .min(1, { message: "Selecciona una categoría activa." })
    .pipe(z.uuid("Selecciona una categoría activa.")),
});

export type ProductCreateFormValues = z.input<typeof productCreateSchema>;

export const DEFAULT_PRODUCT_CREATE_VALUES: ProductCreateFormValues = {
  sku: "",
  name: "",
  description: "",
  purchasePrice: "",
  salePrice: "",
  categoryUuid: "",
};
