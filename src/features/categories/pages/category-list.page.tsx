import "./category-list.page.css";

import { useState } from "react";

import { useSession } from "@/features/auth";
import type { DataTableResult, DataTableSnapshot } from "@/shared/ui";

import type { Category } from "../api/category-contract";
import { CategoryListTable } from "../components/category-list-table";
import { CategoryPageShell } from "../components/category-page-shell";
import { useCategoryList } from "../hooks/use-category-list";
import {
  DEFAULT_CATEGORY_LIST_CRITERIA,
  type CategoryListCriteria,
} from "../utils/category-list-url-state";

export const CategoryListPage = () => {
  const session = useSession();
  const [page, setPage] = useState(1);
  const [criteria, setCriteria] = useState<CategoryListCriteria>(DEFAULT_CATEGORY_LIST_CRITERIA);
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const categoryList = useCategoryList(sessionId, page, criteria);
  const snapshot: DataTableSnapshot<Category> | undefined = categoryList.data
    ? {
        rows: categoryList.data.data,
        total: categoryList.data.pagination.total,
        page: categoryList.data.pagination.page,
      }
    : undefined;
  const result: DataTableResult<Category> = categoryList.isFetching
    ? { status: "loading", ...(snapshot ? { snapshot } : {}) }
    : categoryList.isPending
      ? { status: "loading" }
      : categoryList.isError
        ? {
            status: "error",
            message: "No se pudieron cargar las categorías.",
            ...(snapshot ? { snapshot } : {}),
          }
        : snapshot
          ? { status: "ready", ...snapshot }
          : { status: "loading" };
  const clearSearch = () => {
    setCriteria((current) => ({ ...current, search: "" }));
    setPage(1);
  };

  return (
    <CategoryPageShell
      description="Organiza las categorías que utilizas para clasificar tus productos."
      title="Categorías"
    >
      {categoryList.isSuccess ? (
        <p className="category-list__summary" role="status">
          {categoryList.data.pagination.total} categoría
          {categoryList.data.pagination.total === 1 ? "" : "s"}
        </p>
      ) : null}
      <CategoryListTable
        criteria={criteria}
        onClearSearch={clearSearch}
        onPageChange={setPage}
        onRetry={() => void categoryList.refetch()}
        result={result}
      />
    </CategoryPageShell>
  );
};
