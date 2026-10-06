import { resolve } from "node:path";
import type { Plugin } from "vite";

export const createAuthTestHarnessPlugin = (projectRoot: string): Plugin => ({
  name: "inventory-auth-test-harness",
  apply: "serve",
  configureServer: (server) => {
    const harnessPath = resolve(projectRoot, "tests/browser/auth-real-harness.tsx").replace(
      /\\/g,
      "/",
    );
    const harnessEntry = encodeURI(`/@fs/${harnessPath}`);

    server.middlewares.use((request, response, next) => {
      const requestPath = new URL(request.url ?? "/", "http://vite.local").pathname;
      if (request.method !== "GET" || requestPath !== "/__auth-test") {
        next();
        return;
      }

      const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inventory Auth Test Harness</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${harnessEntry}"></script>
  </body>
</html>`;

      void server
        .transformIndexHtml(request.url ?? "/__auth-test", html)
        .then((transformedHtml) => {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(transformedHtml);
        })
        .catch((error: unknown) => {
          next(
            error instanceof Error ? error : new Error("Auth test harness HTML transform failed."),
          );
        });
    });
  },
});
