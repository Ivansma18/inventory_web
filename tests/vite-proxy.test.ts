import { createServer as createHttpServer, type Server } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import type { AddressInfo } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer, preview as createVitePreview } from "vite";
import { describe, expect, it } from "vitest";

import { createApiProxy, rewriteBusinessApiPath } from "../scripts/vite-proxy";
import { server as mswServer } from "./mocks/server";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const configFile = resolve(projectRoot, "vite.config.ts");
const browserOrigin = "http://localhost:5174";
const environmentKeys = ["VITE_APP_NAME", "VITE_API_URL", "API_PROXY_TARGET"] as const;

type RecordedRequest = {
  body: string;
  method: string;
  origin: string | undefined;
  url: string | undefined;
};

const withEnvironment = async <T>(
  values: Record<(typeof environmentKeys)[number], string>,
  run: () => Promise<T>,
): Promise<T> => {
  const previousValues = new Map<string, string | undefined>();

  for (const key of environmentKeys) {
    previousValues.set(key, process.env[key]);
    process.env[key] = values[key];
  }

  try {
    return await run();
  } finally {
    for (const [key, previousValue] of previousValues) {
      if (previousValue === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = previousValue;
      }
    }
  }
};

const listen = (server: Server): Promise<AddressInfo> =>
  new Promise((resolveAddress, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolveAddress(server.address() as AddressInfo);
    });
  });

const closeHttpServer = (server: {
  close: (callback: (error?: Error) => void) => unknown;
}): Promise<void> =>
  new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });

const createRecordingBackend = async () => {
  const requests: RecordedRequest[] = [];
  const server = createHttpServer((request, response) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
    });
    request.on("end", () => {
      requests.push({
        body,
        method: request.method ?? "",
        origin: request.headers.origin,
        url: request.url,
      });
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ ok: true }));
    });
  });
  const address = await listen(server);

  return {
    origin: `http://127.0.0.1:${address.port}`,
    requests,
    server,
  };
};

const validEnvironment = (proxyTarget: string) => ({
  VITE_APP_NAME: "Inventory",
  VITE_API_URL: "/api/backend",
  API_PROXY_TARGET: proxyTarget,
});

const withRealHttp = async (run: () => Promise<void>): Promise<void> => {
  mswServer.close();
  try {
    await run();
  } finally {
    mswServer.listen({ onUnhandledRequest: "error" });
  }
};

describe("Vite proxy path rules", () => {
  it("rewrites only the business API prefix and preserves its query string", () => {
    expect(rewriteBusinessApiPath("/api/backend/products?page=2&active=true")).toBe(
      "/products?page=2&active=true",
    );
    expect(rewriteBusinessApiPath("/api/backend?health=full")).toBe("/?health=full");
    expect(rewriteBusinessApiPath("/api/backendish/products?page=2")).toBe(
      "/api/backendish/products?page=2",
    );
    expect(rewriteBusinessApiPath("/products?page=2")).toBe("/products?page=2");
  });

  it("leaves Auth paths untouched and uses boundary-matched proxy keys", () => {
    const proxy = createApiProxy("http://localhost:3000");
    const auth = proxy["^/api/auth(?:/|\\?|$)"];
    const business = proxy["^/api/backend(?:/|\\?|$)"];

    expect(auth).toMatchObject({
      target: "http://localhost:3000",
      changeOrigin: true,
    });
    expect(auth).not.toHaveProperty("rewrite");
    expect(business).toMatchObject({
      target: "http://localhost:3000",
      changeOrigin: true,
    });
    expect(business.rewrite?.("/api/backend/products?page=2")).toBe("/products?page=2");
    expect(auth).not.toHaveProperty("headers.origin");
    expect(business).not.toHaveProperty("headers.origin");
  });
});

