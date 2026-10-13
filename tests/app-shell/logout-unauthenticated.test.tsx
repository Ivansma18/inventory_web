import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { server } from "../mocks/server";

describe("App Shell logout availability", () => {
  it("does not offer logout without a confirmed session", async () => {
    server.use(
      http.get(/\/api\/auth\/get-session/, () =>
        HttpResponse.json(
          { error: { code: "UNAUTHORIZED", message: "No active session." } },
          { status: 401 },
        ),
      ),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });
    render(<RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "Sesión no iniciada" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    router.dispose();
  });
});
