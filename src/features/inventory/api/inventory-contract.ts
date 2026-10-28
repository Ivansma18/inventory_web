import * as z from "zod";

import type { components } from "@/shared/api/generated/inventory-contracts";

export type Inventory = components["schemas"]["Inventory"];
export type InventoryListResponse = components["schemas"]["InventoryListResponse"];

const nonNegativeIntegerSchema = z.number().finite().int().nonnegative();

const inventoryRecordSchema = z
  .object({
    productUuid: z.uuid(),
    sku: z.string(),
    name: z.string(),
    categoryUuid: z.uuid().nullable(),
    isActive: z.boolean(),
    quantity: nonNegativeIntegerSchema,
    minimumStock: nonNegativeIntegerSchema,
    status: z.enum(["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]),
    updatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine((inventory, context) => {
    const expectedStatus = getInventoryStatus(inventory.quantity, inventory.minimumStock);

    if (inventory.status !== expectedStatus) {
      context.addIssue({
        code: "custom",
        path: ["status"],
      });
    }
  }) satisfies z.ZodType<Inventory>;

const inventoryListResponseSchema = z.object({
  data: z.array(inventoryRecordSchema),
  pagination: z.object({
    total: nonNegativeIntegerSchema,
    page: z.number().finite().int().positive(),
    limit: z.number().finite().int().positive().max(100),
  }),
}) satisfies z.ZodType<InventoryListResponse>;

export class InventoryResponseContractError extends Error {
  readonly kind = "contract";

  constructor() {
    super("The inventory server returned a malformed successful response.");
    this.name = "InventoryResponseContractError";
  }
}

export const parseInventoryListResponse = (value: unknown): InventoryListResponse => {
  const result = inventoryListResponseSchema.safeParse(value);

  if (!result.success) {
    throw new InventoryResponseContractError();
  }

  return result.data;
};

const getInventoryStatus = (
  quantity: Inventory["quantity"],
  minimumStock: Inventory["minimumStock"],
): Inventory["status"] => {
  if (quantity === 0) {
    return "OUT_OF_STOCK";
  }

  if (quantity <= minimumStock) {
    return "LOW_STOCK";
  }

  return "IN_STOCK";
};
