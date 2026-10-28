import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { components, paths } from "@/shared/api/generated/inventory-contracts";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const snapshotPath = resolve(projectRoot, "tests/contracts/inventory.openapi.json");

type OpenApiSchema = {
  $ref?: string;
  type?: string;
  format?: string;
  nullable?: boolean;
  minimum?: number;
  maximum?: number;
  enum?: string[];
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiSchema>;
  required?: string[];
};

type OpenApiParameter = {
  name: string;
  in: string;
  required?: boolean;
  schema: OpenApiSchema;
};

type OpenApiOperation = {
  parameters?: OpenApiParameter[];
  responses?: Record<string, { content?: Record<string, { schema?: OpenApiSchema }> }>;
};

type OpenApiSnapshot = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, OpenApiOperation>>;
  components: { schemas: Record<string, OpenApiSchema> };
};

const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as OpenApiSnapshot;
const productUuid = "550e8400-e29b-41d4-a716-446655440000";

const inventoryQuery: NonNullable<paths["/inventory"]["get"]["parameters"]["query"]> = {
  page: 2,
  limit: 15,
  search: "desk",
  isActive: "true",
  status: "LOW_STOCK",
  sort: "updatedAt",
  order: "desc",
};

const inventoryResponse: paths["/inventory"]["get"]["responses"][200]["content"]["application/json"] =
  {
    data: [
      {
        productUuid,
        sku: "DSK-001",
        name: "Desk",
        categoryUuid: null,
        isActive: true,
        quantity: 2,
        minimumStock: 2,
        status: "LOW_STOCK",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    pagination: { total: 16, page: 2, limit: 15 },
  };

const movementPathParameters: NonNullable<
  paths["/inventory/{productUuid}/movements"]["get"]["parameters"]["path"]
> = { productUuid };

const movementQuery: NonNullable<
  paths["/inventory/{productUuid}/movements"]["get"]["parameters"]["query"]
> = { page: 1, limit: 1 };

const movementResponse: paths["/inventory/{productUuid}/movements"]["get"]["responses"][200]["content"]["application/json"] =
  {
    data: [
      {
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        productUuid,
        type: "ADJUSTMENT",
        quantity: 2,
        previousStock: 0,
        newStock: 2,
        reason: "Inventory count",
        reference: null,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    pagination: { total: 1, page: 1, limit: 1 },
  };

const generatedInventory: components["schemas"]["Inventory"] = inventoryResponse.data[0]!;
const generatedMovement: components["schemas"]["StockMovement"] = movementResponse.data[0]!;

const getParameter = (operation: OpenApiOperation, name: string): OpenApiParameter | undefined =>
  operation.parameters?.find((parameter) => parameter.name === name);

const resolveLocalReference = (reference: string): unknown =>
  reference
    .slice(2)
    .split("/")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce<unknown>((current, segment) => {
      if (typeof current !== "object" || current === null) {
        return undefined;
      }

      return (current as Record<string, unknown>)[segment];
    }, snapshot);

const collectReferences = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(collectReferences);
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  return Object.entries(value).flatMap(([key, entry]) =>
    key === "$ref" && typeof entry === "string" ? [entry] : collectReferences(entry),
  );
};

describe("Inventory OpenAPI contract snapshot", () => {
  it("captures only the two approved read paths and resolves their references", () => {
    expect(snapshot.openapi).toBe("3.0.3");
    expect(snapshot.info).toEqual({ title: "Inventory API", version: "0.1.0" });
    expect(Object.keys(snapshot.paths).sort()).toEqual([
      "/inventory",
      "/inventory/{productUuid}/movements",
    ]);
    expect(Object.keys(snapshot.paths["/inventory"] ?? {})).toEqual(["get"]);
    expect(Object.keys(snapshot.paths["/inventory/{productUuid}/movements"] ?? {})).toEqual([
      "get",
    ]);

    const unresolvedReferences = collectReferences(snapshot).filter(
      (reference) => reference.startsWith("#/") && resolveLocalReference(reference) === undefined,
    );

    expect(unresolvedReferences).toEqual([]);
  });

  it("captures the inventory list query and response schemas", () => {
    const listOperation = snapshot.paths["/inventory"]?.get;
    const queryParameters = listOperation?.parameters?.filter(
      (parameter) => parameter.in === "query",
    );

    expect(queryParameters?.map((parameter) => parameter.name)).toEqual([
      "page",
      "limit",
      "search",
      "isActive",
      "status",
      "sort",
      "order",
    ]);
    expect(getParameter(listOperation ?? {}, "page")).toMatchObject({
      in: "query",
      required: false,
      schema: { type: "integer", minimum: 1 },
    });
    expect(getParameter(listOperation ?? {}, "limit")?.schema).toMatchObject({
      type: "integer",
      minimum: 1,
      maximum: 100,
    });
    expect(getParameter(listOperation ?? {}, "isActive")?.schema.enum).toEqual(["true", "false"]);
    expect(getParameter(listOperation ?? {}, "status")?.schema.enum).toEqual([
      "IN_STOCK",
      "LOW_STOCK",
      "OUT_OF_STOCK",
    ]);
    expect(getParameter(listOperation ?? {}, "sort")?.schema.enum).toEqual([
      "name",
      "sku",
      "quantity",
      "minimumStock",
      "updatedAt",
    ]);
    expect(getParameter(listOperation ?? {}, "order")?.schema.enum).toEqual(["asc", "desc"]);
    expect(listOperation?.responses?.["200"]?.content?.["application/json"]?.schema).toEqual({
      $ref: "#/components/schemas/InventoryListResponse",
    });

    expect(snapshot.components.schemas.Inventory).toMatchObject({
      required: [
        "productUuid",
        "sku",
        "name",
        "categoryUuid",
        "isActive",
        "quantity",
        "minimumStock",
        "status",
        "updatedAt",
      ],
      properties: {
        productUuid: { type: "string", format: "uuid" },
        categoryUuid: { type: "string", format: "uuid", nullable: true },
        quantity: { type: "integer", minimum: 0 },
        minimumStock: { type: "integer", minimum: 0 },
        status: { type: "string", enum: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] },
        updatedAt: { type: "string", format: "date-time" },
      },
    });
    expect(snapshot.components.schemas.InventoryListResponse).toMatchObject({
      required: ["data", "pagination"],
      properties: {
        data: {
          type: "array",
          items: { $ref: "#/components/schemas/Inventory" },
        },
        pagination: { type: "object" },
      },
    });
    expect(inventoryQuery).toMatchObject({ page: 2, limit: 15, status: "LOW_STOCK" });
    expect(inventoryResponse.data[0]).toEqual(generatedInventory);
  });

  it("captures product movement query and response schemas without client-selected ordering", () => {
    const movementOperation = snapshot.paths["/inventory/{productUuid}/movements"]?.get;
    const pathParameters = movementOperation?.parameters?.filter(
      (parameter) => parameter.in === "path",
    );
    const queryParameters = movementOperation?.parameters?.filter(
      (parameter) => parameter.in === "query",
    );

    expect(pathParameters).toMatchObject([
      {
        name: "productUuid",
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
      },
    ]);
    expect(queryParameters?.map((parameter) => parameter.name)).toEqual([
      "page",
      "limit",
      "type",
      "from",
      "to",
      "reference",
    ]);
    expect(getParameter(movementOperation ?? {}, "limit")?.schema).toMatchObject({
      type: "integer",
      minimum: 1,
      maximum: 100,
    });
    expect(getParameter(movementOperation ?? {}, "type")?.schema.enum).toEqual([
      "IN",
      "OUT",
      "ADJUSTMENT",
    ]);
    expect(queryParameters?.some((parameter) => ["sort", "order"].includes(parameter.name))).toBe(
      false,
    );
    expect(movementOperation?.responses?.["200"]?.content?.["application/json"]?.schema).toEqual({
      $ref: "#/components/schemas/StockMovementListResponse",
    });
    expect(snapshot.components.schemas.StockMovement).toMatchObject({
      required: [
        "uuid",
        "productUuid",
        "type",
        "quantity",
        "previousStock",
        "newStock",
        "reason",
        "reference",
        "createdAt",
      ],
      properties: {
        uuid: { type: "string", format: "uuid" },
        productUuid: { type: "string", format: "uuid" },
        type: { type: "string", enum: ["IN", "OUT", "ADJUSTMENT"] },
        quantity: { type: "integer", minimum: 0 },
        previousStock: { type: "integer", minimum: 0 },
        newStock: { type: "integer", minimum: 0 },
        createdAt: { type: "string", format: "date-time" },
      },
    });
    expect(movementQuery).toEqual({ page: 1, limit: 1 });
    expect(movementPathParameters.productUuid).toBe(productUuid);
    expect(movementResponse.data[0]).toEqual(generatedMovement);
  });

  it("documents the backend-defined latest movement order", () => {
    // Verified in inventary-api/src/features/stock-movements/application/stock-movement.service.ts:
    // findMovements fixes createdAt DESC; domain/stock-movement.repository.ts fixes uuid ASC.
    // These are server semantics (not query parameters in OpenAPI), so clients must not override them.
    expect(
      getParameter(snapshot.paths["/inventory/{productUuid}/movements"]?.get ?? {}, "sort"),
    ).toBe(undefined);
    expect(
      getParameter(snapshot.paths["/inventory/{productUuid}/movements"]?.get ?? {}, "order"),
    ).toBe(undefined);
  });
});
