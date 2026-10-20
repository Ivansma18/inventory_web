import { snapshotOpenApi } from "./snapshot-openapi.mjs";

await snapshotOpenApi({
  outputFile: "tests/contracts/products.openapi.json",
  paths: ["/products", "/products/{uuid}"],
  scope: "Products",
});
