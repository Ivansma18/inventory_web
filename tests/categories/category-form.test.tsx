import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/shared/ui";
import {
  DEFAULT_CATEGORY_FORM_VALUES,
  categoryFormSchema,
  type CategoryFormInput,
  type CategoryFormValues,
} from "@/features/categories/schemas/category-form.schema";
import { CategoryFormFields } from "@/features/categories/components/category-form-fields";

const CategoryFormHarness = ({ onValid }: { onValid: (values: CategoryFormValues) => void }) => {
  const form = useForm<CategoryFormInput, unknown, CategoryFormValues>({
    defaultValues: DEFAULT_CATEGORY_FORM_VALUES,
    mode: "onBlur",
    resolver: zodResolver(categoryFormSchema),
  });

  return (
    <form
      aria-label="Datos de categoría"
      noValidate
      onSubmit={form.handleSubmit((values) => onValid(values))}
    >
      <CategoryFormFields form={form} />
      <Button type="submit" variant="secondary">
        Validar datos
      </Button>
    </form>
  );
};

describe("category form fields and schema", () => {
  it("exposes labeled name and optional description fields", () => {
    render(<CategoryFormHarness onValid={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Nombre (obligatorio)" })).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Descripción (opcional)" })).toBeVisible();
  });

  it("rejects a name that becomes empty after trimming", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<CategoryFormHarness onValid={onValid} />);

    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    await user.type(name, "   ");
    await user.click(screen.getByRole("button", { name: "Validar datos" }));

    expect(await screen.findByText("El nombre es obligatorio.")).toBeVisible();
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(onValid).not.toHaveBeenCalled();
  });

  it("accepts an empty description, trims the validated name, and preserves long text", async () => {
    const user = userEvent.setup();
    const onValid = vi.fn();
    render(<CategoryFormHarness onValid={onValid} />);

    const rawName = `  ${"Almacén central ".repeat(30)} `;
    const longDescription = "Descripción extendida. ".repeat(120);
    const name = screen.getByRole("textbox", { name: "Nombre (obligatorio)" });
    const description = screen.getByRole("textbox", { name: "Descripción (opcional)" });

    fireEvent.change(name, { target: { value: rawName } });
    fireEvent.change(description, { target: { value: longDescription } });

    expect(name).toHaveValue(rawName);
    expect(description).toHaveValue(longDescription);
    expect(name).not.toHaveAttribute("maxLength");
    expect(description).not.toHaveAttribute("maxLength");

    await user.clear(description);
    await user.click(screen.getByRole("button", { name: "Validar datos" }));

    await waitFor(() =>
      expect(onValid).toHaveBeenCalledWith({ name: rawName.trim(), description: "" }),
    );
  });

  it("does not impose a name or description length limit in the schema", () => {
    const name = "Categoría extensa ".repeat(80);
    const description = "Detalle extenso. ".repeat(240);
    const result = categoryFormSchema.safeParse({ name, description });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: name.trim(), description });
    }
  });
});
