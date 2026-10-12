import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Textarea } from "@/shared/ui";

const ControlledTextarea = () => {
  const [value, setValue] = useState("First line");

  return <Textarea value={value} onValueChange={setValue} />;
};

describe("Textarea", () => {
  it("reports controlled edits and preserves line breaks", async () => {
    const user = userEvent.setup();

    render(<ControlledTextarea />);

    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "{Enter}Second line");

    expect(textarea).toHaveValue("First line\nSecond line");
  });

  it("uses a native textarea with a configurable row count", () => {
    render(<Textarea rows={5} value={"Line one\nLine two"} onValueChange={() => undefined} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea.tagName).toBe("TEXTAREA");
    expect(textarea).toHaveAttribute("rows", "5");
    expect(textarea).toHaveValue("Line one\nLine two");
  });

  it("does not report edits when read only", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Textarea readOnly value="Line one" onValueChange={onValueChange} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveAttribute("readonly");
    await user.type(textarea, "Line two");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("does not report edits when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Textarea disabled value="Line one" onValueChange={onValueChange} />);

    const textarea = screen.getByRole("textbox");
    expect(textarea).toBeDisabled();
    await user.type(textarea, "Line two");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("associates a visible label and preserves its generated textarea id", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Textarea label="Descripción" value="" onValueChange={onValueChange} />,
    );
    const textarea = screen.getByRole("textbox", { name: "Descripción" });
    const textareaId = textarea.getAttribute("id");

    expect(textareaId).toBeTruthy();
    expect(screen.getByLabelText("Descripción")).toBe(textarea);

    rerender(<Textarea label="Descripción" value="Detalle" onValueChange={onValueChange} />);

    expect(screen.getByRole("textbox", { name: "Descripción" })).toHaveAttribute("id", textareaId);
  });

  it("associates help and error text and marks the textarea invalid", () => {
    render(
      <Textarea
        error="La descripción es demasiado larga."
        helpText="Incluye los detalles relevantes."
        label="Descripción"
        value="Detalle"
        onValueChange={() => undefined}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Descripción" });
    const help = screen.getByText("Incluye los detalles relevantes.");
    const error = screen.getByText("La descripción es demasiado larga.");

    expect(textarea).toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", `${help.id} ${error.id}`);
    expect(textarea).toHaveAccessibleDescription(
      "Incluye los detalles relevantes. La descripción es demasiado larga.",
    );
  });

  it("associates help text without marking the textarea invalid", () => {
    render(
      <Textarea
        helpText="Puedes incluir varias líneas."
        label="Descripción"
        value="Detalle"
        onValueChange={() => undefined}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Descripción" });
    const help = screen.getByText("Puedes incluir varias líneas.");

    expect(textarea).not.toHaveAttribute("aria-invalid", "true");
    expect(textarea).toHaveAttribute("aria-describedby", help.id);
  });

  it("preserves a caller-supplied id for label, help, and error associations", () => {
    render(
      <Textarea
        error="Dato requerido"
        helpText="Información del campo"
        id="product-description"
        label="Descripción"
        value=""
        onValueChange={() => undefined}
      />,
    );

    const textarea = screen.getByRole("textbox", { name: "Descripción" });
    expect(textarea).toHaveAttribute("id", "product-description");
    expect(textarea).toHaveAttribute(
      "aria-describedby",
      "product-description-help product-description-error",
    );
  });
});
