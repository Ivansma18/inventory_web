import "./stock-status-badge.css";

import { Badge, type BadgeTone } from "@/shared/ui/badge/badge";

import type { Inventory } from "../api/inventory-contract";

interface StockStatusBadgeProps {
  status: Inventory["status"];
}

const STOCK_STATUS_PRESENTATION = {
  IN_STOCK: {
    label: "Con existencias",
    tone: "success",
    markerClass: "stock-status-badge--in-stock",
  },
  LOW_STOCK: {
    label: "Stock bajo",
    tone: "warning",
    markerClass: "stock-status-badge--low-stock",
  },
  OUT_OF_STOCK: {
    label: "Sin existencias",
    tone: "error",
    markerClass: "stock-status-badge--out-of-stock",
  },
} satisfies Record<Inventory["status"], { label: string; tone: BadgeTone; markerClass: string }>;

export const StockStatusBadge = ({ status }: StockStatusBadgeProps) => {
  const presentation = STOCK_STATUS_PRESENTATION[status];

  return (
    <span className={`stock-status-badge ${presentation.markerClass}`}>
      <span aria-hidden="true" className="stock-status-badge__marker" />
      <Badge label={presentation.label} tone={presentation.tone} />
    </span>
  );
};
