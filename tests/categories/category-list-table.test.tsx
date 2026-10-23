import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CategoryListTable } from "@/features/categories/components/category-list-table";
import { DEFAULT_CATEGORY_LIST_CRITERIA } from "@/features/categories/utils/category-list-url-state";

describe("category list table empty states", () => {
  it("offers to clear an applied search when no categories match", async () => {
    const user = userEvent.setup();
    const onClearSearch = vi.fn();

    render(
      <CategoryListTable
        criteria={{ ...DEFAULT_CATEGORY_LIST_CRITERIA, search: "teclado" }}
        onClearSearch={onClearSearch}
        onConfirmStatusChange={vi.fn()}
        onEditCategory={vi.fn()}
        onPageChange={vi.fn()}
        onPageCorrection={vi.fn()}
        onRetry={vi.fn()}
        onRetryStatusCheck={vi.fn()}
        checkingCategoryUuids={[]}
        notFoundCategoryUuids={[]}
        pendingCategoryUuids={[]}
        result={{ status: "ready", rows: [], page: 1, total: 0 }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "No se encontraron categorías con esta búsqueda.",
    );
    await user.click(screen.getByRole("button", { name: "Limpiar búsqueda" }));
    expect(onClearSearch).toHaveBeenCalledOnce();
  });

  it("does not offer a search action for a general empty result", () => {
    render(
      <CategoryListTable
        criteria={DEFAULT_CATEGORY_LIST_CRITERIA}
        onClearSearch={vi.fn()}
        onConfirmStatusChange={vi.fn()}
        onEditCategory={vi.fn()}
        onPageChange={vi.fn()}
        onPageCorrection={vi.fn()}
        onRetry={vi.fn()}
        onRetryStatusCheck={vi.fn()}
        checkingCategoryUuids={[]}
        notFoundCategoryUuids={[]}
        pendingCategoryUuids={[]}
        result={{ status: "ready", rows: [], page: 1, total: 0 }}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("No hay categorías para mostrar.");
    expect(screen.queryByRole("button", { name: "Limpiar búsqueda" })).not.toBeInTheDocument();
  });
});
