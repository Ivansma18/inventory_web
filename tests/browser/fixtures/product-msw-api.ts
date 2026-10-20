import { http, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";

const initialProductUuid = "550e8400-e29b-41d4-a716-446655440041";
const createdProductUuid = "550e8400-e29b-41d4-a716-446655440043";
const categoryUuid = "550e8400-e29b-41d4-a716-446655440042";

interface ProductFixture {
  uuid: string;
  sku: string;
  name: string;
  description: string | null;
  purchasePrice: number;
  salePrice: number;
  categoryUuid: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ProductMswRequest {
  method: string;
  path: string;
  body?: unknown;
}

declare global {
  interface Window {
    __productMswRequests?: ProductMswRequest[];
  }
}

const initialProduct: ProductFixture = {
  uuid: initialProductUuid,
  sku: "SKU-WORKFLOW-001",
  name: "Producto inicial de flujo E2E",
  description: null,
  purchasePrice: 25.5,
  salePrice: 31.25,
  categoryUuid,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const activeCategory = {
  uuid: categoryUuid,
  name: "Categoría de flujos E2E",
  description: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const products: ProductFixture[] = [initialProduct];

const recordRequest = (request: Request, body?: unknown) => {
  const url = new URL(request.url);
  const requests = window.__productMswRequests ?? [];
  requests.push({
    method: request.method,
    path: url.pathname,
    ...(body === undefined ? {} : { body }),
  });
  window.__productMswRequests = requests;
};

const listProducts = (request: Request) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search")?.toLocaleLowerCase() ?? "";
  const status = url.searchParams.get("status") ?? "active";
  const matchingProducts = products.filter((product) => {
    const matchesStatus = status === "inactive" ? !product.isActive : product.isActive;
    const matchesSearch =
      !search ||
      product.sku.toLocaleLowerCase().includes(search) ||
      product.name.toLocaleLowerCase().includes(search);
    return matchesStatus && matchesSearch;
  });

  return HttpResponse.json({
    data: matchingProducts,
    pagination: {
      total: matchingProducts.length,
      page: Number(url.searchParams.get("page") ?? 1),
      limit: Number(url.searchParams.get("limit") ?? 15),
    },
  });
};

export const productMswWorker = setupWorker(
  http.get("/api/auth/get-session", ({ request }) => {
    recordRequest(request);
    return HttpResponse.json({
      data: {
        user: { id: "product-workflow-user", email: "operator@example.com", role: "OPERATOR" },
        session: { id: "product-workflow-session", createdAt: "2026-01-01T00:00:00.000Z" },
      },
    });
  }),
  http.get("/api/backend/categories", ({ request }) => {
    recordRequest(request);
    return HttpResponse.json({
      data: [activeCategory],
      pagination: { total: 1, page: 1, limit: 15 },
    });
  }),
  http.get("/api/backend/products", ({ request }) => {
    recordRequest(request);
    return listProducts(request);
  }),
  http.get("/api/backend/products/:uuid", ({ params, request }) => {
    recordRequest(request);
    const product = products.find(({ uuid }) => uuid === params.uuid);
    return product
      ? HttpResponse.json({ data: product })
      : HttpResponse.json({ error: { code: "PRODUCT_NOT_FOUND" } }, { status: 404 });
  }),
  http.post("/api/backend/products", async ({ request }) => {
    const payload = (await request.json()) as Omit<
      ProductFixture,
      "uuid" | "isActive" | "createdAt" | "updatedAt" | "description"
    > & { description?: string };
    recordRequest(request, payload);

    const createdProduct: ProductFixture = {
      ...payload,
      uuid: createdProductUuid,
      description: payload.description ?? null,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    products.push(createdProduct);
    return HttpResponse.json({ data: createdProduct }, { status: 201 });
  }),
  http.patch("/api/backend/products/:uuid", async ({ params, request }) => {
    const payload = (await request.json()) as Partial<ProductFixture>;
    recordRequest(request, payload);
    const product = products.find(({ uuid }) => uuid === params.uuid);
    if (!product) {
      return HttpResponse.json({ error: { code: "PRODUCT_NOT_FOUND" } }, { status: 404 });
    }

    Object.assign(product, payload, { updatedAt: "2026-01-02T00:00:00.000Z" });
    return HttpResponse.json({ data: product });
  }),
  http.delete("/api/backend/products/:uuid", ({ params, request }) => {
    recordRequest(request);
    const product = products.find(({ uuid }) => uuid === params.uuid);
    if (!product) {
      return HttpResponse.json({ error: { code: "PRODUCT_NOT_FOUND" } }, { status: 404 });
    }

    product.isActive = false;
    return HttpResponse.json({ data: { uuid: product.uuid, isActive: false } });
  }),
);
