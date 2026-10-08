import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokensPath = resolve(projectRoot, "src/shared/ui/tokens.css");
const stylesPath = resolve(projectRoot, "src/shared/ui/styles.css");
const dataTableStylesPath = resolve(projectRoot, "src/shared/ui/data-table/data-table.css");

const visualComponents = ["button", "icon", "input", "textarea", "select"] as const;

const readToken = (css: string, name: string): string => {
  const match = css.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-f]{6})\\s*;`, "i"));

  if (!match) {
    throw new Error(`Missing six-digit CSS color token: --${name}`);
  }

  return match[1];
};

const relativeLuminance = (hex: string): number => {
  const channels = hex.match(/[0-9a-f]{2}/gi);

  if (!channels || channels.length !== 3) {
    throw new Error(`Expected a six-digit hex color, received ${hex}`);
  }

  const [red, green, blue] = channels.map((channel) => {
    const srgb = Number.parseInt(channel, 16) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (first: string, second: string): number => {
  const luminances = [relativeLuminance(first), relativeLuminance(second)].sort(
    (left, right) => right - left,
  );

  return (luminances[0] + 0.05) / (luminances[1] + 0.05);
};

describe("shared UI visual tokens", () => {
  it("keeps text, action, status, border, and focus colors above their contrast thresholds", async () => {
    const tokens = await readFile(tokensPath, "utf8");
    const contrastRequirements = [
      ["color-text", "color-canvas", 4.5],
      ["color-text-muted", "color-canvas", 4.5],
      ["color-on-primary", "color-primary", 4.5],
      ["color-on-primary", "color-primary-hover", 4.5],
      ["color-text", "color-surface-muted", 4.5],
      ["color-text-muted", "color-surface-muted", 4.5],
      ["color-success-ink", "color-success-surface", 4.5],
      ["color-info-ink", "color-info-surface", 4.5],
      ["color-on-warning", "color-warning", 4.5],
      ["color-on-error", "color-error-surface", 4.5],
      ["color-focus-ring", "color-canvas", 3],
      ["color-focus-ring", "color-surface", 3],
      ["color-control-border", "color-surface", 3],
    ] as const;

    for (const [foregroundToken, backgroundToken, minimum] of contrastRequirements) {
      const foreground = readToken(tokens, `ui-${foregroundToken}`);
      const background = readToken(tokens, `ui-${backgroundToken}`);

      expect(
        contrastRatio(foreground, background),
        `--ui-${foregroundToken} against --ui-${backgroundToken}`,
      ).toBeGreaterThanOrEqual(minimum);
    }
  });

  it("provides visible keyboard focus, reduced-motion behavior, and local table overflow", async () => {
    const [styles, dataTableStyles] = await Promise.all([
      readFile(stylesPath, "utf8"),
      readFile(dataTableStylesPath, "utf8"),
    ]);

    expect(styles).toContain(":focus-visible");
    expect(styles).toContain("@media (prefers-reduced-motion: reduce)");
    expect(dataTableStyles).toMatch(/\.ui-data-table-viewport\s*\{[^}]*overflow-x:\s*auto/is);
    expect(dataTableStyles).toMatch(/\.ui-data-table-viewport\s*\{[^}]*min-inline-size:\s*0/is);
  });

  it("keeps each visual primitive's styles co-located and imported by its module", async () => {
    const globalStyles = await readFile(stylesPath, "utf8");

    for (const component of visualComponents) {
      const componentDirectory = resolve(projectRoot, `src/shared/ui/${component}`);
      const [moduleSource, componentStyles] = await Promise.all([
        readFile(resolve(componentDirectory, `${component}.tsx`), "utf8"),
        readFile(resolve(componentDirectory, `${component}.css`), "utf8"),
      ]);

      expect(moduleSource).toContain(`import "./${component}.css";`);
      expect(componentStyles).toContain("@layer components");
      expect(componentStyles.trim().length).toBeGreaterThan(0);
    }

    expect(globalStyles).not.toMatch(/\.ui-(?:button|icon|input|textarea|select)(?:[\w-]*)/);
  });
});
