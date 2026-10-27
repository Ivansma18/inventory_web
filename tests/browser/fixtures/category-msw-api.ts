import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";

const categoriesPath = "/api/backend/categories";
const associatedCategoryUuid = "550e8400-e29b-41d4-a716-446655440057";

interface CategoryFixture {
  uuid: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CategoryMswRequest {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

declare global {
  interface Window {
    __categoryMswRequests?: CategoryMswRequest[];
  }
}

const initialCategories: CategoryFixture[] = [
  {
    uuid: "550e8400-e29b-41d4-a716-446655440055",
    name: "Herramientas",
    description: "Herramientas para mantenimiento",
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    uuid: associatedCategoryUuid,
    name: "Material con productos asociados",
    description: "Categoría protegida por el fixture",
    isActive: true,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    uuid: "550e8400-e29b-41d4-a716-446655440058",
    name: "Artículos de limpieza",
    description: null,
    isActive: true,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    uuid: "550e8400-e29b-41d4-a716-446655440059",
    name: "Archivo inactivo",
    description: null,
    isActive: false,
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
];

const categories = initialCategories.map((category) => ({ ...category }));

const recordRequest = (request: Request, body?: unknown) => {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const requests = window.__categoryMswRequests ?? [];

  requests.push({
    method: request.method,
    path: url.pathname,
    ...(Object.keys(query).length > 0 ? { query } : {}),
    ...(body === undefined ? {} : { body }),
  });
  window.__categoryMswRequests = requests;
};

const listCategories = (request: Request) => {
  const url = new URL(request.url);
  const isActive = url.searchParams.get("isActive");
  const search = url.searchParams.get("search")?.trim().toLocaleLowerCase() ?? "";
  const sort = url.searchParams.get("sort") ?? "name";
  const order = url.searchParams.get("order") ?? "asc";
  const page = Number(url.searchParams.get("page") ?? 1);
  const limit = Number(url.searchParams.get("limit") ?? 15);
  const matchingCategories = categories
    .filter((category) => {
      const matchesStatus = isActive === null || String(category.isActive) === isActive;
      const matchesSearch = category.name.toLocaleLowerCase().includes(search);
      return matchesStatus && matchesSearch;
    })
    .sort((left, right) => {
      const leftValue =
        sort === "createdAt" ? left.createdAt : sort === "updatedAt" ? left.updatedAt : left.name;
      const rightValue =
        sort === "createdAt"
          ? right.createdAt
          : sort === "updatedAt"
            ? right.updatedAt
            : right.name;
      const comparison = leftValue.localeCompare(rightValue);
      return order === "desc" ? -comparison : comparison;
    });

  return HttpResponse.json({
    data: matchingCategories.slice((page - 1) * limit, page * limit),
    pagination: { total: matchingCategories.length, page, limit },
  });
};

export const categoryMswWorker = setupWorker(
  http.get("/api/auth/get-session", ({ request }) => {
    recordRequest(request);
    return HttpResponse.json({
      data: {
        user: { id: "category-workflow-user", email: "operator@example.invalid", role: "OPERATOR" },
        session: { id: "category-workflow-session", createdAt: "2026-01-01T00:00:00.000Z" },
      },
    });
  }),
  http.get(categoriesPath, ({ request }) => {
    recordRequest(request);
    return listCategories(request);
  }),
  http.get(`${categoriesPath}/:uuid`, ({ params, request }) => {
    recordRequest(request);
    const category = categories.find((candidate) => candidate.uuid === params.uuid);

    return category
      ? HttpResponse.json({ data: category })
      : HttpResponse.json({ error: { code: "CATEGORY_NOT_FOUND" } }, { status: 404 });
  }),
  http.post(categoriesPath, async ({ request }) => {
    const payload = (await request.json()) as { name: string; description?: string };
    recordRequest(request, payload);

    const createdCategory: CategoryFixture = {
      uuid: "550e8400-e29b-41d4-a716-446655440056",
      name: payload.name,
      description: payload.description ?? null,
      isActive: true,
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
    };
    categories.push(createdCategory);

    return HttpResponse.json({ data: createdCategory }, { status: 201 });
  }),
  http.patch(`${categoriesPath}/:uuid`, async ({ params, request }) => {
    const payload = (await request.json()) as Partial<CategoryFixture>;
    recordRequest(request, payload);
    const category = categories.find((candidate) => candidate.uuid === params.uuid);

    if (!category) {
      return HttpResponse.json({ error: { code: "CATEGORY_NOT_FOUND" } }, { status: 404 });
    }

    if (category.uuid === associatedCategoryUuid && payload.isActive === false) {
      return HttpResponse.json(
        {
          error: {
            code: "CATEGORY_HAS_ASSOCIATED_PRODUCTS",
            message: "Category has associated products.",
          },
        },
        { status: 409 },
      );
    }

    Object.assign(category, payload, { updatedAt: "2026-02-02T00:00:00.000Z" });
    return HttpResponse.json({ data: category });
  }),
  http.all(categoriesPath, ({ request }) => {
    recordRequest(request);
    return HttpResponse.json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
  }),
  http.all(`${categoriesPath}/:uuid`, ({ request }) => {
    recordRequest(request);
    return HttpResponse.json({ error: { code: "METHOD_NOT_ALLOWED" } }, { status: 405 });
  }),
  http.all("/api/*", ({ request }) => {
    recordRequest(request);
    return HttpResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  }),
);
