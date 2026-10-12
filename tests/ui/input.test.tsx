import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Input } from "@/shared/ui";
import type { InputProps, InputType } from "@/shared/ui";

const invalidInputType: InputProps = {
  value: "",
  onValueChange: () => undefined,
  // @ts-expect-error Input types are restricted to the supported HTML text types.
  type: "color",
};

void invalidInputType;

const ControlledInput = ({ initialValue }: { initialValue: string }) => {
  const [value, setValue] = useState(initialValue);

  return <Input value={value} onValueChange={setValue} />;
};

describe("Input", () => {
  it("defaults to text and reports controlled value changes", async () => {
    const user = userEvent.setup();

    render(<ControlledInput initialValue="SKU-01" />);

    const input = screen.getByDisplayValue("SKU-01");
    expect(input).toHaveAttribute("type", "text");

    await user.clear(input);
    await user.type(input, "SKU-02");

    expect(screen.getByDisplayValue("SKU-02")).toBeInTheDocument();
  });

  it.each(["text", "email", "password", "search", "tel", "url"] satisfies InputType[])(
    "supports the %s input type",
    (type) => {
      render(<Input value="sample" onValueChange={() => undefined} type={type} />);

      expect(screen.getByDisplayValue("sample")).toHaveAttribute("type", type);
    },
  );

  it("does not report edits when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Input disabled value="SKU-01" onValueChange={onValueChange} />);

    const input = screen.getByDisplayValue("SKU-01");
    expect(input).toBeDisabled();
    await user.type(input, "SKU-02");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("does not report edits when read only", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Input readOnly value="SKU-01" onValueChange={onValueChange} />);

    const input = screen.getByDisplayValue("SKU-01");
    expect(input).toHaveAttribute("readonly");
    await user.type(input, "SKU-02");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("shows a fixed configuration error and does not render unsupported input types", () => {
    const { container } = render(
      <Input value="secret-value" onValueChange={() => undefined} type={"color" as InputType} />,
    );

    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent(/tipo de input no admitido/i);
    expect(error).not.toHaveTextContent("color");
    expect(error).not.toHaveTextContent("secret-value");
    expect(container.querySelector("input")).not.toBeInTheDocument();
  });

  it("associates a visible label and preserves its generated input id", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<Input label="Correo" value="" onValueChange={onValueChange} />);
    const input = screen.getByRole("textbox", { name: "Correo" });
    const inputId = input.getAttribute("id");

    expect(inputId).toBeTruthy();
    expect(screen.getByLabelText("Correo")).toBe(input);

    rerender(<Input label="Correo" value="user@example.com" onValueChange={onValueChange} />);

    expect(screen.getByRole("textbox", { name: "Correo" })).toHaveAttribute("id", inputId);
  });

  it("associates both help and error text and marks the input invalid", () => {
    render(
      <Input
        error="Formato no válido"
        helpText="Usa una dirección de correo válida."
        label="Correo"
        value="bad"
        onValueChange={() => undefined}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Correo" });
    const help = screen.getByText("Usa una dirección de correo válida.");
    const error = screen.getByText("Formato no válido");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", `${help.id} ${error.id}`);
    expect(input).toHaveAccessibleDescription(
      "Usa una dirección de correo válida. Formato no válido",
    );
  });

  it("associates help text without marking the input invalid", () => {
    render(
      <Input
        helpText="Puedes cambiarlo después."
        label="Nombre"
        value="Ada"
        onValueChange={() => undefined}
      />,
    );

    const input = screen.getByRole("textbox", { name: "Nombre" });
    const help = screen.getByText("Puedes cambiarlo después.");

    expect(input).not.toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", help.id);
  });

  it("preserves a caller-supplied id for label, help, and error associations", () => {
    render(
      <Input
        error="Dato requerido"
        helpText="Información del campo"
        id="product-sku"
        label="SKU"
        value=""
        onValueChange={() => undefined}
      />,
    );

    const input = screen.getByRole("textbox", { name: "SKU" });
    expect(input).toHaveAttribute("id", "product-sku");
    expect(input).toHaveAttribute("aria-describedby", "product-sku-help product-sku-error");
  });
});
