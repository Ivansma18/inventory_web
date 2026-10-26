import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { UiProvider } from "@/app/providers/ui.provider";
import { CategorySelector, type CategorySelectorProps } from "@/features/categories";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

const categoriesUrl = "https://inventory.test/api/categories";
const sessionId = "category-selector-session";
const categoryUuid = (index: number) =>
  `550e8400-e29b-41d4-a716-${String(index).padStart(12, "0")}`;

const category = (index: number, name: string, isActive = true) => ({
  uuid: categoryUuid(index),
  name,
  description: null,
  isActive,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

interface HarnessProps extends Omit<
  CategorySelectorProps,
  "value" | "onValueChange" | "sessionId"
> {
  initialValue?: string | null;
  onValueChange?: (value: string | null) => void;
}

const CategorySelectorHarness = ({
  initialValue = null,
  onValueChange,
  ...props
}: HarnessProps) => {
  const [value, setValue] = useState<string | null>(initialValue);

  return (
    <CategorySelector
      {...props}
      sessionId={sessionId}
      value={value}
      onValueChange={(nextValue) => {
        setValue(nextValue);
        onValueChange?.(nextValue);
      }}
    />
  );
};

const queryClients: Array<ReturnType<typeof createQueryClient>> = [];

const renderSelector = (props: HarnessProps = {}) => {
  const queryClient = createQueryClient();
  queryClients.push(queryClient);

  render(
    <QueryClientProvider client={queryClient}>
      <UiProvider>
        <CategorySelectorHarness {...props} />
      </UiProvider>
    </QueryClientProvider>,
  );

  return { queryClient };
};

afterEach(() => {
  for (const queryClient of queryClients.splice(0)) {
    queryClient.clear();
  }
});

describe("category selector", () => {
  it("queries active categories and retains the selection across pages and searches", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    const onValueChange = vi.fn();

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);
        const page = Number(url.searchParams.get("page") ?? 1);
        const search = url.searchParams.get("search") ?? "";

        return HttpResponse.json({
          data: search
            ? [category(3, `Resultado ${search}`)]
            : page === 1
              ? [category(1, "Oficina"), category(2, "Repuestos")]
              : [category(4, "Limpieza")],
          pagination: { total: search ? 1 : 31, page, limit: 15 },
        });
      }),
      http.get(`${categoriesUrl}/${categoryUuid(1)}`, () =>
        HttpResponse.json({ data: category(1, "Oficina") }),
      ),
    );

    renderSelector({ onValueChange });

    const select = await screen.findByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(select).toBeEnabled());

    expect(requests).toHaveLength(1);
    expect(requests[0]?.searchParams.get("isActive")).toBe("true");
    expect(requests[0]?.searchParams.get("sort")).toBe("name");
    expect(requests[0]?.searchParams.get("order")).toBe("asc");
    expect(requests[0]?.searchParams.get("page")).toBe("1");
    expect(requests[0]?.searchParams.get("search")).toBeNull();

    expect(
      screen.queryByRole("button", {
        name: /crear categoría|editar categoría|activar categoría|desactivar categoría/i,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    select.focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveValue("Oficina"),
    );
    expect(onValueChange).toHaveBeenLastCalledWith(categoryUuid(1));

    await user.click(screen.getByRole("button", { name: "Página siguiente de categorías" }));
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.searchParams.get("page")).toBe("2");
    expect(requests[1]?.searchParams.get("search")).toBeNull();
    expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveValue("Oficina");

    const search = screen.getByRole("searchbox", { name: "Buscar categorías activas" });
    await user.type(search, "repuesto");
    await user.click(screen.getByRole("button", { name: "Buscar categorías" }));
    await waitFor(() => expect(requests).toHaveLength(3));
    expect(requests[2]?.searchParams.get("search")).toBe("repuesto");
    expect(requests[2]?.searchParams.get("page")).toBe("1");
    expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveValue("Oficina");
    expect(onValueChange).toHaveBeenCalledTimes(1);
  });

  it("keeps an original category outside the active results without clearing it", async () => {
    const user = userEvent.setup();
    const requests: URL[] = [];
    const detailRequests: URL[] = [];
    const onValueChange = vi.fn();

    server.use(
      http.get(categoriesUrl, ({ request }) => {
        const url = new URL(request.url);
        requests.push(url);

        return HttpResponse.json({
          data: [category(2, "Repuestos")],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
      http.get(`${categoriesUrl}/${categoryUuid(1)}`, ({ request }) => {
        detailRequests.push(new URL(request.url));
        return HttpResponse.json({ data: category(1, "Oficina", false) });
      }),
    );

    renderSelector({
      initialValue: categoryUuid(1),
      originalCategoryUuid: categoryUuid(1),
      required: true,
      onValueChange,
    });

    await screen.findByRole("textbox", { name: "Categoría" });
    const getSelect = () => screen.getByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(getSelect()).toHaveValue("Oficina (categoría actual)"));

    expect(requests).toHaveLength(1);
    expect(detailRequests).toHaveLength(1);
    expect(detailRequests[0]?.pathname).toBe(`/api/categories/${categoryUuid(1)}`);
    expect(onValueChange).not.toHaveBeenCalled();

    getSelect().focus();
    await user.keyboard("{ArrowDown}");
    await user.keyboard("{Escape}");

    expect(getSelect()).toHaveValue("Oficina (categoría actual)");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("keeps the original category when the active options fail and offers a retry", async () => {
    let listRequests = 0;

    server.use(
      http.get(categoriesUrl, () => {
        listRequests += 1;

        if (listRequests === 1) {
          return HttpResponse.json(
            { error: { code: "INTERNAL_ERROR", message: "private details" } },
            { status: 503 },
          );
        }

        return HttpResponse.json({
          data: [category(2, "Repuestos")],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
      http.get(`${categoriesUrl}/${categoryUuid(1)}`, () =>
        HttpResponse.json({ data: category(1, "Oficina", false) }),
      ),
    );

    renderSelector({
      initialValue: categoryUuid(1),
      originalCategoryUuid: categoryUuid(1),
      required: true,
    });

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("No se pudieron cargar las categorías activas.");
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveValue(
        "Oficina (categoría actual)",
      ),
    );

    await userEvent.setup().click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(listRequests).toBe(2));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Categoría" })).toHaveValue(
      "Oficina (categoría actual)",
    );
  });

  it("requires refreshing options before choosing again after a rejected assignment", async () => {
    const user = userEvent.setup();
    let listRequests = 0;
    const onOptionsRefreshed = vi.fn();

    server.use(
      http.get(categoriesUrl, () => {
        listRequests += 1;

        return HttpResponse.json({
          data: [category(listRequests, listRequests === 1 ? "Oficina" : "Papelería")],
          pagination: { total: 1, page: 1, limit: 15 },
        });
      }),
    );

    renderSelector({ refreshRequired: true, onOptionsRefreshed });

    const select = await screen.findByRole("textbox", { name: "Categoría" });
    await waitFor(() => expect(listRequests).toBe(1));
    expect(select).toBeDisabled();
    expect(screen.getByRole("searchbox", { name: "Buscar categorías activas" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Buscar categorías" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Actualizar categorías activas" }));

    await waitFor(() => expect(listRequests).toBe(2));
    expect(onOptionsRefreshed).toHaveBeenCalledTimes(1);
    expect(select).toBeDisabled();
  });
});
