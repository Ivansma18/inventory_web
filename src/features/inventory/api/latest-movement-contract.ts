import * as z from "zod";

import type { components } from "@/shared/api/generated/inventory-contracts";

export type StockMovement = components["schemas"]["StockMovement"];
export type StockMovementListResponse = components["schemas"]["StockMovementListResponse"];

export interface LatestStockMovementExpectation {
  productUuid: string;
  limit: number;
}

const nonNegativeIntegerSchema = z.number().finite().int().nonnegative();

const stockMovementSchema = z.object({
  uuid: z.uuid(),
  productUuid: z.uuid(),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: nonNegativeIntegerSchema,
  previousStock: nonNegativeIntegerSchema,
  newStock: nonNegativeIntegerSchema,
  reason: z.string().nullable(),
  reference: z.string().nullable(),
  createdAt: z.iso.datetime({ offset: true }),
}) satisfies z.ZodType<StockMovement>;

const stockMovementListResponseSchema = z.object({
  data: z.array(stockMovementSchema),
  pagination: z.object({
    total: nonNegativeIntegerSchema,
    page: z.number().finite().int().positive(),
    limit: z.number().finite().int().positive().max(100),
  }),
}) satisfies z.ZodType<StockMovementListResponse>;

export class LatestStockMovementResponseContractError extends Error {
  readonly kind = "contract";

  constructor() {
    super("The inventory server returned a malformed successful movement response.");
    this.name = "LatestStockMovementResponseContractError";
  }
}

export const parseLatestStockMovementResponse = (
  value: unknown,
  expected: LatestStockMovementExpectation,
): StockMovement | null => {
  const result = stockMovementListResponseSchema.safeParse(value);

  if (
    !result.success ||
    !z.uuid().safeParse(expected.productUuid).success ||
    !Number.isSafeInteger(expected.limit) ||
    expected.limit < 1 ||
    expected.limit > 100
  ) {
    throw new LatestStockMovementResponseContractError();
  }

  const { data, pagination } = result.data;

  if (
    pagination.page !== 1 ||
    pagination.limit !== expected.limit ||
    data.length > expected.limit ||
    pagination.total < data.length ||
    (data.length === 0) !== (pagination.total === 0) ||
    data.some((movement) => movement.productUuid !== expected.productUuid)
  ) {
    throw new LatestStockMovementResponseContractError();
  }

  return data[0] ?? null;
};
