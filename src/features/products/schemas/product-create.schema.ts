import * as z from "zod";

import { parseProductPrice } from "../utils/product-price";

const requiredTrimmedText = (message: string) => z.string().trim().min(1, { message });

const priceErrorMessage = (
  label: string,
  reason: Exclude<ReturnType<typeof parseProductPrice>, { success: true }>["reason"],
): string => {
  switch (reason) {
    case "required":
      return `${label} es obligatorio.`;
    case "negative":
      return `${label} no puede ser negativo.`;
    case "too-many-decimals":
      return `${label} admite como máximo dos decimales.`;
    case "mixed-separators":
      return "No mezcles coma y punto ni uses separadores de miles.";
    case "unsafe-precision":
      return `${label} supera el rango que puede representarse con precisión.`;
    case "invalid-format":
      return `${label} debe ser un número válido usando coma o punto decimal.`;
  }
};

const productPriceSchema = (label: string) =>
  z.string().transform((value, context) => {
    const result = parseProductPrice(value);

    if (!result.success) {
      context.addIssue({ code: "custom", message: priceErrorMessage(label, result.reason) });
      return z.NEVER;
    }

    return result.value;
  });

export const productCreateSchema = z.object({
  sku: requiredTrimmedText("El SKU es obligatorio."),
  name: requiredTrimmedText("El nombre es obligatorio."),
  description: z.string(),
  purchasePrice: productPriceSchema("El precio de compra"),
  salePrice: productPriceSchema("El precio de venta"),
  categoryUuid: z
    .string()
    .min(1, { message: "Selecciona una categoría activa." })
    .pipe(z.uuid("Selecciona una categoría activa.")),
});

export type ProductCreateFormInput = z.input<typeof productCreateSchema>;
export type ProductCreateFormValues = z.output<typeof productCreateSchema>;

export const DEFAULT_PRODUCT_CREATE_VALUES: ProductCreateFormInput = {
  sku: "",
  name: "",
  description: "",
  purchasePrice: "",
  salePrice: "",
  categoryUuid: "",
};
