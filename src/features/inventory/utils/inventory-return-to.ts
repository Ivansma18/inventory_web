import {
  parseInventoryListUrlState,
  serializeInventoryListUrlState,
} from "./inventory-list-url-state";

const INVENTORY_PATH = "/inventory";
const RETURN_TO_BASE = "https://inventory.invalid";
const ALLOWED_INVENTORY_QUERY_KEYS = new Set([
  "page",
  "search",
  "status",
  "stockStatus",
  "sort",
  "order",
]);

const containsControlCharacter = (value: string): boolean =>
  [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });

const parseInventoryReturnToCandidate = (candidate: string): string | null => {
  if (
    !candidate.startsWith("/") ||
    candidate.startsWith("//") ||
    candidate.includes("\\") ||
    candidate.includes("#") ||
    containsControlCharacter(candidate) ||
    candidate.split("?", 1)[0] !== INVENTORY_PATH
  ) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(candidate, RETURN_TO_BASE);
  } catch {
    return null;
  }

  if (url.origin !== RETURN_TO_BASE || url.pathname !== INVENTORY_PATH || url.hash) {
    return null;
  }

  const queryEntries = [...url.searchParams.entries()];
  const queryKeys = queryEntries.map(([key]) => key);
  if (
    queryEntries.some(
      ([key, value]) => containsControlCharacter(key) || containsControlCharacter(value),
    ) ||
    queryKeys.some((key) => !ALLOWED_INVENTORY_QUERY_KEYS.has(key)) ||
    new Set(queryKeys).size !== queryKeys.length
  ) {
    return null;
  }

  const inventoryState = parseInventoryListUrlState(url.searchParams);
  const pageValue = url.searchParams.get("page");
  if (
    (pageValue !== null &&
      (!/^[1-9]\d*$/.test(pageValue) || !Number.isSafeInteger(Number(pageValue)))) ||
    (url.searchParams.has("search") &&
      inventoryState.criteria.search !== url.searchParams.get("search")) ||
    (url.searchParams.has("status") &&
      inventoryState.criteria.status !== url.searchParams.get("status")) ||
    (url.searchParams.has("stockStatus") &&
      inventoryState.criteria.stockStatus !== url.searchParams.get("stockStatus")) ||
    (url.searchParams.has("sort") &&
      inventoryState.criteria.sort !== url.searchParams.get("sort")) ||
    (url.searchParams.has("order") &&
      inventoryState.criteria.order !== url.searchParams.get("order"))
  ) {
    return null;
  }

  const canonicalQuery = serializeInventoryListUrlState(inventoryState).toString();
  return `${INVENTORY_PATH}?${canonicalQuery}`;
};

export const parseInventoryReturnTo = (searchParams: URLSearchParams): string | null => {
  const candidates = searchParams.getAll("returnTo");
  if (candidates.length !== 1) {
    return null;
  }

  return parseInventoryReturnToCandidate(candidates[0]);
};
