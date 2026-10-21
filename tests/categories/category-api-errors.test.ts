import { describe, expect, it } from "vitest";

import {
  isCategoryNotFoundError,
  isDuplicateCategoryNameError,
} from "@/features/categories/utils/category-api-errors";

describe("category API error classification", () => {
  it.each([
    {
      description: "the duplicate-name conflict code and status",
      error: { kind: "http", status: 409, code: "CATEGORY_NAME_ALREADY_EXISTS" },
      expected: true,
    },
    {
      description: "a different conflict code with status 409",
      error: { kind: "http", status: 409, code: "CATEGORY_HAS_ASSOCIATED_PRODUCTS" },
      expected: false,
    },
    {
      description: "the duplicate-name code with a different status",
      error: { kind: "http", status: 400, code: "CATEGORY_NAME_ALREADY_EXISTS" },
      expected: false,
    },
    {
      description: "a network error",
      error: { kind: "network", message: "Unable to reach the server." },
      expected: false,
    },
  ])("recognizes only $description", ({ error, expected }) => {
    expect(isDuplicateCategoryNameError(error)).toBe(expected);
  });

  it.each([
    {
      description: "the category-not-found code and status",
      error: { kind: "http", status: 404, code: "CATEGORY_NOT_FOUND" },
      expected: true,
    },
    {
      description: "a 404 response without the category-specific code",
      error: { kind: "http", status: 404, code: "RESOURCE_NOT_FOUND" },
      expected: true,
    },
    {
      description: "the category-not-found code with another status",
      error: { kind: "http", status: 400, code: "CATEGORY_NOT_FOUND" },
      expected: true,
    },
    {
      description: "a different status and code",
      error: { kind: "http", status: 400, code: "INVALID_CATEGORY_DATA" },
      expected: false,
    },
    {
      description: "a network failure",
      error: { kind: "network", message: "Unable to reach the server." },
      expected: false,
    },
  ])("recognizes only $description", ({ error, expected }) => {
    expect(isCategoryNotFoundError(error)).toBe(expected);
  });
});