describe("Vite development proxy integration", () => {
  it("preserves Auth paths, rewrites business paths and preserves Origin", async () => {
    await withRealHttp(async () => {
      const backend = await createRecordingBackend();

      try {
        await withEnvironment(validEnvironment(backend.origin), async () => {
          const server = await createViteServer({
            configFile,
            logLevel: "silent",
            server: { host: "127.0.0.1", port: 0, strictPort: true },
          });

          try {
            await server.listen();
            const httpServer = server.httpServer;
            if (!httpServer) {
              throw new Error("Vite development server did not create an HTTP server.");
            }
            const address = httpServer.address() as AddressInfo;
            const origin = `http://127.0.0.1:${address.port}`;
            const authResponse = await fetch(`${origin}/api/auth/sign-in/email?flow=local-test`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
                origin: browserOrigin,
              },
              body: JSON.stringify({ email: "test@example.invalid" }),
            });
            const businessResponse = await fetch(
              `${origin}/api/backend/products?page=2&active=true`,
              { headers: { origin: browserOrigin } },
            );
            const authRootResponse = await fetch(`${origin}/api/auth?flow=root`, {
              headers: { origin: browserOrigin },
            });
            const businessRootResponse = await fetch(`${origin}/api/backend?health=full`, {
              headers: { origin: browserOrigin },
            });

            expect(authResponse.status).toBe(200);
            expect(businessResponse.status).toBe(200);
            expect(authRootResponse.status).toBe(200);
            expect(businessRootResponse.status).toBe(200);
            expect(backend.requests).toEqual([
              {
                method: "POST",
                url: "/api/auth/sign-in/email?flow=local-test",
                origin: browserOrigin,
                body: JSON.stringify({ email: "test@example.invalid" }),
              },
              {
                method: "GET",
                url: "/products?page=2&active=true",
                origin: browserOrigin,
                body: "",
              },
              {
                method: "GET",
                url: "/api/auth?flow=root",
                origin: browserOrigin,
                body: "",
              },
              {
                method: "GET",
                url: "/?health=full",
                origin: browserOrigin,
                body: "",
              },
            ]);

            const requestCount = backend.requests.length;
            await fetch(`${origin}/api/authentic/sign-in`);
            await fetch(`${origin}/api/backendish/products`);
            await fetch(`${origin}/products`);
            expect(backend.requests).toHaveLength(requestCount);
          } finally {
            await server.close();
          }
        });
      } finally {
        await closeHttpServer(backend.server);
      }
    });
  });
});

describe("Vite preview proxy integration", () => {
  it("reuses the local business proxy and preserves the request Origin", async () => {
    await withRealHttp(async () => {
      const backend = await createRecordingBackend();
      const previewRoot = await mkdtemp(join(tmpdir(), "inventory-vite-preview-"));
      let previewServer: Awaited<ReturnType<typeof createVitePreview>> | undefined;

      try {
        const outDir = join(previewRoot, "dist");
        await mkdir(outDir, { recursive: true });
        await writeFile(join(outDir, "index.html"), "<!doctype html><html></html>");

        await withEnvironment(validEnvironment(backend.origin), async () => {
          previewServer = await createVitePreview({
            build: { outDir },
            configFile,
            logLevel: "silent",
            preview: { host: "127.0.0.1", port: 0, strictPort: true },
            root: previewRoot,
          });

          const address = previewServer.httpServer.address() as AddressInfo;
          const response = await fetch(
            `http://127.0.0.1:${address.port}/api/backend/health?from=preview`,
            { headers: { origin: browserOrigin } },
          );

          expect(response.status).toBe(200);
          expect(backend.requests).toEqual([
            {
              method: "GET",
              url: "/health?from=preview",
              origin: browserOrigin,
              body: "",
            },
          ]);
        });
      } finally {
        if (previewServer?.httpServer.listening) {
          await closeHttpServer(previewServer.httpServer);
        }
        await closeHttpServer(backend.server);
        await rm(previewRoot, { recursive: true, force: true });
      }
    });
  });
});
