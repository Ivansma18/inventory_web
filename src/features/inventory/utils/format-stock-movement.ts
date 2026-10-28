import type { StockMovement } from "../api/latest-movement-contract";

export type StockMovementTypeLabel = "Entrada" | "Salida" | "Ajuste";
export type StockMovementQuantityLabel = "Cantidad" | "Existencia resultante";

export interface FormattedStockMovement {
  typeLabel: StockMovementTypeLabel;
  quantityLabel: StockMovementQuantityLabel;
  quantity: number;
  dateTime: string;
  dateTimeLabel: string;
}

const stockMovementTypeLabels = {
  IN: "Entrada",
  OUT: "Salida",
  ADJUSTMENT: "Ajuste",
} as const satisfies Record<StockMovement["type"], StockMovementTypeLabel>;

const utcDateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export const formatStockMovement = (movement: StockMovement): FormattedStockMovement => {
  const isAdjustment = movement.type === "ADJUSTMENT";

  return {
    typeLabel: stockMovementTypeLabels[movement.type],
    quantityLabel: isAdjustment ? "Existencia resultante" : "Cantidad",
    quantity: isAdjustment ? movement.newStock : movement.quantity,
    dateTime: movement.createdAt,
    dateTimeLabel: `${utcDateTimeFormatter.format(new Date(movement.createdAt))} UTC`,
  };
};
