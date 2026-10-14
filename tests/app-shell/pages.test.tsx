import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { describe, expect, it } from "vitest";

import { HomePage } from "@/app/pages/home-page";
import { NotFoundPage } from "@/app/pages/not-found-page";

const CurrentPath = () => {
  const location = useLocation();

  return <output data-testid="current-path">{location.pathname}</output>;
};

describe("App Shell pages", () => {
  it("welcomes the user without displaying fictitious metrics and supports programmatic focus", () => {
    render(<HomePage />);

    const heading = screen.getByRole("heading", { level: 1, name: "Bienvenido a Inventory" });
    expect(heading).toBeVisible();
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("Aquí empieza tu jornada de trabajo.")).toBeVisible();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/\b\d[\d,.]*\b/)).not.toBeInTheDocument();

    heading.focus();
    expect(heading).toHaveFocus();
  });

  it("explains a missing page and returns to Home with a focusable main heading", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/missing-destination"]}>
        <NotFoundPage />
        <CurrentPath />
      </MemoryRouter>,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Página no encontrada" });
    expect(heading).toBeVisible();
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(screen.getByText("No encontramos una página en esta dirección.")).toBeVisible();

    heading.focus();
    expect(heading).toHaveFocus();

    await user.click(screen.getByRole("link", { name: "Volver a Inicio" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("/");
  });
});
