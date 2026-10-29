import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://inventory.test/api/bootstrap-health", () =>
    HttpResponse.json({ source: "default-handler" }),
  ),
  http.get("https://inventory.test/api/inventory/:productUuid/movements", () =>
    HttpResponse.json({ data: [], pagination: { total: 0, page: 1, limit: 1 } }),
  ),
];
