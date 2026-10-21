import {
  DEFAULT_CATEGORY_LIST_CRITERIA,
  parseCategoryListUrlState,
  serializeCategoryListUrlState,
  type CategoryListUrlState,
} from "./category-list-url-state";

const CATEGORY_LIST_PATH = "/categories";
const RETURN_TO_BASE = "https://inventory.invalid";
const ALLOWED_LIST_QUERY_KEYS = new Set(["page", "search", "status", "sort", "order"]);

const DEFAULT_CATEGORY_LIST_STATE: CategoryListUrlState = {
  page: 1,
  criteria: DEFAULT_CATEGORY_LIST_CRITERIA,
};

export const DEFAULT_CATEGORY_LIST_RETURN_TO = `${CATEGORY_LIST_PATH}?${serializeCategoryListUrlState(
  DEFAULT_CATEGORY_LIST_STATE,
).toString()}`;

export const parseCategoryEditReturnTo = (candidate: string | null | undefined): string | null => {
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

  if (url.origin !== RETURN_TO_BASE || url.pathname !== CATEGORY_LIST_PATH || url.hash) {
    return null;
  }

  const queryKeys = [...url.searchParams.keys()];
  if (
    queryKeys.some((key) => !ALLOWED_LIST_QUERY_KEYS.has(key)) ||
    new Set(queryKeys).size !== queryKeys.length
  ) {
    return null;
  }

  const listState = parseCategoryListUrlState(url.searchParams);
  if (listState.needsNormalization) {
    return null;
  }

  return `${CATEGORY_LIST_PATH}?${serializeCategoryListUrlState(listState).toString()}`;
};
