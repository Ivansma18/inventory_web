import type { paths } from "@/shared/api/generated/inventory-contracts";

export type InventoryListQuery = NonNullable<paths["/inventory"]["get"]["parameters"]["query"]>;
export type InventoryListStatus = "active" | "inactive";
export type InventoryListStockStatus = "all" | NonNullable<InventoryListQuery["status"]>;
export type InventoryListSortField = NonNullable<InventoryListQuery["sort"]>;
export type InventoryListSortOrder = NonNullable<InventoryListQuery["order"]>;

export const INVENTORY_LIST_SORT_FIELDS = [
  "name",
  "sku",
  "quantity",
  "minimumStock",
  "updatedAt",
] as const satisfies readonly InventoryListSortField[];

const INVENTORY_LIST_URL_KEYS = new Set([
  "page",
  "search",
  "status",
  "stockStatus",
  "sort",
  "order",
]);

export interface InventoryListCriteria {
  search: string;
  status: InventoryListStatus;
  stockStatus: InventoryListStockStatus;
  sort: InventoryListSortField;
  order: InventoryListSortOrder;
}

export interface InventoryListUrlState {
  page: number;
  criteria: InventoryListCriteria;
}

export interface ParsedInventoryListUrlState extends InventoryListUrlState {
  needsNormalization: boolean;
}

export const INVENTORY_LIST_PAGE_SIZE = 15;

export const DEFAULT_INVENTORY_LIST_CRITERIA = {
  search: "",
  status: "active",
  stockStatus: "all",
  sort: "name",
  order: "asc",
} as const satisfies InventoryListCriteria;

export const isInventoryListSortField = (value: string): value is InventoryListSortField =>
  INVENTORY_LIST_SORT_FIELDS.some((field) => field === value);

const isInventoryListStockStatus = (value: string | undefined): value is InventoryListStockStatus =>
  value === "all" || value === "IN_STOCK" || value === "LOW_STOCK" || value === "OUT_OF_STOCK";

export const parseInventoryListUrlState = (
  searchParams: URLSearchParams,
): ParsedInventoryListUrlState => {
  let needsNormalization = [...searchParams.keys()].some(
    (key) => !INVENTORY_LIST_URL_KEYS.has(key),
  );

  const readSingleValue = (key: string): string | undefined => {
    const values = searchParams.getAll(key);

    if (values.length > 1) {
      needsNormalization = true;
      return undefined;
    }

    return values[0];
  };

  const pageValue = readSingleValue("page");
  let page = 1;

  if (pageValue !== undefined) {
    const parsedPage = Number(pageValue);

    if (/^[1-9]\d*$/.test(pageValue) && Number.isSafeInteger(parsedPage)) {
      page = parsedPage;
    } else {
      needsNormalization = true;
    }
  }

  const searchValue = readSingleValue("search");
  const search = searchValue?.trim() ?? "";
  if (searchValue !== undefined && search !== searchValue) {
    needsNormalization = true;
  }

  const statusValue = readSingleValue("status");
  const status: InventoryListStatus =
    statusValue === "active" || statusValue === "inactive"
      ? statusValue
      : DEFAULT_INVENTORY_LIST_CRITERIA.status;
  if (statusValue !== undefined && statusValue !== status) {
    needsNormalization = true;
  }

  const stockStatusValue = readSingleValue("stockStatus");
  const stockStatus: InventoryListStockStatus = isInventoryListStockStatus(stockStatusValue)
    ? stockStatusValue
    : DEFAULT_INVENTORY_LIST_CRITERIA.stockStatus;
  if (stockStatusValue !== undefined && stockStatusValue !== stockStatus) {
    needsNormalization = true;
  }

  const sortValue = readSingleValue("sort");
  const sort =
    sortValue !== undefined && isInventoryListSortField(sortValue)
      ? sortValue
      : DEFAULT_INVENTORY_LIST_CRITERIA.sort;
  if (sortValue !== undefined && sortValue !== sort) {
    needsNormalization = true;
  }

  const orderValue = readSingleValue("order");
  const order: InventoryListSortOrder =
    orderValue === "asc" || orderValue === "desc"
      ? orderValue
      : DEFAULT_INVENTORY_LIST_CRITERIA.order;
  if (orderValue !== undefined && orderValue !== order) {
    needsNormalization = true;
  }

  const state = { page, criteria: { search, status, stockStatus, sort, order } };
  if (searchParams.toString() !== serializeInventoryListUrlState(state).toString()) {
    needsNormalization = true;
  }

  return { ...state, needsNormalization };
};

export const serializeInventoryListUrlState = ({ page, criteria }: InventoryListUrlState) => {
  const searchParams = new URLSearchParams();
  const search = criteria.search.trim();

  searchParams.set("page", String(page));
  if (search) {
    searchParams.set("search", search);
  }
  searchParams.set("status", criteria.status);
  searchParams.set("stockStatus", criteria.stockStatus);
  searchParams.set("sort", criteria.sort);
  searchParams.set("order", criteria.order);

  return searchParams;
};

export const buildInventoryListQuery = (
  criteria: InventoryListCriteria,
  page: number,
): InventoryListQuery => {
  const search = criteria.search.trim();

  return {
    page,
    limit: INVENTORY_LIST_PAGE_SIZE,
    ...(search ? { search } : {}),
    isActive: criteria.status === "active" ? "true" : "false",
    ...(criteria.stockStatus === "all" ? {} : { status: criteria.stockStatus }),
    sort: criteria.sort,
    order: criteria.order,
  };
};
