import {
  createInventoryProductEditConfirmation,
  parseInventoryReturnTo,
} from "@/features/inventory";
import { ProductEditPage, type ProductEditNavigationIntegration } from "@/features/products";

const inventoryNavigation: ProductEditNavigationIntegration = {
  resolveReturnTo: parseInventoryReturnTo,
  createSuccessState: createInventoryProductEditConfirmation,
};

export const ProductEditRoute = () => <ProductEditPage navigation={inventoryNavigation} />;
