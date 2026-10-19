import { describe, expect, it } from "vitest";

import { formatProductPrice, parseProductPrice } from "@/features/products/utils/product-price";

describe("product price parsing", () => {
  it.each([
    ["0", 0],
    ["0,00", 0],
    ["19", 19],
    ["19,5", 19.5],
    ["19.50", 19.5],
    [" 0019,50 ", 19.5],
  ])("parses %s without changing its decimal value", (input, value) => {
    expect(parseProductPrice(input)).toEqual({ success: true, value });
  });

  it.each(["1234567890123.45", "9999999999999.99"])(
    "preserves every cent when serializing the long price %s",
    (input) => {
      const result = parseProductPrice(input);

      expect(result).toMatchObject({ success: true, value: Number(input) });
      if (result.success) {
        expect(JSON.stringify(result.value)).toBe(input);
      }
    },
  );

  it.each([
    ["", "required"],
    ["   ", "required"],
    ["abc", "invalid-format"],
    ["1 000", "invalid-format"],
    ["1e2", "invalid-format"],
    ["1.", "invalid-format"],
    ["-0.25", "negative"],
    ["1.234", "too-many-decimals"],
    ["1,234", "too-many-decimals"],
    ["1.234,56", "mixed-separators"],
    ["1,234.56", "mixed-separators"],
    ["90071992547409.91", "unsafe-precision"],
    ["90071992547409.92", "unsafe-precision"],
  ] as const)("rejects %j with reason %s", (input, reason) => {
    expect(parseProductPrice(input)).toEqual({ success: false, reason });
  });

  it("formats prices with two Spanish decimal places and no currency", () => {
    expect(formatProductPrice(0)).toBe("0,00");
    expect(formatProductPrice(19.5)).toBe("19,50");
    expect(formatProductPrice(1234.5)).toBe("1234,50");
  });
});
