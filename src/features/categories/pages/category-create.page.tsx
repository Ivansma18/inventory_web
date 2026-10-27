import "./category-create.page.css";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useForm } from "react-hook-form";

import { isCurrentSession, useSession } from "@/features/auth";
import { Button, useToast } from "@/shared/ui";

import type { CategoryCreatePayload } from "../api/category-contract";
import { CategoryFormFields } from "../components/category-form-fields";
import { CategoryPageShell } from "../components/category-page-shell";
import { CategoryUnsavedChangesDialog } from "../components/category-unsaved-changes-dialog";
import { useCreateCategory } from "../hooks/use-create-category";
import { useCategoryFormNavigationGuard } from "../hooks/use-category-form-navigation-guard";
import {
  categoryFormSchema,
  DEFAULT_CATEGORY_FORM_VALUES,
  type CategoryFormInput,
  type CategoryFormValues,
} from "../schemas/category-form.schema";
import {
  categoryValidationMessage,
  categoryNameConflictMessage,
  invalidCategoryNameMessage,
  isCategoryForbiddenError,
  isCategoryResponseContractError,
  isCategoryUnauthorizedError,
  isCategoryValidationError,
  isDuplicateCategoryNameError,
  isInvalidCategoryNameError,
  isUncertainCategoryMutationError,
} from "../utils/category-api-errors";
import {
  DEFAULT_CATEGORY_LIST_CRITERIA,
  serializeCategoryListUrlState,
} from "../utils/category-list-url-state";
import { resolveCategoryFormReturnTo } from "../utils/category-form-return-to";

export const CategoryCreatePage = () => {
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = resolveCategoryFormReturnTo(searchParams);
  const toast = useToast();
  const submitLock = useRef(false);
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
    mode: "onBlur",
    resolver: zodResolver(categoryFormSchema),
  });
  const createCategoryMutation = useCreateCategory(sessionId);
  const operationPending = createCategoryMutation.isPending || form.formState.isSubmitting;
  const navigationGuard = useCategoryFormNavigationGuard(form.formState.isDirty, operationPending);

  const submitCategory = async (values: CategoryFormValues) => {
    const payload: CategoryCreatePayload = {
      name: values.name,
      ...(values.description.length > 0 ? { description: values.description } : {}),
    };

    try {
      await createCategoryMutation.mutateAsync(payload);
    } catch (error: unknown) {
      if (isCategoryUnauthorizedError(error)) {
        const refreshedSession = await session.refetch();
        if (sessionId !== null && refreshedSession.data?.data.session.id === sessionId) {
          toast.show({
            kind: "error",
            message:
              "La sesión se verificó, pero no se confirmó el resultado de la creación. Revisa el listado antes de volver a intentarlo.",
          });
        }
        return;
      }

      if (sessionId === null || !isCurrentSession(sessionId)) {
        return;
      }

      if (isDuplicateCategoryNameError(error)) {
        form.setError("name", { type: "server", message: categoryNameConflictMessage });
        return;
      }

      if (isInvalidCategoryNameError(error)) {
        form.setError("name", { type: "server", message: invalidCategoryNameMessage });
        return;
      }

      if (isCategoryForbiddenError(error)) {
        form.setError("root.server", {
          type: "server",
          message: "No tienes permiso para crear categorías.",
        });
        return;
      }

      if (isCategoryValidationError(error)) {
        form.setError("root.server", { type: "server", message: categoryValidationMessage });
        return;
      }

      if (isCategoryResponseContractError(error)) {
        form.setError("root.server", {
          type: "server",
          message:
            "La respuesta de creación no se pudo validar. Revisa el listado antes de volver a intentarlo.",
        });
        return;
      }

      if (isUncertainCategoryMutationError(error)) {
        form.setError("root.server", {
          type: "server",
          message:
            "No se pudo confirmar el resultado de la creación. Revisa el listado antes de volver a intentarlo.",
        });
        return;
      }

      form.setError("root.server", {
        type: "server",
        message: "No se pudo crear la categoría. Revisa los datos e inténtalo de nuevo.",
      });
      return;
    }

    if (sessionId === null || !isCurrentSession(sessionId)) {
      return;
    }

    navigationGuard.dismissProtection();
    navigationGuard.resetBlockedNavigation();
    toast.show({ kind: "success", message: "Categoría creada correctamente." });
    const defaultListSearch = serializeCategoryListUrlState({
      page: 1,
      criteria: DEFAULT_CATEGORY_LIST_CRITERIA,
    });
    void navigate(`/categories?${defaultListSearch}`, {
      replace: true,
      state: {
        categoryWriteConfirmed: "created",
        categoryWriteLocation: `/categories?${defaultListSearch}`,
      },
    });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLock.current || createCategoryMutation.isPending) {
      return;
    }

    submitLock.current = true;
    navigationGuard.clearPendingNavigationNotice();
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
          {navigationGuard.showWaitingNotice ? (
            <p className="category-create-form__status" role="status">
              Espera a que termine el guardado antes de salir de esta página.
            </p>
          ) : null}
          {operationPending ? (
            <p className="category-create-form__status" role="status">
              Creando categoría…
            </p>
          ) : null}
          <div className="category-create-form__buttons">
            <Button
              disabled={operationPending}
              onClick={() => navigate(returnTo)}
              type="button"
              variant="secondary"
            >
              Cancelar
            </Button>
            <Button disabled={operationPending} loading={operationPending} type="submit">
              {operationPending ? "Creando categoría…" : "Crear categoría"}
            </Button>
          </div>
        </div>
      </form>
      <CategoryUnsavedChangesDialog
        onContinueEditing={navigationGuard.continueEditing}
        onDiscardChanges={navigationGuard.discardChanges}
        open={
          navigationGuard.blocker.state === "blocked" &&
          !navigationGuard.isNavigationBlockedDuringOperation
        }
      />
    </CategoryPageShell>
  );
};
