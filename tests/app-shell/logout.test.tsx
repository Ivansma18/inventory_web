import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
import { createQueryClient } from "@/shared/api/query-client";
import { server } from "../mocks/server";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const deferred = <T,>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe("App Shell logout", () => {
  it("reports a failure accessibly and allows retry only while the session remains active", async () => {
    const firstSignOutStarted = deferred<void>();
    const firstSignOutResponse = deferred<Response>();
    let signOutRequests = 0;

    server.use(
      http.get(/\/api\/auth\/get-session/, () =>
        HttpResponse.json({
          data: {
            user: { id: "logout-user", email: "operator@example.com", role: "OPERATOR" },
            session: { id: "logout-session", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        }),
      ),
      http.post(/\/api\/auth\/sign-out/, async () => {
        signOutRequests += 1;
        if (signOutRequests === 1) {
          firstSignOutStarted.resolve();
          return firstSignOutResponse.promise;
        }

        return new HttpResponse(null, { status: 204 });
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });
    const queryClient = createQueryClient();
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    const signOutButton = await screen.findByRole("button", { name: "Cerrar sesión" });
    expect(screen.getByRole("heading", { name: "Bienvenido a Inventory" })).toBeVisible();

    await user.click(signOutButton);
    await firstSignOutStarted.promise;
    const pendingButton = screen.getByRole("button", { name: "Cerrando sesión…" });
    expect(pendingButton).toHaveAttribute("aria-disabled", "true");
    expect(pendingButton).not.toHaveAttribute("disabled");
    expect(pendingButton).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Bienvenido a Inventory" })).toBeVisible();
    expect(signOutRequests).toBe(1);

    await user.click(pendingButton);
    expect(signOutRequests).toBe(1);

    firstSignOutResponse.resolve(
      HttpResponse.json(
        { error: { code: "INTERNAL", message: "Internal error." } },
        { status: 503 },
      ),
    );
    const errorMessage = await screen.findByRole("alert");
    expect(errorMessage).toHaveTextContent("No se pudo cerrar sesión. Inténtalo de nuevo.");
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "Bienvenido a Inventory" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    const signedOutHeading = await screen.findByRole("heading", { name: "Sesión no iniciada" });
    expect(signedOutHeading).toHaveFocus();
    expect(signOutRequests).toBe(2);

    expect(
      screen.queryByRole("heading", { name: "Bienvenido a Inventory" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar sesión" })).not.toBeInTheDocument();
    expect(signOutRequests).toBe(2);
    router.dispose();
    queryClient.clear();
  });
});
