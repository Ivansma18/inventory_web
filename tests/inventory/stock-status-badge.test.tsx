import { render, screen } from "@testing-library/react";
import type { components } from "@/shared/api/generated/inventory-contracts";
import { describe, expect, it } from "vitest";

import { StockStatusBadge } from "@/features/inventory/components/stock-status-badge";

type Inventory = components["schemas"]["Inventory"];

const inventoryFixtures = [
  {
    description: "zero stock with a zero minimum",
    inventory: {
      productUuid: "550e8400-e29b-41d4-a716-446655440000",
      sku: "EMPTY-001",
      name: "Empty active item",
      categoryUuid: null,
      isActive: true,
      quantity: 0,
      minimumStock: 0,
      status: "OUT_OF_STOCK",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    label: "Sin existencias",
  },
  {
    description: "positive stock equal to the minimum on an inactive product",
    inventory: {
      productUuid: "650e8400-e29b-41d4-a716-446655440000",
      sku: "LOW-001",
      name: "Low inactive item",
      categoryUuid: null,
      isActive: false,
      quantity: 2,
      minimumStock: 2,
      status: "LOW_STOCK",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    label: "Stock bajo",
  },
  {
    description: "stock above the minimum",
    inventory: {
      productUuid: "750e8400-e29b-41d4-a716-446655440000",
      sku: "READY-001",
      name: "Available item",
      categoryUuid: null,
      isActive: true,
      quantity: 3,
      minimumStock: 2,
      status: "IN_STOCK",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    label: "Con existencias",
  },
] satisfies Array<{ description: string; inventory: Inventory; label: string }>;

describe("StockStatusBadge", () => {
  it.each(inventoryFixtures)("shows '$label' for $description", ({ inventory, label }) => {
    render(<StockStatusBadge status={inventory.status} />);

    expect(screen.getByText(label)).toBeVisible();
  });
});
