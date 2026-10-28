import type { components } from "@/shared/api/generated/inventory-contracts";
import { afterEach, describe, expect, it, vi } from "vitest";

import { formatStockMovement } from "@/features/inventory/utils/format-stock-movement";

const movement: components["schemas"]["StockMovement"] = {
  uuid: "550e8400-e29b-41d4-a716-446655440001",
  productUuid: "550e8400-e29b-41d4-a716-446655440000",
  type: "IN",
  quantity: 4,
  previousStock: 3,
  newStock: 7,
  reason: null,
  reference: null,
  createdAt: "2026-01-01T02:30:00+00:00",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("formatStockMovement", () => {
  it.each([
    { type: "IN", typeLabel: "Entrada", quantityLabel: "Cantidad", quantity: 4 },
    { type: "OUT", typeLabel: "Salida", quantityLabel: "Cantidad", quantity: 5 },
    {
      type: "ADJUSTMENT",
      typeLabel: "Ajuste",
      quantityLabel: "Existencia resultante",
      quantity: 7,
    },
  ] as const)("formats $type without changing its quantity meaning", (expected) => {
    const formatted = formatStockMovement({
      ...movement,
      type: expected.type,
      quantity: expected.type === "OUT" ? 5 : expected.type === "ADJUSTMENT" ? 99 : 4,
      previousStock: 3,
      newStock: 7,
    });

    expect(formatted.typeLabel).toBe(expected.typeLabel);
    expect(formatted.quantityLabel).toBe(expected.quantityLabel);
    expect(formatted.quantity).toBe(expected.quantity);
  });

  it("formats the original creation instant in Spanish UTC across a local day boundary", () => {
    vi.stubEnv("TZ", "Pacific/Honolulu");

    const localDate = new Date(movement.createdAt);
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe("Pacific/Honolulu");
    expect(localDate.getDate()).toBe(31);
    expect(localDate.getUTCDate()).toBe(1);

    const formatted = formatStockMovement(movement);

    expect(formatted.dateTime).toBe(movement.createdAt);
    expect(formatted.dateTimeLabel).toBe("1 ene 2026, 2:30 UTC");
  });
});
