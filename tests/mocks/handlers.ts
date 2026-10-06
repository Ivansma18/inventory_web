import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("https://inventory.test/api/bootstrap-health", () =>
    HttpResponse.json({ source: "default-handler" }),
  ),
];
