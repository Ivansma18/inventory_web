import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRODUCT_LIST_CRITERIA,
  buildProductListQuery,
  type ProductListSortField,
} from "@/features/products/hooks/use-product-list";

describe("buildProductListQuery", () => {
  it("trims a search term and omits it when it contains only whitespace", () => {
    expect(
      buildProductListQuery({ ...DEFAULT_PRODUCT_LIST_CRITERIA, search: "  KeyBoard  " }, 3),
    ).toEqual({
      page: 3,
      limit: 15,
      search: "KeyBoard",
      isActive: "true",
      sort: "name",
      order: "asc",
    });

    expect(buildProductListQuery({ ...DEFAULT_PRODUCT_LIST_CRITERIA, search: " \t  " }, 2)).toEqual(
      {
        page: 2,
        limit: 15,
        isActive: "true",
        sort: "name",
        order: "asc",
      },
    );
  });

  it("combines an inactive filter with the normalized search", () => {
    expect(
      buildProductListQuery(
        { ...DEFAULT_PRODUCT_LIST_CRITERIA, search: "  keyboard ", status: "inactive" },
        1,
      ),
    ).toEqual({
      page: 1,
      limit: 15,
      search: "keyboard",
      isActive: "false",
      sort: "name",
      order: "asc",
    });
  });

  it.each([
    ["name", "Nombre"],
    ["sku", "SKU"],
    ["purchasePrice", "Precio de compra"],
    ["salePrice", "Precio de venta"],
    ["createdAt", "Fecha de creación"],
    ["updatedAt", "Fecha de actualización"],
  ] as const satisfies readonly (readonly [ProductListSortField, string])[])(
    "supports sorting by %s in ascending and descending order",
    (sort) => {
      expect(
        buildProductListQuery({ ...DEFAULT_PRODUCT_LIST_CRITERIA, sort, order: "asc" }, 1),
      ).toMatchObject({ sort, order: "asc" });
      expect(
        buildProductListQuery({ ...DEFAULT_PRODUCT_LIST_CRITERIA, sort, order: "desc" }, 1),
      ).toMatchObject({ sort, order: "desc" });
    },
  );
});
