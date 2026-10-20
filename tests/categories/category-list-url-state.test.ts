import { describe, expect, it } from "vitest";

import { buildCategoryListQuery } from "@/features/categories/api/categories-api";
import {
  DEFAULT_CATEGORY_LIST_CRITERIA,
  parseCategoryListUrlState,
  serializeCategoryListUrlState,
} from "@/features/categories/utils/category-list-url-state";

describe("category list URL state", () => {
  it("uses the approved defaults for an unparameterized URL", () => {
    expect(parseCategoryListUrlState(new URLSearchParams())).toEqual({
      page: 1,
      criteria: DEFAULT_CATEGORY_LIST_CRITERIA,
      needsNormalization: false,
    });
  });

  it("restores valid criteria and serializes them in a stable order", () => {
    const parsed = parseCategoryListUrlState(
      new URLSearchParams("page=3&search=oficina&status=inactive&sort=updatedAt&order=desc"),
    );

    expect(parsed).toEqual({
      page: 3,
      criteria: {
        search: "oficina",
        status: "inactive",
        sort: "updatedAt",
        order: "desc",
      },
      needsNormalization: false,
    });
    expect(serializeCategoryListUrlState(parsed).toString()).toBe(
      "page=3&search=oficina&status=inactive&sort=updatedAt&order=desc",
    );
  });

  it("trims search, removes it when blank, and defaults invalid criteria", () => {
    const parsed = parseCategoryListUrlState(
      new URLSearchParams("page=0&search=%20%20oficina%20&status=archived&sort=uuid&order=forward"),
    );

    expect(parsed).toEqual({
      page: 1,
      criteria: { ...DEFAULT_CATEGORY_LIST_CRITERIA, search: "oficina" },
      needsNormalization: true,
    });
    expect(serializeCategoryListUrlState(parsed).toString()).toBe(
      "page=1&search=oficina&status=active&sort=name&order=asc",
    );

    const blankSearch = parseCategoryListUrlState(new URLSearchParams("search=%20%20"));
    expect(blankSearch.criteria.search).toBe("");
    expect(blankSearch.needsNormalization).toBe(true);
    expect(serializeCategoryListUrlState(blankSearch).has("search")).toBe(false);
  });

  it.each(["-1", "0", "1.5", "invalid", "9007199254740992"])(
    "defaults non-positive or unsafe page value %s",
    (page) => {
      const parsed = parseCategoryListUrlState(new URLSearchParams(`page=${page}`));

      expect(parsed.page).toBe(1);
      expect(parsed.needsNormalization).toBe(true);
    },
  );

  it("defaults duplicated criteria instead of choosing one arbitrarily", () => {
    const parsed = parseCategoryListUrlState(
      new URLSearchParams("page=2&page=3&status=active&status=inactive&search=first&search=second"),
    );

    expect(parsed).toEqual({
      page: 1,
      criteria: DEFAULT_CATEGORY_LIST_CRITERIA,
      needsNormalization: true,
    });
  });
});

describe("category list API query mapping", () => {
  it("applies the fixed page size and active/name/ascending defaults without empty search", () => {
    expect(buildCategoryListQuery(DEFAULT_CATEGORY_LIST_CRITERIA, 1)).toEqual({
      page: 1,
      limit: 15,
      isActive: "true",
      sort: "name",
      order: "asc",
    });
  });

  it.each([
    { status: "active" as const, isActive: "true" as const },
    { status: "inactive" as const, isActive: "false" as const },
  ])("maps $status to the OpenAPI isActive parameter", ({ status, isActive }) => {
    expect(buildCategoryListQuery({ ...DEFAULT_CATEGORY_LIST_CRITERIA, status }, 4)).toEqual({
      page: 4,
      limit: 15,
      isActive,
      sort: "name",
      order: "asc",
    });
  });

  it.each(["name", "createdAt", "updatedAt"] as const)(
    "preserves the OpenAPI sort field %s",
    (sort) => {
      expect(buildCategoryListQuery({ ...DEFAULT_CATEGORY_LIST_CRITERIA, sort }, 2).sort).toBe(
        sort,
      );
    },
  );

  it.each(["asc", "desc"] as const)("preserves the OpenAPI %s order", (order) => {
    expect(buildCategoryListQuery({ ...DEFAULT_CATEGORY_LIST_CRITERIA, order }, 2).order).toBe(
      order,
    );
  });

  it("trims non-empty search before mapping it to the API contract", () => {
    expect(
      buildCategoryListQuery({ ...DEFAULT_CATEGORY_LIST_CRITERIA, search: "  oficina  " }, 2),
    ).toEqual({
      page: 2,
      limit: 15,
      search: "oficina",
      isActive: "true",
      sort: "name",
      order: "asc",
    });
  });
});
