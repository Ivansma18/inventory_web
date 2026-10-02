import assert from "node:assert/strict";
import { ESLint } from "eslint";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const eslint = new ESLint({ cwd: projectRoot });
const invalidFile = join(projectRoot, "src/features/eslint-contract-invalid.ts");
const validFile = join(projectRoot, "src/features/eslint-contract-valid.ts");

const [invalidResult] = await eslint.lintText("const unusedValue: number = 1;\n", {
  filePath: invalidFile,
});

assert.ok(
  invalidResult.errorCount > 0,
  "ESLint must report an error for the invalid TypeScript fixture.",
);

const [validResult] = await eslint.lintText("export const lintContractValue: number = 1;\n", {
  filePath: validFile,
});

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
  invalidReactResult.messages.some((message) => message.ruleId === "react-hooks/rules-of-hooks"),
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

const lintImportFixture = async (relativePath, source) => {
  const [result] = await eslint.lintText(source, {
    filePath: join(projectRoot, relativePath),
  });
  return result;
};

const hasRestrictedImport = (result) =>
  result.messages.some((message) => message.ruleId === "no-restricted-imports");

const assertImportRejected = async (label, relativePath, source) => {
  const result = await lintImportFixture(relativePath, source);
  assert.ok(hasRestrictedImport(result), `ESLint must reject ${label} in ${relativePath}.`);
};

const assertImportAllowed = async (label, relativePath, source) => {
  const result = await lintImportFixture(relativePath, source);
  assert.equal(
    result.errorCount,
    0,
    `ESLint must allow ${label} in ${relativePath}.\n${result.messages
      .map((message) => `${message.ruleId}: ${message.message}`)
      .join("\n")}`,
  );
};

const featureFile = "src/features/products/api/product-api.ts";
const disallowedImports = [
  ["PrimeReact root import", 'import * as PrimeReact from "primereact";'],
  ["PrimeReact subpath import", 'import * as PrimeButton from "primereact/button";'],
  ["PrimeReact type-only import", 'import type { ButtonProps } from "primereact/button";'],
  ["PrimeReact CSS import", 'import "primereact/resources/primereact.min.css";'],
  ["PrimeIcons root import", 'import * as PrimeIcons from "primeicons";'],
  ["PrimeIcons subpath import", 'import "primeicons/primeicons.css";'],
  ["Better Auth root import", 'import * as BetterAuth from "better-auth";'],
  ["Better Auth subpath import", 'import * as BetterAuthReact from "better-auth/react";'],
  ["Better Auth type-only import", 'import type { BetterAuthOptions } from "better-auth";'],
  ["Axios root import", 'import * as Axios from "axios";'],
  ["Axios subpath import", 'import * as AxiosAdapter from "axios/lib/adapters/http.js";'],
  ["Axios type-only import", 'import type { AxiosInstance } from "axios";'],
];

for (const [label, statement] of disallowedImports) {
  await assertImportRejected(label, featureFile, `${statement}\nexport {};\n`);
}

await assertImportAllowed(
  "PrimeReact, PrimeIcons, their public types, and CSS",
  "src/shared/ui/prime-wrappers.ts",
  [
    'import * as PrimeReact from "primereact";',
    'import type { ButtonProps } from "primereact/button";',
    'import * as PrimeIcons from "primeicons";',
    'import "primereact/resources/primereact.min.css";',
    'import "primeicons/primeicons.css";',
    "export const uiDependencies = { PrimeReact, PrimeIcons };",
    "export type UiButtonProps = ButtonProps;",
    "",
  ].join("\n"),
);

await assertImportAllowed(
  "Better Auth root, React client, and public types",
  "src/features/auth/api/auth-client.ts",
  [
    'import * as BetterAuth from "better-auth";',
    'import * as BetterAuthReact from "better-auth/react";',
    'import type { BetterAuthOptions } from "better-auth";',
    "export const authDependencies = { BetterAuth, BetterAuthReact };",
    "export type AuthOptions = BetterAuthOptions;",
    "",
  ].join("\n"),
);

