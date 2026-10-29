import "./latest-stock-movement-cell.css";

import { useLatestStockMovement } from "../hooks/use-latest-stock-movement";
import { formatStockMovement } from "../utils/format-stock-movement";

interface LatestStockMovementCellProps {
  productUuid: string;
  sessionId: string | null;
}

export const LatestStockMovementCell = ({
  productUuid,
  sessionId,
}: LatestStockMovementCellProps) => {
  const movementQuery = useLatestStockMovement(sessionId, productUuid);

  if (movementQuery.isPending) {
    return (
      <span aria-busy="true" className="latest-stock-movement-cell__pending">
        Consultando movimiento…
      </span>
    );
  }

  if (movementQuery.isError || movementQuery.data === undefined) {
    return <span>No disponible</span>;
  }

  if (movementQuery.data === null) {
    return <span>Sin movimientos</span>;
  }

  const movement = formatStockMovement(movementQuery.data);

  return (
    <span className="latest-stock-movement-cell">
      <span className="latest-stock-movement-cell__type">{movement.typeLabel}</span>
      <span>
        {movement.quantityLabel}: {movement.quantity}
      </span>
      <time className="latest-stock-movement-cell__time" dateTime={movement.dateTime}>
        {movement.dateTimeLabel}
      </time>
    </span>
  );
};
