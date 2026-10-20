import { snapshotOpenApi } from "./snapshot-openapi.mjs";

await snapshotOpenApi({
  outputFile: "tests/contracts/auth-health.openapi.json",
  paths: [
    "/health",
    "/api/auth/sign-in/email",
    "/api/auth/get-session",
    "/api/auth/sign-out",
    "/api/auth/sign-up/email",
  ],
  scope: "Auth/health",
});
