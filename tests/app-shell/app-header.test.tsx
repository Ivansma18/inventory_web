import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { AppHeader, CurrentUserAppHeader } from "@/app/components/app-header";
import { Button } from "@/shared/ui";
import { server } from "../mocks/server";

describe("AppHeader", () => {
  it("keeps a long public identity fully accessible while preserving its action slot", () => {
    const identity = "operadora-de-inventario-con-identificador-largo@example.com";

    render(<AppHeader identity={identity} actions={<Button>Acción de cuenta</Button>} />);

    const identityLabel = screen.getByText(identity);
    expect(screen.getByRole("banner")).toBeVisible();
    expect(identityLabel).toHaveAttribute("title", identity);
    expect(identityLabel).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "Acción de cuenta" })).toBeVisible();

    identityLabel.focus();
    expect(identityLabel).toHaveFocus();
  });

  it("presents the email from the confirmed public Auth contract", async () => {
    server.use(
      http.get(/\/api\/auth\/get-session/, () =>
        HttpResponse.json({
          data: {
            user: { id: "header-user", email: "operator@example.com", role: "OPERATOR" },
            session: { id: "header-session", createdAt: "2026-01-01T00:00:00.000Z" },
          },
        }),
      ),
    );

    render(<CurrentUserAppHeader actions={<Button>Acción de cuenta</Button>} />);

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(await screen.findByText("operator@example.com")).toBeVisible();
    expect(screen.getByRole("button", { name: "Acción de cuenta" })).toBeVisible();
  });
});
