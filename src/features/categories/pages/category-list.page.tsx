import "./category-list.page.css";

import { useState } from "react";

import { useSession } from "@/features/auth";
import { Badge, DataTable } from "@/shared/ui";
import type { DataTableColumn, DataTableResult, DataTableSnapshot } from "@/shared/ui";

import { CATEGORY_LIST_PAGE_SIZE } from "../api/categories-api";
import type { Category } from "../api/category-contract";
import { CategoryPageShell } from "../components/category-page-shell";
import { useCategoryList } from "../hooks/use-category-list";
import { DEFAULT_CATEGORY_LIST_CRITERIA } from "../utils/category-list-url-state";

const categoryColumns: DataTableColumn<Category>[] = [
  { key: "name", header: "Nombre", sortable: false },
  {
    key: "isActive",
    header: "Estado",
    render: (category) => (
      <span className="category-list__status">
        <Badge
          label={category.isActive ? "Activa" : "Inactiva"}
          tone={category.isActive ? "success" : "neutral"}
        />
      </span>
    ),
    sortable: false,
  },
];

export const CategoryListPage = () => {
  const session = useSession();
  const [page, setPage] = useState(1);
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const categoryList = useCategoryList(sessionId, page, DEFAULT_CATEGORY_LIST_CRITERIA);
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
      <DataTable
        allowHorizontalScroll
        columns={categoryColumns}
        onPageChange={setPage}
        onSortChange={() => {}}
        pageSize={CATEGORY_LIST_PAGE_SIZE}
        result={result}
        rowKey="uuid"
        sort={null}
      />
    </CategoryPageShell>
  );
};
