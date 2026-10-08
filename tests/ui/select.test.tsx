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
}: {
  onValueChange: (value: string | null) => void;
  selectOptions?: SelectOption[];
}) => {
  const [value, setValue] = useState<string | null>(null);

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
});
