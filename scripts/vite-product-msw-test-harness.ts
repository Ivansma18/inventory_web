import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

export const createProductMswTestHarnessPlugin = (projectRoot: string): Plugin => ({
  name: "inventory-product-msw-test-harness",
  apply: "serve",
  configureServer: (server) => {
    const harnessPath = resolve(projectRoot, "tests/browser/fixtures/product-msw-app.tsx").replace(
      /\\/g,
      "/",
    );
    const harnessEntry = encodeURI(`/@fs/${harnessPath}`);
    const workerScriptPath = resolve(projectRoot, "node_modules/msw/lib/mockServiceWorker.js");

    server.middlewares.use((request, response, next) => {
      const requestPath = new URL(request.url ?? "/", "http://vite.local").pathname;

      if (request.method !== "GET") {
        next();
        return;
      }

      if (requestPath === "/mockServiceWorker.js") {
        response.statusCode = 200;
        response.setHeader("Content-Type", "application/javascript; charset=utf-8");
        response.setHeader("Service-Worker-Allowed", "/");
        response.setHeader("Cache-Control", "no-store");
        response.end(readFileSync(workerScriptPath));
        return;
      }

      if (requestPath !== "/__products-msw") {
        next();
        return;
      }

      const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inventory Product MSW E2E Harness</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${harnessEntry}"></script>
  </body>
</html>`;

      void server
        .transformIndexHtml(request.url ?? "/__products-msw", html)
        .then((transformedHtml) => {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(transformedHtml);
        })
        .catch((error: unknown) => {
          next(
            error instanceof Error
              ? error
              : new Error("Product MSW test harness HTML transform failed."),
          );
        });
    });
  },
});
