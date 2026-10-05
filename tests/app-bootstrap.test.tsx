import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppProviders } from "@/app/providers/app-providers";

afterEach(() => {
  cleanup();
  vi.doUnmock("react-dom/client");
  vi.doUnmock("@/shared/config/env.ts");
  vi.resetModules();
  document.body.innerHTML = "";
});

describe("minimum application bootstrap", () => {
  it("renders the Inventory page at the initial route without API data", async () => {
    render(<AppProviders />);

    expect(await screen.findByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Inventory" })).toBeInTheDocument();
    expect(screen.getByText("Frontend base para la gestión de inventario.")).toBeInTheDocument();
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
