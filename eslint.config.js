import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import reactHooks from "eslint-plugin-react-hooks";
import { reactRefresh } from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

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