await assertImportAllowed(
  "Axios and its public types",
  "src/shared/api/http-client.ts",
  [
    'import axios, { type AxiosInstance } from "axios";',
    "export const httpClient = axios.create();",
    "export type HttpClient = AxiosInstance;",
    "",
  ].join("\n"),
);

await assertImportAllowed(
  "the public Auth feature API from another feature",
  featureFile,
  ['import { useAuth } from "@/features/auth";', "export const usePublicAuth = useAuth;", ""].join(
    "\n",
  ),
);

await assertImportRejected(
  "Axios from the Design System",
  "src/shared/ui/http-client.ts",
  'import axios from "axios";\nexport const uiTransport = axios;\n',
);

await assertImportRejected(
  "PrimeReact from the Auth feature",
  "src/features/auth/components/auth-widget.tsx",
  'import { Button } from "primereact/button";\nexport const AuthButton = Button;\n',
);

await assertImportRejected(
  "Better Auth from the HTTP client",
  "src/shared/api/http-client.ts",
  'import * as BetterAuth from "better-auth/react";\nexport const leakedAuth = BetterAuth;\n',
);

const featureBoundaryRuleId = "inventory-architecture/no-cross-feature-internal-imports";
const assertFeatureImportRejected = async (label, relativePath, source) => {
  const result = await lintImportFixture(relativePath, source);
  assert.ok(
    result.messages.some((message) => message.ruleId === featureBoundaryRuleId),
    `ESLint must reject ${label} in ${relativePath}.`,
  );
};

const assertFeatureImportAllowed = async (label, relativePath, source) => {
  const result = await lintImportFixture(relativePath, source);
  assert.equal(
    result.errorCount,
    0,
    `ESLint must allow ${label} in ${relativePath}.\n${result.messages
      .map((message) => `${message.ruleId}: ${message.message}`)
      .join("\n")}`,
  );
};

const productComponent = "src/features/products/components/product-table.tsx";

await assertFeatureImportRejected(
  "an aliased deep import into another feature",
  productComponent,
  [
    'import { authClient } from "@/features/auth/api/auth-client";',
    "export const productAuthClient = authClient;",
    "",
  ].join("\n"),
);

await assertFeatureImportRejected(
  "a relative deep import into another feature",
  productComponent,
  [
    'import { authClient } from "../../auth/api/auth-client";',
    "export const productAuthClient = authClient;",
    "",
  ].join("\n"),
);

await assertFeatureImportRejected(
  "a type-only aliased deep import into another feature",
  productComponent,
  [
    'import type { AuthClient } from "@/features/auth/api/auth-client";',
    "export type ProductAuthClient = AuthClient;",
    "",
  ].join("\n"),
);

await assertFeatureImportRejected(
  "a re-export from another feature's private module",
  productComponent,
  'export { authClient } from "../../auth/api/auth-client";\n',
);

await assertFeatureImportAllowed(
  "another feature's public alias entry point",
  productComponent,
  ['import { useAuth } from "@/features/auth";', "export const productAuth = useAuth;", ""].join(
    "\n",
  ),
);

await assertFeatureImportAllowed(
  "another feature's public entry point by relative path",
  productComponent,
  ['import { useAuth } from "../../auth";', "export const productAuth = useAuth;", ""].join("\n"),
);

await assertFeatureImportAllowed(
  "another feature's explicit public index by relative path",
  productComponent,
  ['import { useAuth } from "../../auth/index";', "export const productAuth = useAuth;", ""].join(
    "\n",
  ),
);

await assertFeatureImportAllowed(
  "an internal relative import in the same feature",
  productComponent,
  [
    'import { formatProduct } from "../utils/format-product";',
    "export const formatRow = formatProduct;",
    "",
  ].join("\n"),
);

await assertFeatureImportAllowed(
  "an internal aliased import in the same feature",
  productComponent,
  [
    'import { productQuery } from "@/features/products/api/product-query";',
    "export const useProductQuery = productQuery;",
    "",
  ].join("\n"),
);

console.log(
  "ESLint config verified: invalid TypeScript/React and architectural imports rejected; valid controls and boundary imports passed.",
);
