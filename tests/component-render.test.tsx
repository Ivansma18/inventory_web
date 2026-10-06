import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

function InteractionFixture() {
  const [count, setCount] = useState(0);

  return (
    <main>
      <h1>Component test harness</h1>
      <button type="button" onClick={() => setCount((current) => current + 1)}>
        Clicked {count}
      </button>
    </main>
  );
}

describe("React component test environment", () => {
  it("renders semantic UI and processes a user interaction", async () => {
    const user = userEvent.setup();

    render(<InteractionFixture />);

    expect(screen.getByRole("heading", { name: "Component test harness" })).toBeInTheDocument();

    const button = screen.getByRole("button", { name: "Clicked 0" });
    await user.click(button);

    expect(screen.getByRole("button", { name: "Clicked 1" })).toBeInTheDocument();
  });
});
