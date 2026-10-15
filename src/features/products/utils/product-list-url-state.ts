import {
  DEFAULT_PRODUCT_LIST_CRITERIA,
  isProductListSortField,
  type ProductListCriteria,
} from "../hooks/use-product-list";

export interface ProductListUrlState {
  page: number;
  criteria: ProductListCriteria;
}

export interface ParsedProductListUrlState extends ProductListUrlState {
  needsNormalization: boolean;
}

export const parseProductListUrlState = (
  searchParams: URLSearchParams,
): ParsedProductListUrlState => {
  let needsNormalization = false;
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
  const status =
    statusValue === "active" || statusValue === "inactive"
      ? statusValue
      : DEFAULT_PRODUCT_LIST_CRITERIA.status;
  if (statusValue !== undefined && statusValue !== status) {
    needsNormalization = true;
  }

  const sortValue = readSingleValue("sort");
  const sort =
    sortValue !== undefined && isProductListSortField(sortValue)
      ? sortValue
      : DEFAULT_PRODUCT_LIST_CRITERIA.sort;
  if (sortValue !== undefined && sortValue !== sort) {
    needsNormalization = true;
  }

  const orderValue = readSingleValue("order");
  const order =
    orderValue === "asc" || orderValue === "desc"
      ? orderValue
      : DEFAULT_PRODUCT_LIST_CRITERIA.order;
  if (orderValue !== undefined && orderValue !== order) {
    needsNormalization = true;
  }

  return {
    page,
    criteria: { search, status, sort, order },
    needsNormalization,
  };
};

export const serializeProductListUrlState = ({ page, criteria }: ProductListUrlState) => {
  const searchParams = new URLSearchParams();
  const search = criteria.search.trim();

  searchParams.set("page", String(page));
  if (search) {
    searchParams.set("search", search);
  }
  searchParams.set("status", criteria.status);
  searchParams.set("sort", criteria.sort);
  searchParams.set("order", criteria.order);

  return searchParams;
};
