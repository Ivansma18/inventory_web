import { describe, expect, it } from "vitest";

import { parseInventoryReturnTo } from "@/features/inventory";

const parseCandidate = (candidate: string | null | undefined) => {
  const searchParams = new URLSearchParams();
  if (candidate !== null && candidate !== undefined) {
    searchParams.append("returnTo", candidate);
  }

  return parseInventoryReturnTo(searchParams);
};

describe("inventory return URL", () => {
  it.each([
    ["/inventory", "/inventory?page=1&status=active&stockStatus=all&sort=name&order=asc"],
    [
      "/inventory?search=desk",
      "/inventory?page=1&search=desk&status=active&stockStatus=all&sort=name&order=asc",
    ],
    [
      "/inventory?order=desc&sort=sku&stockStatus=LOW_STOCK&status=inactive&search=monitor&page=2",
      "/inventory?page=2&search=monitor&status=inactive&stockStatus=LOW_STOCK&sort=sku&order=desc",
    ],
  ])("accepts and canonicalizes a valid Inventory origin: %s", (candidate, canonical) => {
    expect(parseCandidate(candidate)).toBe(canonical);
  });

  it.each([
    null,
    undefined,
    "",
    "https://attacker.test/inventory",
    "http://inventory.invalid/inventory",
    "//attacker.test/inventory",
    "///attacker.test/inventory",
    "/products",
    "/inventory/",
    "/Inventory",
    "/inventory#section",
    "/inventory?search=desk#section",
    "/inventory\\@attacker.test",
    "/\\attacker.test/inventory",
    "/inventory\u0000",
    "/inventory?search=desk%0A",
    "/inventory?%00=one",
    "/%69nventory",
    "/inventory%2F..%2Fproducts",
    "/products/../inventory",
    "/other/../inventory",
    "/inventory?redirect=%2Fattacker",
    "/inventory?returnTo=%2Finventory",
    "/inventory?returnTo=%2Finventory&returnTo=%2Fproducts",
    "/inventory?page=0",
    "/inventory?page=01",
    "/inventory?page=9007199254740992",
    "/inventory?search=%20desk",
    "/inventory?status=enabled",
    "/inventory?stockStatus=UNKNOWN",
    "/inventory?sort=createdAt",
    "/inventory?order=sideways",
    "/inventory?page=1&page=2",
    "/inventory?status=active&status=inactive",
    "/inventory?page=1&%70age=2",
  ])("rejects an unsafe or invalid Inventory origin: %s", (candidate) => {
    expect(parseCandidate(candidate)).toBeNull();
  });

  it.each([
    "returnTo=%2Finventory&returnTo=%2Fproducts",
    "return%54o=%2Finventory&returnTo=%2Fproducts",
  ])("rejects duplicate returnTo parameters: %s", (search) => {
    expect(parseInventoryReturnTo(new URLSearchParams(search))).toBeNull();
  });
});
