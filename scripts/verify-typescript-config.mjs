import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tsconfigPath = join(projectRoot, "tsconfig.json");
const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);

assert.equal(configFile.error, undefined, "Root tsconfig.json must exist and be valid JSON.");

const parsedConfig = ts.parseJsonConfigFileContent(
  configFile.config,
  ts.sys,
  projectRoot,
  undefined,
  tsconfigPath,
);

assert.deepEqual(
  parsedConfig.errors,
  [],
  "Root tsconfig.json must not contain configuration errors.",
);
assert.equal(parsedConfig.options.strict, true, "TypeScript strict must be enabled.");
assert.equal(parsedConfig.options.noEmit, true, "Typecheck must not emit files.");
assert.deepEqual(parsedConfig.options.paths, {
  "@/app/*": ["./src/app/*"],
  "@/features/*": ["./src/features/*"],
  "@/shared/*": ["./src/shared/*"],
});

const fixtureRoot = mkdtempSync(join(tmpdir(), "inventory-typecheck-"));

try {
  const aliases = ["app", "features", "shared"];

  for (const alias of aliases) {
    const aliasDirectory = join(fixtureRoot, "src", alias);
    mkdirSync(aliasDirectory, { recursive: true });
    writeFileSync(
      join(aliasDirectory, "target.ts"),
      `export type ${alias}Target = { area: "${alias}" };\n`,
    );
  }

  const validFixture = join(fixtureRoot, "valid.ts");
  writeFileSync(
    validFixture,
    [
      'import type { appTarget } from "@/app/target";',
      'import type { featuresTarget } from "@/features/target";',
      'import type { sharedTarget } from "@/shared/target";',
      'const app: appTarget = { area: "app" };',
      'const feature: featuresTarget = { area: "features" };',
      'const shared: sharedTarget = { area: "shared" };',
      "void [app, feature, shared];",
      "",
    ].join("\n"),
  );

  const fixtureOptions = {
    ...parsedConfig.options,
    baseUrl: fixtureRoot,
    paths: {
      "@/app/*": ["./src/app/*"],
      "@/features/*": ["./src/features/*"],
      "@/shared/*": ["./src/shared/*"],
    },
    rootDir: fixtureRoot,
    types: [],
    incremental: false,
    composite: false,
  };

  const validProgram = ts.createProgram([validFixture], fixtureOptions);
  const validDiagnostics = ts.getPreEmitDiagnostics(validProgram);
  assert.deepEqual(
    validDiagnostics,
    [],
    `Valid aliases fixture must typecheck:\n${formatDiagnostics(validDiagnostics)}`,
  );

  const invalidFixture = join(fixtureRoot, "invalid.ts");
  writeFileSync(
    invalidFixture,
    [
      'import type { sharedTarget } from "@/shared/target";',
      "const mismatch: string = 42;",
      "function missingParameterType(value) { return value; }",
      'const alias: sharedTarget = { area: "wrong" };',
      "void [mismatch, missingParameterType, alias];",
      "",
    ].join("\n"),
  );

  const invalidProgram = ts.createProgram([invalidFixture], fixtureOptions);
  const invalidDiagnostics = ts.getPreEmitDiagnostics(invalidProgram);
  const invalidDiagnosticCodes = new Set(invalidDiagnostics.map((diagnostic) => diagnostic.code));

  assert.ok(
    invalidDiagnosticCodes.has(2322),
    "Strict typecheck must reject an incompatible assignment.",
  );
  assert.ok(
    invalidDiagnosticCodes.has(7006),
    "Strict typecheck must reject an implicitly-any parameter.",
  );
} finally {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(
  "TypeScript config verified: strict mode is enabled, app/features/shared aliases resolve, and the invalid fixture is rejected.",
);

function formatDiagnostics(diagnostics) {
  return ts.formatDiagnostics(diagnostics, {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => projectRoot,
    getNewLine: () => "\n",
  });
}
