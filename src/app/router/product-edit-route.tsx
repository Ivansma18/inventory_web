import { parseInventoryReturnTo } from "@/features/inventory";
import { ProductEditPage, type ProductEditNavigationIntegration } from "@/features/products";

const inventoryNavigation: ProductEditNavigationIntegration = {
  resolveReturnTo: parseInventoryReturnTo,
};

export const ProductEditRoute = () => <ProductEditPage navigation={inventoryNavigation} />;
