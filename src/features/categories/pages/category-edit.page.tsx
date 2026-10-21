import "./category-edit.page.css";

import { useRef, useState, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { isCurrentSession, useSession } from "@/features/auth";
import { Badge, Button, useToast } from "@/shared/ui";

import type { Category } from "../api/category-contract";
import { categoryUuidSchema } from "../api/category-contract";
import { CategoryFormFields } from "../components/category-form-fields";
import { CategoryPageShell } from "../components/category-page-shell";
import { CategoryUnsavedChangesDialog } from "../components/category-unsaved-changes-dialog";
import { useCategory } from "../hooks/use-category";
import { useCategoryFormNavigationGuard } from "../hooks/use-category-form-navigation-guard";
import { useUpdateCategory } from "../hooks/use-update-category";
import {
  categoryFormSchema,
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
import { buildCategoryUpdatePayload } from "../utils/category-update-payload";
import {
  DEFAULT_CATEGORY_LIST_RETURN_TO,
  parseCategoryEditReturnTo,
} from "../utils/category-edit-return-to";

const getHttpErrorStatus = (error: unknown): number | null => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("kind" in error) ||
    error.kind !== "http" ||
    !("status" in error) ||
    typeof error.status !== "number"
  ) {
    return null;
  }

  return error.status;
};

const isNetworkError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "kind" in error && error.kind === "network";

const isRetryableCategoryLoadError = (error: unknown): boolean => {
  if (isNetworkError(error)) {
    return true;
  }

  const status = getHttpErrorStatus(error);
  return status !== null && status >= 500 && status < 600;
};

interface LoadedCategoryFieldsProps {
  category: Category;
  returnTo: string;
  sessionId: string | null;
}

