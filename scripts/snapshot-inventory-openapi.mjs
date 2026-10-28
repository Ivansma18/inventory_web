import { snapshotOpenApi } from "./snapshot-openapi.mjs";

await snapshotOpenApi({
  outputFile: "tests/contracts/inventory.openapi.json",
  paths: ["/inventory", "/inventory/{productUuid}/movements"],
  scope: "Inventory",
});
