import * as z from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre es obligatorio." }),
  description: z.string(),
});

export type CategoryFormInput = z.input<typeof categoryFormSchema>;
export type CategoryFormValues = z.output<typeof categoryFormSchema>;

export const DEFAULT_CATEGORY_FORM_VALUES: CategoryFormInput = {
  name: "",
  description: "",
};
