import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { CategoryFormFields } from "../components/category-form-fields";
import { CategoryPageShell } from "../components/category-page-shell";
import {
  categoryFormSchema,
  DEFAULT_CATEGORY_FORM_VALUES,
  type CategoryFormInput,
  type CategoryFormValues,
} from "../schemas/category-form.schema";

export const CategoryCreatePage = () => {
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
    mode: "onBlur",
    resolver: zodResolver(categoryFormSchema),
  });

  return (
    <CategoryPageShell
      description="Añade los datos básicos para incorporar una categoría al catálogo."
      title="Crear categoría"
    >
      <CategoryFormFields form={form} />
    </CategoryPageShell>
  );
};
