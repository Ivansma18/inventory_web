import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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
  it("waits for Auth and shows the signed-out state without querying business data", async () => {
    let resolveSessionResponse!: (response: Response) => void;
    const sessionResponse = new Promise<Response>((resolve) => {
      resolveSessionResponse = resolve;
    });
    let sessionRequests = 0;
    let businessRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () => {
        sessionRequests += 1;
        return sessionResponse;
      }),
      http.all(/\/api\/backend/, () => {
        businessRequests += 1;
        return HttpResponse.json({ data: [] });
      }),
    );

    render(<AppProviders />);

    expect(await screen.findByRole("status")).toHaveTextContent("Comprobando tu sesión");
    await waitFor(() => expect(sessionRequests).toBe(1));
    expect(
      screen.queryByRole("heading", { name: "Bienvenido a Inventory" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    await act(async () => {
      resolveSessionResponse(
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No active session." } },
          { status: 401 },
        ),
      );
    });

    expect(await screen.findByRole("main")).toBeInTheDocument();
    expect(
      await screen.findByRole("heading", { level: 1, name: "Sesión no iniciada" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(sessionRequests).toBe(1);
    expect(businessRequests).toBe(0);
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
