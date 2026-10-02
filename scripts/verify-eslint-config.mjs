import assert from "node:assert/strict";
import { ESLint } from "eslint";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const eslint = new ESLint({ cwd: projectRoot });
const invalidFile = join(projectRoot, "src/features/eslint-contract-invalid.ts");
const validFile = join(projectRoot, "src/features/eslint-contract-valid.ts");

const [invalidResult] = await eslint.lintText(
  "const unusedValue: number = 1;\n",
  { filePath: invalidFile },
);

assert.ok(
  invalidResult.errorCount > 0,
  "ESLint must report an error for the invalid TypeScript fixture.",
);

const [validResult] = await eslint.lintText(
  "export const lintContractValue: number = 1;\n",
  { filePath: validFile },
);

assert.equal(
  validResult.errorCount,
  0,
  `ESLint must accept the valid TypeScript control.\n${validResult.messages
    .map((message) => message.message)
    .join("\n")}`,
);

const [invalidReactResult] = await eslint.lintText(
  [
    'import { useState } from "react";',
    "export function InvalidHookFixture({ enabled }: { enabled: boolean }) {",
    "  if (enabled) useState(0);",
    "  return null;",
    "}",
    "",
  ].join("\n"),
  { filePath: join(projectRoot, "src/features/eslint-contract-invalid-react.tsx") },
);

assert.ok(
  invalidReactResult.messages.some(
    (message) => message.ruleId === "react-hooks/rules-of-hooks",
  ),
  "React Hooks rules must reject a hook called conditionally.",
);

const [validReactResult] = await eslint.lintText(
  [
    'import { useState } from "react";',
    "export function ValidComponentFixture() {",
    "  const [count, setCount] = useState(0);",
    '  return <button type="button" onClick={() => setCount((value) => value + 1)}>{count}</button>;',
    "}",
    "",
  ].join("\n"),
  { filePath: join(projectRoot, "src/features/eslint-contract-valid-react.tsx") },
);

assert.equal(
  validReactResult.errorCount,
  0,
  `ESLint must accept the valid React control.\n${validReactResult.messages
    .map((message) => message.message)
    .join("\n")}`,
);

console.log(
  "ESLint config verified: invalid TypeScript/React fixtures rejected; valid controls passed.",
);
