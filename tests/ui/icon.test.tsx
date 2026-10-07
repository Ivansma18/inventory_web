import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Icon } from "@/shared/ui";
import type { IconName, IconProps } from "@/shared/ui";

const iconNames = [
  "add",
  "close",
  "info",
  "success",
  "warning",
  "error",
  "loading",
  "previous",
  "next",
  "sort",
  "sortAscending",
  "sortDescending",
] satisfies IconName[];

// @ts-expect-error Icon names are restricted to the public catalog.
const invalidIconName: IconProps = { name: "edit" };

// @ts-expect-error Informative icons require an accessible label.
const informativeIconWithoutLabel: IconProps = { name: "info", decorative: false };

// @ts-expect-error Icon sizes are restricted to the public scale.
const invalidIconSize: IconProps = { name: "add", size: "xl" };

// @ts-expect-error PrimeIcons class names are an internal implementation detail.
const injectedVendorClass: IconProps = { name: "add", className: "pi pi-times" };

void invalidIconName;
void informativeIconWithoutLabel;
void invalidIconSize;
void injectedVendorClass;

describe("Icon", () => {
  it.each(iconNames)("supports the %s catalog entry as decorative", (name) => {
    const { container } = render(<Icon name={name} />);
    const icon = container.firstElementChild;

    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("exposes an informative icon through its accessible label", () => {
    render(<Icon name="info" decorative={false} label="Más información" />);

    expect(screen.getByRole("img", { name: "Más información" })).toBeInTheDocument();
  });

  it("rejects an empty informative label", () => {
    expect(() => render(<Icon name="info" decorative={false} label="  " />)).toThrow(
      "Informative Icon requires a non-empty accessible label.",
    );
  });
});
