import "./category-create.page.css";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";

import { useSession } from "@/features/auth";
import { Button, useToast } from "@/shared/ui";

import type { CategoryCreatePayload } from "../api/category-contract";
import { CategoryFormFields } from "../components/category-form-fields";
import { CategoryPageShell } from "../components/category-page-shell";
import { useCreateCategory } from "../hooks/use-create-category";
import {
  categoryFormSchema,
  DEFAULT_CATEGORY_FORM_VALUES,
  type CategoryFormInput,
  type CategoryFormValues,
} from "../schemas/category-form.schema";
import {
  categoryNameConflictMessage,
  isDuplicateCategoryNameError,
} from "../utils/category-api-errors";
import {
  DEFAULT_CATEGORY_LIST_CRITERIA,
  serializeCategoryListUrlState,
} from "../utils/category-list-url-state";

export const CategoryCreatePage = () => {
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const navigate = useNavigate();
  const toast = useToast();
  const submitLock = useRef(false);
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
    mode: "onBlur",
    resolver: zodResolver(categoryFormSchema),
  });
  const createCategoryMutation = useCreateCategory(sessionId);
  const operationPending = createCategoryMutation.isPending || form.formState.isSubmitting;

  const submitCategory = async (values: CategoryFormValues) => {
    const payload: CategoryCreatePayload = {
      name: values.name,
      ...(values.description.length > 0 ? { description: values.description } : {}),
    };

    try {
      await createCategoryMutation.mutateAsync(payload);
    } catch (error: unknown) {
      if (isDuplicateCategoryNameError(error)) {
        form.setError("name", { type: "server", message: categoryNameConflictMessage });
        return;
      }

      form.setError("root.server", {
        type: "server",
        message:
          "No se pudo confirmar la creación. Revisa el listado antes de volver a intentarlo.",
      });
      return;
    }

    toast.show({ kind: "success", message: "Categoría creada correctamente." });
    const defaultListSearch = serializeCategoryListUrlState({
      page: 1,
      criteria: DEFAULT_CATEGORY_LIST_CRITERIA,
    });
    void navigate(`/categories?${defaultListSearch}`, { replace: true });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLock.current || createCategoryMutation.isPending) {
      return;
    }

    submitLock.current = true;
    form.clearErrors("root.server");
    if (form.getFieldState("name").error?.type === "server") {
      form.clearErrors("name");
    }
    void form
      .handleSubmit(submitCategory)(event)
      .finally(() => {
        submitLock.current = false;
      });
  };

  return (
    <CategoryPageShell
      description="Añade los datos básicos para incorporar una categoría al catálogo."
      title="Crear categoría"
    >
      <form
        aria-busy={operationPending || undefined}
        aria-labelledby="category-form-fields-heading"
        className="category-create-form"
        noValidate
        onSubmit={handleFormSubmit}
      >
        <CategoryFormFields disabled={operationPending} form={form} />
        <div className="category-create-form__actions">
          {form.formState.errors.root?.server?.message ? (
            <p className="category-create-form__error" role="alert">
              {form.formState.errors.root.server.message}
            </p>
          ) : null}
          {operationPending ? (
            <p className="category-create-form__status" role="status">
              Creando categoría…
            </p>
          ) : null}
          <Button disabled={operationPending} loading={operationPending} type="submit">
            {operationPending ? "Creando categoría…" : "Crear categoría"}
          </Button>
        </div>
      </form>
    </CategoryPageShell>
  );
};
