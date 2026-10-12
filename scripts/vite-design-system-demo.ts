import type { Plugin } from "vite";

const designSystemDemoHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Inventory — Design System</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/dev/design-system/main.tsx"></script>
  </body>
</html>`;

export const createDesignSystemDemoPlugin = (): Plugin => ({
  name: "inventory-design-system-demo",
  apply: "serve",
  configureServer: (server) => {
    server.middlewares.use((request, response, next) => {
      const requestPath = new URL(request.url ?? "/", "http://vite.local").pathname;
      if (request.method !== "GET" || requestPath !== "/__design-system") {
        next();
        return;
      }

      void server
        .transformIndexHtml(request.url ?? "/__design-system", designSystemDemoHtml)
        .then((html) => {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/html; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(html);
        })
        .catch((error: unknown) => {
          next(
            error instanceof Error ? error : new Error("Design System demo HTML transform failed."),
          );
        });
    });
  },
});
