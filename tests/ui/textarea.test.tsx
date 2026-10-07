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
});
