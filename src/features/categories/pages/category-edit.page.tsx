import "./category-edit.page.css";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router";

import { useSession } from "@/features/auth";
import { Badge, Button } from "@/shared/ui";

import type { Category } from "../api/category-contract";
import { categoryUuidSchema } from "../api/category-contract";
import { CategoryFormFields } from "../components/category-form-fields";
import { CategoryPageShell } from "../components/category-page-shell";
import { useCategory } from "../hooks/use-category";
import {
  categoryFormSchema,
  type CategoryFormInput,
  type CategoryFormValues,
} from "../schemas/category-form.schema";
import {
  DEFAULT_CATEGORY_LIST_CRITERIA,
  serializeCategoryListUrlState,
} from "../utils/category-list-url-state";

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

const LoadedCategoryFields = ({ category }: { category: Category }) => {
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: {
      name: category.name,
      description: category.description ?? "",
    },
    mode: "onBlur",
    resolver: zodResolver(categoryFormSchema),
  });

  return (
    <div className="category-edit-page__loaded">
      <p className="category-edit-page__category-status">
        Estado:{" "}
        <Badge
          label={category.isActive ? "Activa" : "Inactiva"}
          tone={category.isActive ? "success" : "neutral"}
        />
      </p>
      <CategoryFormFields form={form} />
    </div>
  );
};

export const CategoryEditPage = () => {
  const { uuid = "" } = useParams();
  const session = useSession();
  const navigate = useNavigate();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const validUuid = categoryUuidSchema.safeParse(uuid).success;
  const categoryQuery = useCategory(sessionId, validUuid ? uuid : null);
  const status = getHttpErrorStatus(categoryQuery.error);
  const isNotFound = status === 404;
  const canRetry = !isNotFound && isRetryableCategoryLoadError(categoryQuery.error);
  const defaultListSearch = serializeCategoryListUrlState({
    page: 1,
    criteria: DEFAULT_CATEGORY_LIST_CRITERIA,
  });
  const returnToList = () => navigate(`/categories?${defaultListSearch}`);

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
        <LoadedCategoryFields category={categoryQuery.data} key={categoryQuery.data.uuid} />
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
