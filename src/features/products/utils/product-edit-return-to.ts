import { DEFAULT_PRODUCT_LIST_CRITERIA } from "../hooks/use-product-list";
import {
  parseProductListUrlState,
  serializeProductListUrlState,
  type ProductListUrlState,
} from "./product-list-url-state";
import type { ProductEditNavigationIntegration } from "../types/product-edit-navigation";

const PRODUCT_LIST_PATH = "/products";
const RETURN_TO_BASE = "https://inventory.invalid";
const ALLOWED_LIST_QUERY_KEYS = new Set(["page", "search", "status", "sort", "order"]);

const DEFAULT_PRODUCT_LIST_STATE: ProductListUrlState = {
  page: 1,
  criteria: DEFAULT_PRODUCT_LIST_CRITERIA,
};

export const DEFAULT_PRODUCT_LIST_RETURN_TO = `${PRODUCT_LIST_PATH}?${serializeProductListUrlState(
  DEFAULT_PRODUCT_LIST_STATE,
).toString()}`;

export const parseProductEditReturnTo = (candidate: string | null | undefined): string | null => {
  if (
    !candidate ||
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("#") ||
    [...candidate].some((character) => {
      const code = character.charCodeAt(0);
      return code < 0x20 || code === 0x7f;
    })
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(candidate, RETURN_TO_BASE);
  } catch {
    return null;
  }

  if (url.origin !== RETURN_TO_BASE || url.pathname !== PRODUCT_LIST_PATH || url.hash) {
    return null;
  }

  const queryKeys = [...url.searchParams.keys()];
  if (
    queryKeys.some((key) => !ALLOWED_LIST_QUERY_KEYS.has(key)) ||
    new Set(queryKeys).size !== queryKeys.length
  ) {
    return null;
  }

  const listState = parseProductListUrlState(url.searchParams);
  if (listState.needsNormalization) {
    return null;
  }

  return `${PRODUCT_LIST_PATH}?${serializeProductListUrlState(listState).toString()}`;
};

export const buildProductEditLocation = (
  uuid: string,
  sourceListUrl: string,
  navigation?: ProductEditNavigationIntegration,
) => {
  const integrationParams = new URLSearchParams({ returnTo: sourceListUrl });
  const returnTo =
    navigation?.resolveReturnTo(integrationParams) ??
    parseProductEditReturnTo(sourceListUrl) ??
    DEFAULT_PRODUCT_LIST_RETURN_TO;
  const searchParams = new URLSearchParams({ returnTo });

  return `${PRODUCT_LIST_PATH}/${encodeURIComponent(uuid)}/edit?${searchParams.toString()}`;
};
