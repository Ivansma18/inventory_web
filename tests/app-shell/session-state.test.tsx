import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthLayout } from "@/app/layouts/auth-layout";
import { SessionState } from "@/app/components/session-state";

const states = [
  {
    state: "checking",
    heading: "Comprobando tu sesión",
    message: "Estamos verificando tu acceso a Inventory.",
    role: "status",
    live: "polite",
  },
  {
    state: "error",
    heading: "No se pudo comprobar la sesión",
    message: "Comprueba tu conexión e inténtalo de nuevo.",
    role: "alert",
    live: "assertive",
  },
  {
    state: "signed-out",
    heading: "Sesión no iniciada",
    message: "No hay una sesión activa para esta aplicación.",
    role: "status",
    live: "polite",
  },
] as const;

describe("AuthLayout and session presentations", () => {
  it.each(states)("presents the $state state with a primary heading and announcement", (state) => {
    render(
      <AuthLayout>
        <SessionState state={state.state} />
      </AuthLayout>,
    );

    expect(screen.getByRole("banner")).toHaveTextContent("Inventory");
    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { level: 1, name: state.heading }),
    );
    expect(screen.getByText(state.message)).toBeInTheDocument();

    const announcement = screen.getByRole(state.role);
    expect(announcement).toHaveAttribute("aria-live", state.live);
    expect(announcement).toHaveAttribute("aria-atomic", "true");
    expect(announcement).toHaveTextContent(state.heading);
  });

  it("keeps the signed-out information separate from work navigation and login actions", () => {
    render(
      <AuthLayout>
        <SessionState state="signed-out" />
      </AuthLayout>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Sesión no iniciada" })).toBeVisible();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
