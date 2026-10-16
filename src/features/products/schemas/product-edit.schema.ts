import * as z from "zod";

import { productCreateSchema } from "./product-create.schema";

export const productEditSchema = productCreateSchema.omit({ categoryUuid: true }).extend({
  description: z.string().transform((value) => (value.trim().length === 0 ? null : value)),
  categoryUuid: z.uuid().nullable(),
});

export type ProductEditFormInput = z.input<typeof productEditSchema>;
export type ProductEditFormValues = z.output<typeof productEditSchema>;
