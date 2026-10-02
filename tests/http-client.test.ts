import { createServer as createHttpServer } from "node:http";
import type { AddressInfo } from "node:net";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { httpClient, HTTP_CLIENT_TIMEOUT_MS } from "@/shared/api/http-client";
import { server } from "./mocks/server";

const productsUrl = "https://inventory.test/api/products";

const withRealHttp = async (run: () => Promise<void>): Promise<void> => {
  server.close();
  try {
    await run();
  } finally {
    server.listen({ onUnhandledRequest: "error" });
  }
};

describe("business HTTP client", () => {
  it("uses the configured base URL, includes credentials and returns response data", async () => {
    let requestCredentials: RequestCredentials | undefined;
    let requestUrl: string | undefined;

    server.use(
      http.get(productsUrl, ({ request }) => {
        requestCredentials = request.credentials;
        requestUrl = request.url;
        return HttpResponse.json({ items: [{ id: "product-1" }] });
      }),
    );

    const result = await httpClient.request<{ items: Array<{ id: string }> }>({
      method: "GET",
      path: "/products",
    });

    expect(result).toEqual({ items: [{ id: "product-1" }] });
    expect(requestUrl).toBe(productsUrl);
    expect(requestCredentials).toBe("include");
    expect(HTTP_CLIENT_TIMEOUT_MS).toBe(10_000);
  });

  it("normalizes recognized HTTP errors and retains valid field errors", async () => {
    server.use(
      http.post(productsUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: "SKU_ALREADY_EXISTS",
              message: "That SKU is already in use.",
              fieldErrors: { sku: ["SKU is already in use."] },
            },
          },
          { status: 409 },
        ),
      ),
    );

    await expect(
      httpClient.request({
        method: "POST",
        path: "/products",
        data: { sku: "already-used" },
      }),
    ).rejects.toEqual({
      kind: "http",
      status: 409,
      code: "SKU_ALREADY_EXISTS",
      message: "The request failed.",
      fieldErrors: { sku: ["SKU is already in use."] },
    });
  });

  it("retains the proxy origin for its infrastructure error", async () => {
    server.use(
      http.get(productsUrl, () =>
        HttpResponse.json(
          {
            error: {
              code: "PROXY_BACKEND_UNAVAILABLE",
              message: "The backend service is unavailable.",
              source: "proxy",
            },
          },
          { status: 502 },
        ),
      ),
    );

    await expect(httpClient.request({ method: "GET", path: "/products" })).rejects.toEqual({
      kind: "http",
      status: 502,
      code: "PROXY_BACKEND_UNAVAILABLE",
      message: "The request failed.",
      source: "proxy",
    });
  });

  it("normalizes unknown HTTP bodies without publishing them", async () => {
    const secret = "internal-upstream-message";
    server.use(
      http.get(productsUrl, () => new HttpResponse(`<html>${secret}</html>`, { status: 502 })),
    );

    const error = await httpClient
      .request({ method: "GET", path: "/products" })
      .catch((caught: unknown) => caught);

    expect(error).toEqual({ kind: "http", status: 502, message: "The request failed." });
    expect(JSON.stringify(error)).not.toContain(secret);
  });

  it("distinguishes a failure without an HTTP response", async () => {
    server.use(http.get(productsUrl, () => HttpResponse.error()));

    await expect(httpClient.request({ method: "GET", path: "/products" })).rejects.toEqual({
      kind: "network",
      message: "Unable to reach the server.",
    });
  });

  it(
    "aborts a request that exceeds the configured timeout",
    async () => {
      await withRealHttp(async () => {
        const delayedServer = createHttpServer((request, response) => {
          const origin = request.headers.origin;
          if (origin) {
            response.setHeader("access-control-allow-origin", origin);
          }
          response.setHeader("access-control-allow-credentials", "true");
          response.setHeader("content-type", "application/json");

          if (request.method === "OPTIONS") {
            response.writeHead(204);
            response.end();
            return;
          }

          const responseTimer = setTimeout(() => {
            response.end(JSON.stringify({ delayed: true }));
          }, HTTP_CLIENT_TIMEOUT_MS + 250);
          response.on("close", () => clearTimeout(responseTimer));
        });

        await new Promise<void>((resolve, reject) => {
          delayedServer.once("error", reject);
          delayedServer.listen(0, "127.0.0.1", resolve);
        });

        try {
          const address = delayedServer.address() as AddressInfo;

          await expect(
            httpClient.request({
              method: "GET",
              path: `http://127.0.0.1:${address.port}/delayed`,
            }),
          ).rejects.toEqual({
            kind: "network",
            message: "Unable to reach the server.",
          });
        } finally {
          await new Promise<void>((resolve, reject) => {
            delayedServer.close((error) => (error ? reject(error) : resolve()));
          });
        }
      });
    },
    HTTP_CLIENT_TIMEOUT_MS + 5_000,
  );
});
