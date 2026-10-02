import { describe, expect, it } from "vitest";

import { createNetworkApiError, normalizeHttpError } from "../src/shared/api/api-error";

describe("HTTP API error normalization", () => {
  it("preserves the status, public code, and validated field errors", () => {
    const result = normalizeHttpError(422, {
      error: {
        code: "VALIDATION_FAILED",
        message: "The request was invalid.",
        fieldErrors: {
          sku: ["SKU is required."],
          quantity: ["Quantity must be positive."],
        },
      },
    });

    expect(result).toEqual({
      kind: "http",
      status: 422,
      code: "VALIDATION_FAILED",
      message: "The request failed.",
      fieldErrors: {
        sku: ["SKU is required."],
        quantity: ["Quantity must be positive."],
      },
    });
  });

  it("preserves a recognized error code and status without inventing fields", () => {
    expect(
      normalizeHttpError(401, {
        error: { code: "UNAUTHORIZED", message: "Authentication required." },
      }),
    ).toEqual({
      kind: "http",
      status: 401,
      code: "UNAUTHORIZED",
      message: "The request failed.",
    });
  });

  it("discards malformed field errors while retaining a valid public code", () => {
    const result = normalizeHttpError(400, {
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid fields.",
        fieldErrors: { sku: "not-an-array" },
      },
    });

    expect(result).toEqual({
      kind: "http",
      status: 400,
      code: "VALIDATION_FAILED",
      message: "The request failed.",
    });
  });

  it.each([
    ["empty body", null],
    ["empty string", ""],
    ["HTML body", "<html><body>proxy error</body></html>"],
    ["missing error envelope", { code: "FORBIDDEN", message: "Forbidden." }],
    ["malformed error code", { error: { code: 403, message: "Forbidden." } }],
    ["missing error message", { error: { code: "FORBIDDEN" } }],
  ])("normalizes an unrecognized %s to a generic HTTP error", (_description, body) => {
    expect(normalizeHttpError(503, body)).toEqual({
      kind: "http",
      status: 503,
      message: "The request failed.",
    });
  });

  it("never publishes raw payloads or unvalidated backend messages", () => {
    const secret = "database-password-must-not-leak";
    const result = normalizeHttpError(500, {
      error: {
        code: "INTERNAL_ERROR",
        message: `Unexpected failure: ${secret}`,
      },
      debug: secret,
    });

    expect(result).toEqual({
      kind: "http",
      status: 500,
      code: "INTERNAL_ERROR",
      message: "The request failed.",
    });
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});

describe("network API errors", () => {
  it("distinguishes a failure without an HTTP response", () => {
    const result = createNetworkApiError();

    expect(result).toEqual({
      kind: "network",
      message: "Unable to reach the server.",
    });
    expect(result).not.toHaveProperty("status");
  });
});
