import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/shared/ui";
import type { BadgeProps, BadgeTone } from "@/shared/ui";

const badgeTones = ["neutral", "success", "info", "warning", "error"] satisfies BadgeTone[];

// @ts-expect-error Badge requires text to identify its meaning.
const missingLabel: BadgeProps = { tone: "success" };

// @ts-expect-error Badge tones are restricted to the app's semantic vocabulary.
const vendorTone: BadgeProps = { label: "Danger", tone: "danger" };

// @ts-expect-error PrimeReact severity is not part of the Badge public contract.
const leakedSeverity: BadgeProps = { label: "Critical", severity: "danger" };

void missingLabel;
void vendorTone;
void leakedSeverity;

describe("Badge", () => {
  it.each(badgeTones)("keeps its text label visible with the %s tone", (tone) => {
    render(<Badge label="Pendiente de revisión" tone={tone} />);

    expect(screen.getByText("Pendiente de revisión")).toBeVisible();
  });

  it("defaults to a neutral tone and preserves distinct meanings as text", () => {
    render(
      <>
        <Badge label="Disponible" />
        <Badge label="Requiere revisión" tone="warning" />
        <Badge label="Bloqueado" tone="error" />
      </>,
    );

    expect(screen.getByText("Disponible")).toBeVisible();
    expect(screen.getByText("Requiere revisión")).toBeVisible();
    expect(screen.getByText("Bloqueado")).toBeVisible();
  });

  it("rejects a blank text label", () => {
    expect(() => render(<Badge label="   " />)).toThrow("Badge requires a non-empty label.");
  });
});
