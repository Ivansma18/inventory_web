import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Skeleton } from "@/shared/ui";

describe("Skeleton", () => {
  it("announces loading once and keeps repeated decorative shapes out of the tab order", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <button type="button">Before loading</button>
        <Skeleton count={3} loadingText="Cargando resultados" />
        <button type="button">After loading</button>
      </div>,
    );

    const status = screen.getByRole("status");
    const shapes = container.querySelectorAll(".ui-skeleton__shape");
    const before = screen.getByRole("button", { name: "Before loading" });
    const after = screen.getByRole("button", { name: "After loading" });

    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(status).toHaveTextContent("Cargando resultados");
    expect(shapes).toHaveLength(3);
    shapes.forEach((shape) => {
      expect(shape).toHaveAttribute("aria-hidden", "true");
    });

    before.focus();
    await user.tab();
    expect(after).toHaveFocus();
  });

  it("uses a Spanish loading message and a rectangle by default", () => {
    const { container } = render(<Skeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Cargando contenido");
    expect(container.querySelectorAll(".ui-skeleton__shape")).toHaveLength(1);
    expect(container.querySelector(".ui-skeleton__shape--rectangle")).toBeInTheDocument();
  });

  it("supports circle shapes with caller-provided dimensions", () => {
    const { container } = render(<Skeleton height="2rem" shape="circle" width="2rem" />);
    const shape = container.querySelector(".ui-skeleton__shape--circle");

    expect((shape as HTMLElement).style.height).toBe("2rem");
    expect((shape as HTMLElement).style.width).toBe("2rem");
    expect(shape).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByRole("status")).toHaveLength(1);
  });
});
