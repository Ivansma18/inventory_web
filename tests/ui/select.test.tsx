import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Select } from "@/shared/ui";
import type { SelectOption } from "@/shared/ui";

const options: SelectOption[] = [
  { label: "Archivado", value: "archived", disabled: true },
  { label: "Borrador", value: "draft" },
  { label: "Publicado", value: "published" },
];

const ControlledSelect = ({
  onValueChange,
  selectOptions = options,
  initialValue = null,
}: {
  onValueChange: (value: string | null) => void;
  selectOptions?: SelectOption[];
  initialValue?: string | null;
}) => {
  const [value, setValue] = useState<string | null>(initialValue);

  const handleValueChange = (nextValue: string | null) => {
    setValue(nextValue);
    onValueChange(nextValue);
  };

  return (
    <Select
      label="Estado"
      options={selectOptions}
      value={value}
      onValueChange={handleValueChange}
    />
  );
};

describe("Select", () => {
  it("represents a null value with its placeholder and an accessible label", () => {
    render(
      <Select label="Estado" options={options} value={null} onValueChange={() => undefined} />,
    );

    const select = screen.getByLabelText("Estado");
    expect(select).toHaveAccessibleName("Estado");
    expect(screen.getByRole("button", { name: "Selecciona una opción" })).toBeInTheDocument();
  });

  it("selects one option and reports its scalar value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const selectOptions: SelectOption[] = [
      { label: "Borrador", value: "draft" },
      { label: "Publicado", value: "published" },
    ];

    render(<ControlledSelect onValueChange={onValueChange} selectOptions={selectOptions} />);

    screen.getByLabelText("Estado").focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("draft");
    expect(screen.getByLabelText("Estado")).toHaveValue("Borrador");
  });

  it("supports keyboard navigation while skipping disabled options", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<Select label="Estado" options={options} value={null} onValueChange={onValueChange} />);

    screen.getByLabelText("Estado").focus();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("draft");
  });

  it("does not report changes when disabled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Select
        disabled
        label="Estado"
        options={options}
        value={null}
        onValueChange={onValueChange}
      />,
    );

    expect(screen.getByLabelText("Estado")).toBeDisabled();
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("clears the selected value when the empty option is chosen", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(<ControlledSelect initialValue="draft" onValueChange={onValueChange} />);

    screen.getByLabelText("Estado").focus();
    await user.keyboard("{ArrowDown}{Home}{Enter}");

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(null);
    expect(screen.getByLabelText("Estado")).toHaveValue("Selecciona una opción");
  });

  it("reports null once when the selected option is removed", () => {
    const onValueChange = vi.fn();
    const selectedOptions: SelectOption[] = [{ label: "Borrador", value: "draft" }];
    const replacementOptions: SelectOption[] = [{ label: "Publicado", value: "published" }];
    const { rerender } = render(
      <Select
        label="Estado"
        options={selectedOptions}
        value="draft"
        onValueChange={onValueChange}
      />,
    );
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(
      <Select
        label="Estado"
        options={replacementOptions}
        value="draft"
        onValueChange={onValueChange}
      />,
    );
    rerender(
      <Select
        label="Estado"
        options={[...replacementOptions]}
        value="draft"
        onValueChange={onValueChange}
      />,
    );

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("reports null when the selected option becomes disabled", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <Select
        label="Estado"
        options={[{ label: "Borrador", value: "draft" }]}
        value="draft"
        onValueChange={onValueChange}
      />,
    );
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(
      <Select
        label="Estado"
        options={[{ label: "Borrador", value: "draft", disabled: true }]}
        value="draft"
        onValueChange={onValueChange}
      />,
    );
    rerender(
      <Select
        label="Estado"
        options={[{ label: "Borrador", value: "draft", disabled: true }]}
        value="draft"
        onValueChange={onValueChange}
      />,
    );

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(null);
  });

  it("associates error text and identifies the select as invalid", () => {
    render(
      <Select
        error="Selecciona un estado."
        label="Estado"
        options={options}
        value={null}
        onValueChange={() => undefined}
      />,
    );

    const select = screen.getByLabelText("Estado");
    const error = screen.getByText("Selecciona un estado.");

    expect(select).toHaveAttribute("aria-invalid", "true");
    expect(select).toHaveAttribute("aria-describedby", error.id);
    expect(select).toHaveAccessibleDescription("Selecciona un estado.");
  });

  it("disables itself and announces when no options are available", () => {
    render(<Select label="Estado" options={[]} value={null} onValueChange={() => undefined} />);

    const select = screen.getByLabelText("Estado");
    const emptyMessage = screen.getByRole("status");

    expect(select).toBeDisabled();
    expect(emptyMessage).toHaveTextContent("No hay opciones disponibles.");
    expect(select).toHaveAccessibleDescription("No hay opciones disponibles.");
  });
});
