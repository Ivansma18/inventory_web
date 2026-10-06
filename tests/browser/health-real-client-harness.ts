import type { paths } from "@/shared/api/generated/auth-contracts";
import { httpClient } from "@/shared/api/http-client";

type HealthCheckResponse = paths["/health"]["get"]["responses"][200]["content"]["application/json"];

const healthResult = document.getElementById("health-result");

if (!healthResult) {
  throw new Error("Health check result element was not mounted.");
}

const getSafeErrorKind = (error: unknown): "http" | "network" | "unknown" => {
  if (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    (error.kind === "http" || error.kind === "network")
  ) {
    return error.kind;
  }

  return "unknown";
};

const checkHealth = async () => {
  try {
    const result = await httpClient.request<HealthCheckResponse>({
      path: "/health",
      method: "GET",
    });

    if (result.status !== "ok") {
      healthResult.dataset.status = "failure";
      healthResult.dataset.errorKind = "contract";
      healthResult.textContent = "Health check failed.";
      return;
    }

    healthResult.dataset.status = "success";
    healthResult.dataset.healthStatus = result.status;
    healthResult.textContent = "Health check succeeded.";
  } catch (error: unknown) {
    healthResult.dataset.status = "failure";
    healthResult.dataset.errorKind = getSafeErrorKind(error);
    healthResult.textContent = "Health check failed.";
  }
};

void checkHealth();
