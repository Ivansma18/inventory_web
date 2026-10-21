import "./category-form-fields.css";

import { Controller } from "react-hook-form";
import type { UseFormReturn } from "react-hook-form";

import { Input, Textarea } from "@/shared/ui";

import type { CategoryFormInput, CategoryFormValues } from "../schemas/category-form.schema";

export interface CategoryFormFieldsProps {
  form: UseFormReturn<CategoryFormInput, unknown, CategoryFormValues>;
}

export const CategoryFormFields = ({ form }: CategoryFormFieldsProps) => (
  <section aria-labelledby="category-form-fields-heading" className="category-form-fields">
    <h2 className="category-form-fields__heading" id="category-form-fields-heading">
      Datos de la categoría
    </h2>
    <div className="category-form-fields__controls">
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
        name="description"
        render={({ field, fieldState }) => (
          <Textarea
            error={fieldState.error?.message}
            label="Descripción (opcional)"
            onValueChange={field.onChange}
            rows={4}
            value={field.value}
          />
        )}
      />
    </div>
  </section>
);
