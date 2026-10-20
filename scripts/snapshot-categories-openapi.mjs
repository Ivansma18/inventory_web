import { snapshotOpenApi } from "./snapshot-openapi.mjs";

await snapshotOpenApi({
  outputFile: "tests/contracts/categories.openapi.json",
  paths: ["/categories", "/categories/{uuid}"],
  scope: "Categories",
});
