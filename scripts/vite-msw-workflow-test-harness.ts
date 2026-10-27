import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const workflowHarnesses: Record<string, { entry: string; title: string }> = {
  "/__products-msw": {
    entry: "tests/browser/fixtures/product-msw-app.tsx",
    title: "Inventory Product MSW E2E Harness",
  },
  "/__categories-msw": {
    entry: "tests/browser/fixtures/category-msw-app.tsx",
    title: "Inventory Category MSW E2E Harness",
  },
};

export const createMswWorkflowTestHarnessPlugin = (projectRoot: string): Plugin => ({
  name: "inventory-msw-workflow-test-harness",
  apply: "serve",
  configureServer: (server) => {
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

      const harness = workflowHarnesses[requestPath];
      if (!harness) {
        next();
        return;
      }

      const harnessPath = resolve(projectRoot, harness.entry).replace(/\\/g, "/");
      const harnessEntry = encodeURI(`/@fs/${harnessPath}`);
      const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${harness.title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${harnessEntry}"></script>
  </body>
</html>`;

      void server
        .transformIndexHtml(request.url ?? requestPath, html)
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
              : new Error("MSW workflow test harness HTML transform failed."),
          );
        });
    });
  },
});
