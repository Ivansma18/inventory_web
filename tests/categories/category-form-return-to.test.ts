import { describe, expect, it } from "vitest";

import {
  DEFAULT_CATEGORY_LIST_RETURN_TO,
  parseCategoryListReturnTo,
  resolveCategoryFormReturnTo,
} from "@/features/categories/utils/category-form-return-to";

describe("category form return URL", () => {
  it("accepts and canonicalizes a valid internal list origin", () => {
    expect(
      parseCategoryListReturnTo(
        "/categories?order=desc&sort=updatedAt&status=inactive&search=tools&page=3",
      ),
    ).toBe("/categories?page=3&search=tools&status=inactive&sort=updatedAt&order=desc");
  });

  it.each([
    "https://attacker.test/categories",
    "//attacker.test/categories",
    "/settings",
    "/categories?redirect=%2Fattacker",
    "/categories?page=0&status=active",
    "/categories?page=2#section",
    "/categories?page=2&page=3",
    "/categories?search=%20tools%20",
    "/categories\\@attacker.test",
  ])("rejects an invalid or external list origin: %s", (candidate) => {
    expect(parseCategoryListReturnTo(candidate)).toBeNull();
  });

  it.each([null, undefined, ""])("uses the default when the origin is absent: %s", (candidate) => {
    expect(parseCategoryListReturnTo(candidate)).toBeNull();
    expect(DEFAULT_CATEGORY_LIST_RETURN_TO).toBe(
      "/categories?page=1&status=active&sort=name&order=asc",
    );
  });

  it("rejects missing or duplicated returnTo parameters and defaults both safely", () => {
    expect(resolveCategoryFormReturnTo(new URLSearchParams())).toBe(
      DEFAULT_CATEGORY_LIST_RETURN_TO,
    );
    expect(
      resolveCategoryFormReturnTo(
        new URLSearchParams("returnTo=%2Fcategories%3Fpage%3D2&returnTo=https%3A%2F%2Fevil.test"),
      ),
    ).toBe(DEFAULT_CATEGORY_LIST_RETURN_TO);
  });
});
