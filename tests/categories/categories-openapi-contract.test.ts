import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as categoriesFeature from "@/features/categories";
import {
  CategoryResponseContractError,
  parseCategoryDataResponse,
} from "@/features/categories/api/category-contract";
import type { components, paths } from "@/shared/api/generated/category-contracts";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const snapshotPath = resolve(projectRoot, "tests/contracts/categories.openapi.json");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, unknown>>;
  components: Record<string, Record<string, unknown>>;
};

const categoryQuery: NonNullable<paths["/categories"]["get"]["parameters"]["query"]> = {
  page: 2,
  limit: 15,
  search: "tools",
  isActive: "true",
  sort: "name",
  order: "asc",
};

const categoryResponse: paths["/categories"]["get"]["responses"][200]["content"]["application/json"] =
  {
    data: [
      {
        uuid: "550e8400-e29b-41d4-a716-446655440000",
        name: "Herramientas",
        description: null,
        isActive: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    pagination: { total: 16, page: 2, limit: 15 },
  };

const generatedCategory: components["schemas"]["Category"] = categoryResponse.data[0]!;
const createCategoryRequest: paths["/categories"]["post"]["requestBody"]["content"]["application/json"] =
  {
    name: "Herramientas",
  };
const updateCategoryRequest: paths["/categories/{uuid}"]["patch"]["requestBody"]["content"]["application/json"] =
  {
    name: "Oficina",
  };
const deactivateCategoryRequest: paths["/categories/{uuid}"]["patch"]["requestBody"]["content"]["application/json"] =
  {
    isActive: false,
  };
const deletedCategoryResponse: paths["/categories/{uuid}"]["delete"]["responses"][200]["content"]["application/json"] =
  {
    data: { uuid: generatedCategory.uuid },
  };

describe("Categories OpenAPI contract snapshot", () => {
  it("captures the category read paths and list query contract", () => {
    expect(snapshot.openapi).toBe("3.0.3");
    expect(snapshot.info).toEqual({ title: "Inventory API", version: "0.1.0" });
    expect(Object.keys(snapshot.paths).sort()).toEqual(["/categories", "/categories/{uuid}"]);
    expect(snapshot.paths["/categories"]).toHaveProperty("get.responses.200");
    expect(snapshot.paths["/categories/{uuid}"]).toHaveProperty("get.responses.200");
    expect(categoryQuery).toMatchObject({
      page: 2,
      limit: 15,
      search: "tools",
      isActive: "true",
    });
    expect(categoryResponse.data[0]).toEqual(generatedCategory);
    expect(categoryResponse.pagination).toEqual({ total: 16, page: 2, limit: 15 });
  });

  it("captures create, update, status-change, and permanent-delete contracts separately", () => {
    expect(snapshot.components.schemas).toMatchObject({
      CreateCategory: {
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string", nullable: true },
        },
      },
      UpdateCategory: {
        properties: {
          name: { type: "string" },
          description: { type: "string", nullable: true },
          isActive: { type: "boolean" },
        },
      },
    });
    expect(snapshot.paths["/categories"]).toMatchObject({
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateCategory" } },
          },
        },
        responses: {
          "201": {
            description: "Category created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CategoryDataResponse" },
              },
            },
          },
        },
      },
    });
    expect(snapshot.paths["/categories/{uuid}"]).toMatchObject({
      patch: {
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdateCategory" } },
          },
        },
        responses: {
          "200": {
            description: "Category updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/CategoryDataResponse" },
              },
            },
          },
        },
      },
      delete: {
        responses: {
          "200": {
            description: "Category deleted",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/DeletedCategoryDataResponse" },
              },
            },
          },
        },
      },
    });
    expect(createCategoryRequest).toEqual({ name: "Herramientas" });
    expect(updateCategoryRequest).toEqual({ name: "Oficina" });
    expect(deactivateCategoryRequest).toEqual({ isActive: false });
    expect(deletedCategoryResponse).toEqual({ data: { uuid: generatedCategory.uuid } });
    expect(deletedCategoryResponse.data).not.toHaveProperty("isActive");
  });

  it("does not expose permanent deletion as a category feature operation", () => {
    expect(categoriesFeature).not.toHaveProperty("deleteCategory");
    expect(categoriesFeature).not.toHaveProperty("useDeleteCategory");
  });

  it("rejects malformed successful category responses", () => {
    expect(() => parseCategoryDataResponse({ data: { ...generatedCategory, name: 42 } })).toThrow(
      CategoryResponseContractError,
    );
  });

  it("rejects a successful response for a different category UUID", () => {
    expect(() =>
      parseCategoryDataResponse(
        { data: generatedCategory },
        { uuid: "550e8400-e29b-41d4-a716-446655440001" },
      ),
    ).toThrow(CategoryResponseContractError);
  });

  it("rejects a successful response whose category state differs from the requested state", () => {
    expect(() =>
      parseCategoryDataResponse({ data: generatedCategory }, { isActive: false }),
    ).toThrow(CategoryResponseContractError);
  });
});
