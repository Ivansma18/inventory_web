import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { FormEvent } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/shared/ui";
import type { ButtonProps } from "@/shared/ui";

// @ts-expect-error Button type is restricted to native button and submit.
const invalidButtonType: ButtonProps = { children: "Guardar", type: "reset" };

// @ts-expect-error Icon-only buttons require an accessible label.
const iconOnlyWithoutAccessibleName: ButtonProps = { icon: "close" };

void invalidButtonType;
void iconOnlyWithoutAccessibleName;

describe("Button", () => {
  it("defaults to a native button and calls its action once on click", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Guardar</Button>);

    const button = screen.getByRole("button", { name: "Guardar" });

    expect(button).toHaveAttribute("type", "button");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it.each(["{Enter}", "[Space]"])("activates exactly once with %s", async (key) => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Guardar</Button>);
    await user.tab();
    const button = screen.getByRole("button", { name: "Guardar" });
    expect(button).toHaveFocus();

    await user.keyboard(key);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not activate when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Guardar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Guardar" });

    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("shows a busy indicator and prevents activation while loading", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button loading onClick={onClick}>
        Guardar
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Guardar" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.querySelector(".ui-icon")).toBeVisible();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not submit a form unless submit is explicit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Button>Guardar</Button>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("supports explicit form submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Guardar</Button>
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("combines visible text and an icon while keeping the text as its name", () => {
    render(<Button icon="add">Agregar</Button>);

    const button = screen.getByRole("button", { name: "Agregar" });

    expect(button.querySelector(".ui-icon")).toBeInTheDocument();
  });

  it("requires an accessible label for the icon-only presentation", () => {
    render(<Button icon="close" accessibleLabel="Cerrar" />);

    expect(screen.getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar" })).toHaveClass("ui-button--icon-only");
  });

  it("applies the public primary and secondary variants", () => {
    render(
      <>
        <Button>Principal</Button>
        <Button variant="secondary">Secundario</Button>
      </>,
    );

    expect(screen.getByRole("button", { name: "Principal" })).toHaveClass("ui-button--primary");
    expect(screen.getByRole("button", { name: "Secundario" })).toHaveClass("ui-button--secondary");
  });
});
