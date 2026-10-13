import { cleanup, render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers/app-providers";
import { server } from "./mocks/server";

afterEach(() => {
  cleanup();
  vi.doUnmock("react-dom/client");
  vi.doUnmock("@/shared/config/env.ts");
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("minimum application bootstrap", () => {
  it("shows the signed-out state after the initial session check confirms no session", async () => {
    server.use(
      http.get(/\/api\/auth\/get-session/, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No active session." } },
          { status: 401 },
        ),
      ),
    );

    render(<AppProviders />);

    expect(await screen.findByRole("main")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("rejects invalid public configuration before creating the React root", async () => {
    const createRoot = vi.fn();

    vi.resetModules();
    vi.doMock("react-dom/client", () => ({ createRoot }));
    vi.doMock("@/shared/config/env.ts", async () => {
      const { publicEnvSchema } = await import("@/shared/config/env.schema.ts");

      return {
        env: publicEnvSchema.parse({
          VITE_APP_NAME: " ",
          VITE_API_URL: "/api/backend",
        }),
      };
    });

    await expect(import("../src/main.tsx")).rejects.toThrow();
    expect(createRoot).not.toHaveBeenCalled();
  });
});
