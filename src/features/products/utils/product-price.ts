export type ProductPriceParseFailure =
  | "required"
  | "negative"
  | "invalid-format"
  | "too-many-decimals"
  | "mixed-separators"
  | "unsafe-precision";

export type ProductPriceParseResult =
  { success: true; value: number } | { success: false; reason: ProductPriceParseFailure };

const MAX_SAFE_MINOR_UNITS = BigInt(Number.MAX_SAFE_INTEGER);

const priceFormatter = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const unsafePrecision = (): ProductPriceParseResult => ({
  success: false,
  reason: "unsafe-precision",
});

const minorUnitsFromFixedPrice = (value: number): bigint | null => {
  const [whole, fraction] = value.toFixed(2).split(".");

  if (whole === undefined || fraction === undefined) {
    return null;
  }

  return BigInt(whole) * 100n + BigInt(fraction);
};

const minorUnitsFromSerializedPrice = (value: number): bigint | null => {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(value.toString());
  const wholePart = match?.[1];
  const fractionPart = match?.[2] ?? "";

  if (wholePart === undefined || fractionPart.length > 2) {
    return null;
  }

  return BigInt(wholePart) * 100n + BigInt(fractionPart.padEnd(2, "0") || "0");
};

export const parseProductPrice = (rawValue: string): ProductPriceParseResult => {
  const value = rawValue.trim();

  if (!value) {
    return { success: false, reason: "required" };
  }

  if (value.startsWith("-")) {
    return { success: false, reason: "negative" };
  }

  if (value.includes(".") && value.includes(",")) {
    return { success: false, reason: "mixed-separators" };
  }

  const match = /^(\d+)(?:[.,](\d+))?$/.exec(value);

  if (!match) {
    return { success: false, reason: "invalid-format" };
  }

  const wholePart = match[1];
  const fractionPart = match[2] ?? "";

  if (wholePart === undefined) {
    return { success: false, reason: "invalid-format" };
  }

  if (fractionPart.length > 2) {
    return { success: false, reason: "too-many-decimals" };
  }

  const wholeUnits = BigInt(wholePart);
  const fractionUnits = BigInt(fractionPart.padEnd(2, "0") || "0");

  if (fractionUnits === 0n) {
    const wholeValue = Number(wholeUnits);

    if (Number.isSafeInteger(wholeValue) && BigInt(wholeValue) === wholeUnits) {
      return { success: true, value: wholeValue };
    }

    return unsafePrecision();
  }

  const minorUnits = wholeUnits * 100n + fractionUnits;

  if (minorUnits > MAX_SAFE_MINOR_UNITS) {
    return unsafePrecision();
  }

  const amount = Number(minorUnits) / 100;

  if (
    !Number.isFinite(amount) ||
    minorUnitsFromFixedPrice(amount) !== minorUnits ||
    minorUnitsFromSerializedPrice(amount) !== minorUnits
  ) {
    return unsafePrecision();
  }

  return { success: true, value: amount };
};

export const formatProductPrice = (value: number): string => priceFormatter.format(value);
