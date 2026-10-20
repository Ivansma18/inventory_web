import type { CategoryListQuery } from "../api/categories-api";

export type CategoryListStatus = "active" | "inactive";
export type CategoryListSortField = NonNullable<CategoryListQuery["sort"]>;
export type CategoryListSortOrder = NonNullable<CategoryListQuery["order"]>;

export const CATEGORY_LIST_SORT_FIELDS = [
  "name",
  "createdAt",
  "updatedAt",
] as const satisfies readonly CategoryListSortField[];

export const isCategoryListSortField = (value: string): value is CategoryListSortField =>
  CATEGORY_LIST_SORT_FIELDS.some((field) => field === value);

export interface CategoryListCriteria {
  search: string;
  status: CategoryListStatus;
  sort: CategoryListSortField;
  order: CategoryListSortOrder;
}

export interface CategoryListUrlState {
  page: number;
  criteria: CategoryListCriteria;
}

export interface ParsedCategoryListUrlState extends CategoryListUrlState {
  needsNormalization: boolean;
}

export const DEFAULT_CATEGORY_LIST_CRITERIA = {
  search: "",
  status: "active",
  sort: "name",
  order: "asc",
} as const satisfies CategoryListCriteria;

export const parseCategoryListUrlState = (
  searchParams: URLSearchParams,
): ParsedCategoryListUrlState => {
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
  if (searchValue !== undefined && (!search || search !== searchValue)) {
    needsNormalization = true;
  }

  const statusValue = readSingleValue("status");
  const status: CategoryListStatus =
    statusValue === "active" || statusValue === "inactive" ? statusValue : "active";
  if (statusValue !== undefined && statusValue !== status) {
    needsNormalization = true;
  }

  const sortValue = readSingleValue("sort");
  const sort = sortValue !== undefined && isCategoryListSortField(sortValue) ? sortValue : "name";
  if (sortValue !== undefined && sortValue !== sort) {
    needsNormalization = true;
  }

  const orderValue = readSingleValue("order");
  const order = orderValue === "asc" || orderValue === "desc" ? orderValue : "asc";
  if (orderValue !== undefined && orderValue !== order) {
    needsNormalization = true;
  }

  return {
    page,
    criteria: { search, status, sort, order },
    needsNormalization,
  };
};

export const serializeCategoryListUrlState = ({ page, criteria }: CategoryListUrlState) => {
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
