import { describe, expect, it } from "vitest";

import { parseInventoryReturnTo } from "@/features/inventory";
import {
  buildProductEditLocation as buildPublicProductEditLocation,
  type ProductEditNavigationIntegration,
} from "@/features/products";
import {
  buildProductEditLocation,
  DEFAULT_PRODUCT_LIST_RETURN_TO,
  parseProductEditReturnTo,
} from "@/features/products/utils/product-edit-return-to";

describe("product edit return URL", () => {
  it("builds an edit location carrying an internal list origin", () => {
    const origin = "/products?page=2&search=monitor&status=inactive&sort=sku&order=desc";

    expect(buildProductEditLocation("650e8400-e29b-41d4-a716-446655440000", origin)).toBe(
      "/products/650e8400-e29b-41d4-a716-446655440000/edit?returnTo=%2Fproducts%3Fpage%3D2%26search%3Dmonitor%26status%3Dinactive%26sort%3Dsku%26order%3Ddesc",
    );
  });

  it("exposes a constructor that accepts only destinations validated by the optional policy", () => {
    const navigation = {
      resolveReturnTo: parseInventoryReturnTo,
    } satisfies ProductEditNavigationIntegration;
    const productUuid = "650e8400-e29b-41d4-a716-446655440000";
    const source = "/inventory?order=desc&sort=sku&stockStatus=LOW_STOCK&page=3";
    const editLocation = buildPublicProductEditLocation(productUuid, source, navigation);

    expect(new URLSearchParams(editLocation.split("?")[1]).get("returnTo")).toBe(
      "/inventory?page=3&status=active&stockStatus=LOW_STOCK&sort=sku&order=desc",
    );
    expect(buildPublicProductEditLocation(productUuid, "/settings", navigation)).toBe(
      `/products/${productUuid}/edit?returnTo=${encodeURIComponent(DEFAULT_PRODUCT_LIST_RETURN_TO)}`,
    );
  });

  it("accepts and canonicalizes a valid list origin", () => {
    expect(
      parseProductEditReturnTo(
        "/products?order=desc&sort=sku&status=inactive&search=monitor&page=2",
      ),
    ).toBe("/products?page=2&search=monitor&status=inactive&sort=sku&order=desc");
  });

  it.each([
    "https://attacker.test/products",
    "//attacker.test/products",
    "/settings",
    "/products?redirect=%2Fattacker",
    "/products?page=0&status=active",
    "/products?page=2#section",
  ])("rejects an invalid or external list origin: %s", (candidate) => {
    expect(parseProductEditReturnTo(candidate)).toBeNull();
  });

  it("uses an explicit safe default list URL", () => {
    expect(DEFAULT_PRODUCT_LIST_RETURN_TO).toBe(
      "/products?page=1&status=active&sort=name&order=asc",
    );
  });
});
