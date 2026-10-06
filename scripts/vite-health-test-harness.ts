import { resolve } from "node:path";
import type { Plugin } from "vite";

export const createHealthTestHarnessPlugin = (projectRoot: string): Plugin => ({
  name: "inventory-health-test-harness",
  apply: "serve",
  configureServer: (server) => {
    const harnessPath = resolve(projectRoot, "tests/browser/health-real-client-harness.ts").replace(
      /\\/g,
      "/",
    );
    const harnessEntry = encodeURI(`/@fs/${harnessPath}`);

    server.middlewares.use((request, response, next) => {
      const requestPath = new URL(request.url ?? "/", "http://vite.local").pathname;
      if (request.method !== "GET" || requestPath !== "/__health-test") {
        next();
        return;
      }

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inventory Local Health Check</title>
  </head>
  <body>
    <main>
      <h1>Local backend health check</h1>
      <p id="health-result" data-testid="health-result" data-status="pending" role="status" aria-live="polite">Checking local backend health...</p>
    </main>
    <script type="module" src="${harnessEntry}"></script>
  </body>
</html>`;

      void server
        .transformIndexHtml(request.url ?? "/__health-test", html)
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
              : new Error("Health test harness HTML transform failed."),
          );
        });
    });
  },
});
