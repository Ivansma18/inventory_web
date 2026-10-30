import { parseInventoryReturnTo } from "@/features/inventory";
import {
  buildProductEditLocation,
  type ProductEditNavigationIntegration,
} from "@/features/products";

const inventoryNavigation: ProductEditNavigationIntegration = {
  resolveReturnTo: parseInventoryReturnTo,
};

export const buildInventoryProductEditLocation = (productUuid: string, sourceUrl: string) =>
  buildProductEditLocation(productUuid, sourceUrl, inventoryNavigation);
