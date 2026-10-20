import { Button } from "@/shared/ui";

import type { Product } from "../api/product-contract";
import { usePendingProductStatusUuids } from "../hooks/use-change-product-status";

interface ProductStatusActionProps {
  product: Product;
  sessionId: string | null;
  onRequestChange: (product: Product) => void;
}

export const ProductStatusAction = ({
  product,
  sessionId,
  onRequestChange,
}: ProductStatusActionProps) => {
  const pendingProductUuids = usePendingProductStatusUuids(sessionId);
  const isPending = pendingProductUuids.includes(product.uuid);

  return (
    <Button
      loading={isPending}
      onClick={() => {
        if (!isPending) {
          onRequestChange(product);
        }
      }}
      variant="secondary"
    >
      {product.isActive ? "Desactivar" : "Activar"}
    </Button>
  );
};
