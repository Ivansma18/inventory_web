import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import noCrossFeatureInternalImports from "./scripts/eslint-rules/no-cross-feature-internal-imports.mjs";

const inventoryArchitecturePlugin = {
  rules: {
    "no-cross-feature-internal-imports": noCrossFeatureInternalImports,
  },
};

const browserGlobals = {
  AbortController: "readonly",
  AbortSignal: "readonly",
  Blob: "readonly",
  CustomEvent: "readonly",
  document: "readonly",
  Element: "readonly",
  Event: "readonly",
  fetch: "readonly",
  File: "readonly",
  FormData: "readonly",
  Headers: "readonly",
  HTMLElement: "readonly",
  KeyboardEvent: "readonly",
  localStorage: "readonly",
  location: "readonly",
  MouseEvent: "readonly",
  MutationObserver: "readonly",
  navigator: "readonly",
  Node: "readonly",
  performance: "readonly",
  Request: "readonly",
  Response: "readonly",
  sessionStorage: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  window: "readonly",
};

const nodeGlobals = {
  AbortController: "readonly",
  AbortSignal: "readonly",
  Blob: "readonly",
  Buffer: "readonly",
  clearImmediate: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  FormData: "readonly",
  global: "readonly",
  Headers: "readonly",
  process: "readonly",
  Request: "readonly",
  Response: "readonly",
  setImmediate: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
};

const restrictedImports = {
  ui: {
    paths: [
      {
        name: "primereact",
        message: "Import PrimeReact only from src/shared/ui.",
      },
      {
        name: "primeicons",
        message: "Import PrimeIcons only from src/shared/ui.",
      },
    ],
    patterns: [
      {
        group: ["primereact/**"],
        message: "Import PrimeReact subpaths only from src/shared/ui.",
      },
      {
        group: ["primeicons/**"],
        message: "Import PrimeIcons subpaths only from src/shared/ui.",
      },
    ],
  },
  auth: {
    paths: [
      {
        name: "better-auth",
        message: "Import Better Auth only from src/features/auth.",
      },
    ],
    patterns: [
      {
        group: ["better-auth/**"],
        message: "Import Better Auth subpaths only from src/features/auth.",
      },
    ],
  },
  http: {
    paths: [
      {
        name: "axios",
        message: "Import Axios only from src/shared/api/http-client.ts.",
      },
    ],
    patterns: [
      {
        group: ["axios/**"],
        message: "Import Axios subpaths only from src/shared/api/http-client.ts.",
      },
    ],
  },
};

const importBoundaryRule = (...boundaries) => [
  "error",
  {
    paths: boundaries.flatMap((boundary) => boundary.paths),
    patterns: boundaries.flatMap((boundary) => boundary.patterns),
  },
];

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/coverage/**",
      "**/.vite/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/blob-report/**",
      ".agents/**",
      ".claude/**",
      ".codex/**",
      ".cursor/**",
      ".impeccable/**",
      ".opencode/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    files: ["src/**/*.{js,jsx,mjs,ts,tsx}"],
    plugins: {
      "inventory-architecture": inventoryArchitecturePlugin,
    },
    rules: {
      "no-restricted-imports": importBoundaryRule(
        restrictedImports.ui,
        restrictedImports.auth,
        restrictedImports.http,
      ),
      "inventory-architecture/no-cross-feature-internal-imports": "error",
    },
  },
  {
    files: ["src/shared/ui/**/*.{js,jsx,mjs,ts,tsx}"],
    rules: {
      "no-restricted-imports": importBoundaryRule(
        restrictedImports.auth,
        restrictedImports.http,
      ),
    },
  },
  {
    files: ["src/features/auth/**/*.{js,jsx,mjs,ts,tsx}"],
    rules: {
      "no-restricted-imports": importBoundaryRule(
        restrictedImports.ui,
        restrictedImports.http,
      ),
    },
  },
  {
    files: ["src/shared/api/http-client.ts"],
    rules: {
      "no-restricted-imports": importBoundaryRule(
        restrictedImports.ui,
        restrictedImports.auth,
      ),
    },
  },
  {
    files: ["*.config.{js,mjs,ts}", "scripts/**/*.{js,mjs}"],
    languageOptions: {
      globals: nodeGlobals,
    },
  },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
    languageOptions: {
      globals: browserGlobals,
    },
  },
  {
    ...reactHooks.configs.flat.recommended,
    files: ["src/**/*.{ts,tsx}"],
  },
  {
    ...reactRefresh.configs.vite(),
    files: ["src/**/*.{jsx,tsx}"],
  },
  eslintConfigPrettier,
];