const LoadedCategoryFields = ({ category, returnTo, sessionId }: LoadedCategoryFieldsProps) => {
  const [initialCategory] = useState(() => category);
  const session = useSession();
  const submitLock = useRef(false);
  const navigate = useNavigate();
  const toast = useToast();
  const updateCategoryMutation = useUpdateCategory(sessionId);
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: {
      name: category.name,
      description: category.description ?? "",
    },
    mode: "onBlur",
    resolver: zodResolver(categoryFormSchema),
  });
  const operationPending = updateCategoryMutation.isPending || form.formState.isSubmitting;
  const navigationGuard = useCategoryFormNavigationGuard(form.formState.isDirty, operationPending);

  const submitCategory = async (values: CategoryFormValues) => {
    const payload = buildCategoryUpdatePayload(initialCategory, values);
    if (payload === null) {
      return;
    }

    try {
      await updateCategoryMutation.mutateAsync({
        uuid: initialCategory.uuid,
        isActive: initialCategory.isActive,
        payload,
      });
    } catch (error: unknown) {
      if (isCategoryUnauthorizedError(error)) {
        const refreshedSession = await session.refetch();
        if (sessionId !== null && refreshedSession.data?.data.session.id === sessionId) {
          toast.show({
            kind: "error",
            message:
              "La sesión se verificó, pero no se confirmó el resultado de la actualización. Revisa la categoría antes de volver a intentarlo.",
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
          message: "No tienes permiso para editar esta categoría.",
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
            "La respuesta de actualización no se pudo validar. Revisa la categoría antes de volver a intentarlo.",
        });
        return;
      }

      if (isUncertainCategoryMutationError(error)) {
        form.setError("root.server", {
          type: "server",
          message:
            "No se pudo confirmar el resultado de la actualización. Revisa la categoría antes de volver a intentarlo.",
        });
        return;
      }

      form.setError("root.server", {
        type: "server",
        message: "No se pudieron guardar los cambios. Revisa los datos e inténtalo de nuevo.",
      });
      return;
    }

    if (sessionId === null || !isCurrentSession(sessionId)) {
      return;
    }

    navigationGuard.dismissProtection();
    navigationGuard.resetBlockedNavigation();
    toast.show({ kind: "success", message: "Categoría actualizada correctamente." });
    void navigate(returnTo, { replace: true });
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (submitLock.current || updateCategoryMutation.isPending) {
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
    <div className="category-edit-page__loaded">
      <p className="category-edit-page__category-status">
        Estado:{" "}
        <Badge
          label={initialCategory.isActive ? "Activa" : "Inactiva"}
          tone={initialCategory.isActive ? "success" : "neutral"}
        />
      </p>
      <form
        aria-busy={operationPending || undefined}
        aria-labelledby="category-form-fields-heading"
        className="category-edit-page__form"
        noValidate
        onSubmit={handleFormSubmit}
      >
        <CategoryFormFields disabled={operationPending} form={form} />
        <div className="category-edit-page__actions">
          {form.formState.errors.root?.server?.message ? (
            <p className="category-edit-page__error" role="alert">
              {form.formState.errors.root.server.message}
            </p>
          ) : null}
          {navigationGuard.showWaitingNotice ? (
            <p className="category-edit-page__status" role="status">
              Espera a que termine el guardado antes de salir de esta página.
            </p>
          ) : null}
          {operationPending ? (
            <p className="category-edit-page__status" role="status">
              Guardando cambios de la categoría…
            </p>
          ) : null}
          <Button
            disabled={operationPending || !form.formState.isDirty}
            loading={operationPending}
            type="submit"
          >
            {operationPending ? "Guardando cambios…" : "Guardar cambios"}
          </Button>
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
    </div>
  );
};

export const CategoryEditPage = () => {
  const { uuid = "" } = useParams();
  const session = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const validUuid = categoryUuidSchema.safeParse(uuid).success;
  const categoryQuery = useCategory(sessionId, validUuid ? uuid : null);
  const status = getHttpErrorStatus(categoryQuery.error);
  const isNotFound = status === 404;
  const canRetry = !isNotFound && isRetryableCategoryLoadError(categoryQuery.error);
  const returnTo =
    parseCategoryEditReturnTo(searchParams.get("returnTo")) ?? DEFAULT_CATEGORY_LIST_RETURN_TO;
  const returnToList = () => navigate(returnTo);

  return (
    <CategoryPageShell
      description="Consulta y actualiza la información de esta categoría."
      title="Editar categoría"
    >
      {!validUuid ? (
        <div className="category-edit-page__feedback">
          <p className="category-edit-page__error" role="alert">
            La dirección de la categoría no es válida.
          </p>
          <Button onClick={returnToList} variant="secondary">
            Volver al listado
          </Button>
        </div>
      ) : isNotFound ? (
        <div className="category-edit-page__feedback">
          <p className="category-edit-page__error" role="alert">
            No se encontró la categoría.
          </p>
          <Button onClick={returnToList} variant="secondary">
            Volver al listado
          </Button>
        </div>
      ) : categoryQuery.data ? (
        <LoadedCategoryFields
          category={categoryQuery.data}
          key={categoryQuery.data.uuid}
          returnTo={returnTo}
          sessionId={sessionId}
        />
      ) : categoryQuery.isPending ? (
        <p aria-live="polite" className="category-edit-page__status" role="status">
          Cargando datos de la categoría…
        </p>
      ) : categoryQuery.isError ? (
        <div className="category-edit-page__feedback">
          <p className="category-edit-page__error" role="alert">
            {canRetry
              ? "No se pudo cargar la categoría por un problema de conexión o del servidor."
              : "No se pudieron cargar los datos de la categoría."}
          </p>
          {canRetry && categoryQuery.isFetching ? (
            <p className="category-edit-page__status" role="status">
              Reintentando la carga de la categoría…
            </p>
          ) : null}
          <div className="category-edit-page__actions">
            <Button onClick={returnToList} variant="secondary">
              Volver al listado
            </Button>
            {canRetry ? (
              <Button
                loading={categoryQuery.isFetching}
                onClick={() => void categoryQuery.refetch()}
                variant="secondary"
              >
                Reintentar
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </CategoryPageShell>
  );
};
