import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import { describe, expect, it } from "vitest";

import { appRoutes } from "@/app/router/router";
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
  it("shows pending state, blocks duplicate requests, and leaves after confirmed 204", async () => {
    const signOutStarted = deferred<void>();
    const signOutResponse = deferred<Response>();
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
        signOutStarted.resolve();
        return signOutResponse.promise;
      }),
    );

    const router = createMemoryRouter(appRoutes, { initialEntries: ["/"] });
    const user = userEvent.setup();
    render(<RouterProvider router={router} />);

    const signOutButton = await screen.findByRole("button", { name: "Cerrar sesión" });
    expect(screen.getByRole("heading", { name: "Bienvenido a Inventory" })).toBeVisible();

    await user.click(signOutButton);
    await signOutStarted.promise;

    const pendingButton = screen.getByRole("button", { name: "Cerrando sesión…" });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "Bienvenido a Inventory" })).toBeVisible();
    expect(signOutRequests).toBe(1);

    await user.click(pendingButton);
    expect(signOutRequests).toBe(1);

    signOutResponse.resolve(new HttpResponse(null, { status: 204 }));
    await act(async () => {
      await screen.findByRole("heading", { name: "Sesión no iniciada" });
    });

    expect(
      screen.queryByRole("heading", { name: "Bienvenido a Inventory" }),
    ).not.toBeInTheDocument();
    expect(signOutRequests).toBe(1);
    router.dispose();
  });
});
