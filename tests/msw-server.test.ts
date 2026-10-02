import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { server } from "./mocks/server";

const healthUrl = "https://inventory.test/api/bootstrap-health";

describe("MSW test server isolation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("intercepts a request without using the backend", async () => {
    const response = await fetch(healthUrl);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ source: "default-handler" });
  });

  it("uses a runtime override and resets it before the next test", async () => {
    server.use(http.get(healthUrl, () => HttpResponse.json({ source: "runtime-override" })));

    const response = await fetch(healthUrl);

    await expect(response.json()).resolves.toEqual({
      source: "runtime-override",
    });
  });

  it("restores the default handlers after a runtime override", async () => {
    const response = await fetch(healthUrl);

    await expect(response.json()).resolves.toEqual({ source: "default-handler" });
  });

  it("rejects requests without a matching handler", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(fetch("https://inventory.test/api/unhandled")).rejects.toThrow(
      /Cannot bypass a request/,
    );
  });
});
