import { describe, expect, it } from "vitest";

import {
  parseProductListUrlState,
  serializeProductListUrlState,
} from "@/features/products/utils/product-list-url-state";
import { DEFAULT_PRODUCT_LIST_CRITERIA } from "@/features/products/hooks/use-product-list";

describe("product list URL state", () => {
  it("uses defaults when the URL has no list criteria", () => {
    const parsed = parseProductListUrlState(new URLSearchParams());

    expect(parsed).toEqual({
      page: 1,
      criteria: DEFAULT_PRODUCT_LIST_CRITERIA,
      needsNormalization: false,
    });
  });

  it("restores valid criteria and serializes them in a stable order", () => {
    const parsed = parseProductListUrlState(
      new URLSearchParams("page=2&search=keyboard&status=inactive&sort=updatedAt&order=desc"),
    );

    expect(parsed).toEqual({
      page: 2,
      criteria: {
        search: "keyboard",
        status: "inactive",
        sort: "updatedAt",
        order: "desc",
      },
      needsNormalization: false,
    });
    expect(serializeProductListUrlState(parsed)).toEqual(
      new URLSearchParams("page=2&search=keyboard&status=inactive&sort=updatedAt&order=desc"),
    );
  });

  it("trims search, removes empty search, and defaults invalid criteria", () => {
    const parsed = parseProductListUrlState(
      new URLSearchParams(
        "page=0&search=%20%20keyboard%20&status=archived&sort=uuid&order=forward",
      ),
    );

    expect(parsed).toEqual({
      page: 1,
      criteria: { ...DEFAULT_PRODUCT_LIST_CRITERIA, search: "keyboard" },
      needsNormalization: true,
    });
    expect(serializeProductListUrlState(parsed).toString()).toBe(
      "page=1&search=keyboard&status=active&sort=name&order=asc",
    );

    const emptySearch = parseProductListUrlState(new URLSearchParams("search=%20%20"));
    expect(emptySearch.criteria.search).toBe("");
    expect(emptySearch.needsNormalization).toBe(true);
    expect(serializeProductListUrlState(emptySearch).has("search")).toBe(false);
  });

  it("defaults duplicate and unsafe page parameters", () => {
    expect(parseProductListUrlState(new URLSearchParams("page=2&page=3")).page).toBe(1);
    expect(parseProductListUrlState(new URLSearchParams("page=9007199254740992")).page).toBe(1);
    expect(parseProductListUrlState(new URLSearchParams("page=2&page=3")).needsNormalization).toBe(
      true,
    );
  });
});
