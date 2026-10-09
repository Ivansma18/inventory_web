import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Tooltip } from "@/shared/ui";

const TooltipFixture = () => {
  const targetRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button aria-describedby="existing-description" ref={targetRef} type="button">
        Archive item
      </button>
      <span id="existing-description">This action cannot be undone.</span>
      <Tooltip content="Move this item to the archive." targetRef={targetRef} />
    </>
  );
};

afterEach(() => {
  vi.useRealTimers();
});

describe("Tooltip", () => {
  it("shows on pointer entry and preserves existing descriptions", () => {
    vi.useFakeTimers();

    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    expect(target).toHaveAttribute("aria-describedby", "existing-description");

    fireEvent.mouseEnter(target);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Move this item to the archive.");
    expect(tooltip).toHaveAttribute("aria-hidden", "false");
    expect(target.getAttribute("aria-describedby")?.split(/\s+/)).toEqual([
      "existing-description",
      tooltip.id,
    ]);

    fireEvent.mouseLeave(target);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(target).toHaveAttribute("aria-describedby", "existing-description");
  });

  it("shows on keyboard focus and hides after focus leaves the target", () => {
    vi.useFakeTimers();

    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.focus(target);

    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Move this item to the archive.");
    expect(target.getAttribute("aria-describedby")?.split(/\s+/)).toContain(tooltip.id);

    fireEvent.blur(target);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(target).toHaveAttribute("aria-describedby", "existing-description");
  });

  it("remains visible while either focus or pointer is still on the target", () => {
    vi.useFakeTimers();

    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.focus(target);
    fireEvent.mouseEnter(target);
    fireEvent.mouseLeave(target);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(target);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("stays visible while the pointer moves from the target onto its content", () => {
    vi.useFakeTimers();

    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.mouseEnter(target);
    const tooltip = screen.getByRole("tooltip");

    fireEvent.mouseLeave(target);
    fireEvent.mouseEnter(tooltip);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.mouseLeave(tooltip);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(target).toHaveAttribute("aria-describedby", "existing-description");
  });

  it("stays visible over tooltip content while the target retains focus", () => {
    vi.useFakeTimers();

    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.focus(target);
    fireEvent.pointerEnter(target);
    fireEvent.mouseEnter(target);
    const tooltip = screen.getByRole("tooltip");

    fireEvent.pointerLeave(target);
    fireEvent.mouseLeave(target);
    fireEvent.pointerEnter(tooltip);
    fireEvent.mouseEnter(tooltip);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    fireEvent.pointerLeave(tooltip);
    fireEvent.mouseLeave(tooltip);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.blur(target);
    act(() => {
      vi.advanceTimersByTime(120);
    });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("removes only its description reference when unmounted while visible", () => {
    const { unmount } = render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.focus(target);
    expect(target.getAttribute("aria-describedby")?.split(/\s+/)).toHaveLength(2);

    unmount();

    expect(target).toHaveAttribute("aria-describedby", "existing-description");
  });

  it("hides immediately when Escape is pressed", () => {
    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.focus(target);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(target).toHaveAttribute("aria-describedby", "existing-description");
  });

  it("allows Escape to hide the tooltip while the pointer is over its content", () => {
    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.mouseEnter(target);
    const tooltip = screen.getByRole("tooltip");
    fireEvent.pointerEnter(tooltip);
    fireEvent.mouseEnter(tooltip);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("waits for pointer exit and re-entry after Escape, ignoring focus changes", () => {
    render(<TooltipFixture />);

    const target = screen.getByRole("button", { name: "Archive item" });
    fireEvent.focus(target);
    fireEvent.pointerEnter(target);
    fireEvent.mouseEnter(target);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.blur(target);
    fireEvent.focus(target);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.blur(target);
    fireEvent.pointerLeave(target);
    fireEvent.mouseLeave(target);
    fireEvent.focus(target);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.blur(target);
    fireEvent.pointerEnter(target);
    fireEvent.mouseEnter(target);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });
});
