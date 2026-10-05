import { readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UiProvider } from "@/app/providers/ui.provider";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(projectRoot, "src");
const sharedUiStyles = resolve(sourceRoot, "shared/ui/styles.css");

const collectCssFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const descendants = await Promise.all(
    entries.map((entry) => {
      const entryPath = join(directory, entry.name);
      return entry.isDirectory()
        ? collectCssFiles(entryPath)
        : extname(entry.name) === ".css"
          ? [entryPath]
          : [];
    }),
  );

  return descendants.flat();
};

describe("application UI provider contract", () => {
  it("mounts application children through the public shared UI provider", () => {
    render(
      <UiProvider>
        <main>
          <p>Application content</p>
        </main>
      </UiProvider>,
    );

    expect(screen.getByRole("main")).toHaveTextContent("Application content");
  });

  it("keeps vendor CSS imports inside shared/ui and omits Tailwind preflight", async () => {
    const vendorImportPattern = /@import\s+["'](?:primereact|primeicons)(?:\/[^"']*)?["']/g;
    const cssFiles = await collectCssFiles(sourceRoot);
    const externalVendorImports: string[] = [];

    for (const cssFile of cssFiles) {
      const contents = await readFile(cssFile, "utf8");
      if (vendorImportPattern.test(contents)) {
        const relativePath = relative(sourceRoot, cssFile).replaceAll("\\", "/");
        if (!relativePath.startsWith("shared/ui/")) {
          externalVendorImports.push(relativePath);
        }
        vendorImportPattern.lastIndex = 0;
      }
    }

    const styles = await readFile(sharedUiStyles, "utf8");
    expect(externalVendorImports).toEqual([]);
    expect(styles).toContain('"primereact/resources/themes/lara-light-blue/theme.css"');
    expect(styles).toContain('"primeicons/primeicons.css"');
    expect(styles).toContain('"tailwindcss/theme.css"');
    expect(styles).toContain('"tailwindcss/utilities.css"');
    expect(styles).not.toContain("tailwindcss/preflight.css");
  });
});
