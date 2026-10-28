import type { paths } from "@/shared/api/generated/inventory-contracts";
import { describe, expect, it } from "vitest";

import {
  buildInventoryListQuery,
  DEFAULT_INVENTORY_LIST_CRITERIA,
  INVENTORY_LIST_PAGE_SIZE,
  INVENTORY_LIST_SORT_FIELDS,
  isInventoryListSortField,
  parseInventoryListUrlState,
  serializeInventoryListUrlState,
  type InventoryListCriteria,
} from "@/features/inventory/utils/inventory-list-url-state";

const canonicalDefaultParams = "page=1&status=active&stockStatus=all&sort=name&order=asc";

describe("Inventory list URL state", () => {
  it("provides active products, no stock filter, and name ascending by default", () => {
    expect(DEFAULT_INVENTORY_LIST_CRITERIA).toEqual({
      search: "",
      status: "active",
      stockStatus: "all",
      sort: "name",
      order: "asc",
    });
    expect(parseInventoryListUrlState(new URLSearchParams())).toEqual({
      page: 1,
      criteria: DEFAULT_INVENTORY_LIST_CRITERIA,
      needsNormalization: true,
    });
  });

  it("serializes the canonical defaults and omits only an empty search", () => {
    const params = serializeInventoryListUrlState({
      page: 1,
      criteria: DEFAULT_INVENTORY_LIST_CRITERIA,
    });

    expect(params.toString()).toBe(canonicalDefaultParams);
    expect(params.has("search")).toBe(false);
  });

  it("restores a canonical URL without requesting normalization", () => {
    const searchParams = new URLSearchParams(
      "page=2&search=desk&status=inactive&stockStatus=LOW_STOCK&sort=updatedAt&order=desc",
    );

    expect(parseInventoryListUrlState(searchParams)).toEqual({
      page: 2,
      criteria: {
        search: "desk",
        status: "inactive",
        stockStatus: "LOW_STOCK",
        sort: "updatedAt",
        order: "desc",
      },
      needsNormalization: false,
    });
  });

  it.each(["0", "-1", "1.5", "01", "1e2", "9007199254740992", "not-a-page"])(
    "defaults an invalid or unsafe page (%s)",
    (page) => {
      const parsed = parseInventoryListUrlState(new URLSearchParams(`page=${page}`));

      expect(parsed.page).toBe(1);
      expect(parsed.needsNormalization).toBe(true);
    },
  );

  it("accepts the largest safe positive page", () => {
    const page = Number.MAX_SAFE_INTEGER;
    const parsed = parseInventoryListUrlState(new URLSearchParams(`page=${page}`));

    expect(parsed.page).toBe(page);
    expect(parsed.needsNormalization).toBe(true);
  });

  it("normalizes whitespace-only search to absence and trims a nonempty search", () => {
    expect(
      parseInventoryListUrlState(new URLSearchParams("search=%20%20%20")).criteria.search,
    ).toBe("");
    expect(
      parseInventoryListUrlState(new URLSearchParams("search=%20desk%20")).criteria.search,
    ).toBe("desk");
  });

  it("defaults duplicate criteria instead of selecting one of their values", () => {
    const parsed = parseInventoryListUrlState(
      new URLSearchParams(
        "page=5&page=6&search=desk&search=chair&status=inactive&status=active&stockStatus=LOW_STOCK&stockStatus=IN_STOCK&sort=sku&sort=quantity&order=desc&order=asc",
      ),
    );

    expect(parsed).toEqual({
      page: 1,
      criteria: DEFAULT_INVENTORY_LIST_CRITERIA,
      needsNormalization: true,
    });
  });

  it("defaults invalid activity, stock status, sort field, and order independently", () => {
    const parsed = parseInventoryListUrlState(
      new URLSearchParams(
        "page=3&search=desk&status=enabled&stockStatus=AVAILABLE&sort=price&order=sideways",
      ),
    );

    expect(parsed).toEqual({
      page: 3,
      criteria: {
        search: "desk",
        status: "active",
        stockStatus: "all",
        sort: "name",
        order: "asc",
      },
      needsNormalization: true,
    });
  });

  it("marks unknown parameters and noncanonical ordering for replacement", () => {
    expect(
      parseInventoryListUrlState(
        new URLSearchParams(`${canonicalDefaultParams}&limit=50&unknown=value`),
      ).needsNormalization,
    ).toBe(true);
    expect(
      parseInventoryListUrlState(
        new URLSearchParams("status=active&page=1&stockStatus=all&sort=name&order=asc"),
      ).needsNormalization,
    ).toBe(true);
  });

  it("keeps activity and stock states distinct in the criteria", () => {
    const parsed = parseInventoryListUrlState(
      new URLSearchParams("page=1&status=inactive&stockStatus=OUT_OF_STOCK&sort=name&order=asc"),
    );

    expect(parsed.criteria.status).toBe("inactive");
    expect(parsed.criteria.stockStatus).toBe("OUT_OF_STOCK");
  });

  it.each(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] as const)(
    "supports the stock filter %s in URL state and HTTP parameters",
    (stockStatus) => {
      const searchParams = new URLSearchParams(
        `page=1&status=active&stockStatus=${stockStatus}&sort=name&order=asc`,
      );
      const parsed = parseInventoryListUrlState(searchParams);

      expect(parsed.criteria.stockStatus).toBe(stockStatus);
      expect(buildInventoryListQuery(parsed.criteria, parsed.page).status).toBe(stockStatus);
    },
  );

  it("maps UI criteria to the generated HTTP query and fixes the page size at fifteen", () => {
    const criteria: InventoryListCriteria = {
      search: "  desk  ",
      status: "inactive",
      stockStatus: "LOW_STOCK",
      sort: "minimumStock",
      order: "desc",
    };
    const query: NonNullable<paths["/inventory"]["get"]["parameters"]["query"]> =
      buildInventoryListQuery(criteria, 4);

    expect(query).toEqual({
      page: 4,
      limit: 15,
      search: "desk",
      isActive: "false",
      status: "LOW_STOCK",
      sort: "minimumStock",
      order: "desc",
    });
    expect(INVENTORY_LIST_PAGE_SIZE).toBe(15);
  });

  it("omits the backend stock-status filter when all stock states are selected", () => {
    const query = buildInventoryListQuery(DEFAULT_INVENTORY_LIST_CRITERIA, 1);

    expect(query).toEqual({
      page: 1,
      limit: 15,
      isActive: "true",
      sort: "name",
      order: "asc",
    });
    expect(query).not.toHaveProperty("stockStatus");
    expect(query).not.toHaveProperty("status");
  });

  it.each(INVENTORY_LIST_SORT_FIELDS)("supports the backend sort field %s", (sort) => {
    const criteria: InventoryListCriteria = {
      ...DEFAULT_INVENTORY_LIST_CRITERIA,
      sort,
    };

    expect(buildInventoryListQuery(criteria, 1).sort).toBe(sort);
    expect(isInventoryListSortField(sort)).toBe(true);
  });

  it.each(["asc", "desc"] as const)("preserves %s ordering in the HTTP query", (order) => {
    const criteria: InventoryListCriteria = {
      ...DEFAULT_INVENTORY_LIST_CRITERIA,
      order,
    };

    expect(buildInventoryListQuery(criteria, 1).order).toBe(order);
  });
});
