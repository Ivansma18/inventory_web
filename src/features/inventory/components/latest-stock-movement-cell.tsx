import "./latest-stock-movement-cell.css";

import { Button } from "@/shared/ui";

import { useInventoryAuthRevalidation } from "../hooks/use-inventory-auth-revalidation";
import { useLatestStockMovement } from "../hooks/use-latest-stock-movement";
import { formatStockMovement } from "../utils/format-stock-movement";
import {
  isForbiddenLatestStockMovementError,
  isLatestStockMovementAuthenticationError,
  isRetryableLatestStockMovementError,
  isUnauthorizedLatestStockMovementError,
} from "../utils/latest-stock-movement-errors";

interface LatestStockMovementCellProps {
  productName: string;
  productUuid: string;
  refetchSession: () => Promise<unknown>;
  sessionId: string | null;
}

export const LatestStockMovementCell = ({
  productName,
  productUuid,
  refetchSession,
  sessionId,
}: LatestStockMovementCellProps) => {
  const movementQuery = useLatestStockMovement(sessionId, productUuid);
  useInventoryAuthRevalidation(
    sessionId,
    movementQuery.error,
    isUnauthorizedLatestStockMovementError,
    refetchSession,
  );

  if (movementQuery.error !== null || movementQuery.isError) {
    const canRetry = isRetryableLatestStockMovementError(movementQuery.error);
    const message = isForbiddenLatestStockMovementError(movementQuery.error)
      ? "Acceso no permitido"
      : isLatestStockMovementAuthenticationError(movementQuery.error)
        ? "No disponible"
        : "No se pudo consultar";

    return (
      <div
        aria-busy={movementQuery.isFetching || undefined}
        aria-label={`Último movimiento de ${productName}`}
        className="latest-stock-movement-cell latest-stock-movement-cell--error"
        role="group"
      >
        <span className="latest-stock-movement-cell__error-message">{message}</span>
        {canRetry ? (
          <Button
            ariaDisabled={movementQuery.isFetching}
            loading={movementQuery.isFetching}
            onClick={() => void movementQuery.refetch()}
            type="button"
            variant="secondary"
          >
            {movementQuery.isFetching
              ? `Reintentando último movimiento de ${productName}…`
              : `Reintentar último movimiento de ${productName}`}
          </Button>
        ) : null}
      </div>
    );
  }

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
