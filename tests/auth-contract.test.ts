import * as z from "zod";
import type { components } from "@/shared/api/generated/auth-contracts";
import { parsePublicAuthResponse, publicAuthResponseSchema } from "@/features/auth/auth-contract";
import { describe, expect, it } from "vitest";

const validResponse = {
  data: {
    user: {
      id: "user-id",
      email: "user@example.com",
      role: "OPERATOR",
    },
    session: {
      id: "session-id",
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  },
} satisfies components["schemas"]["PublicAuthResponse"];

type IsEqual<Left, Right> = [Left] extends [Right]
  ? [Right] extends [Left]
    ? true
    : false
  : false;

const runtimeSchemaMatchesGeneratedContract: IsEqual<
  z.infer<typeof publicAuthResponseSchema>,
  components["schemas"]["PublicAuthResponse"]
> = true;

const requiredFields = [
  ["data"],
  ["data", "user"],
  ["data", "user", "id"],
  ["data", "user", "email"],
  ["data", "user", "role"],
  ["data", "session"],
  ["data", "session", "id"],
  ["data", "session", "createdAt"],
] as const;

const omitField = (path: readonly string[]): unknown => {
  const copy = JSON.parse(JSON.stringify(validResponse)) as Record<string, unknown>;
  let parent = copy;

  for (const segment of path.slice(0, -1)) {
    parent = parent[segment] as Record<string, unknown>;
  }

  const field = path[path.length - 1];
  if (field) {
    delete parent[field];
  }

  return copy;
};

describe("public Auth response contract", () => {
  it("accepts the generated OpenAPI DTO and preserves the public date string", () => {
    expect(parsePublicAuthResponse(validResponse)).toEqual(validResponse);
    expect(runtimeSchemaMatchesGeneratedContract).toBe(true);
  });

  it.each(requiredFields.map((path) => [path.join("."), path] as const))(
    "rejects a response missing required field %s",
    (_name, path) => {
      expect(() => parsePublicAuthResponse(omitField(path))).toThrow();
    },
  );

  it.each([
    [
      "email format",
      { data: { ...validResponse.data, user: { ...validResponse.data.user, email: "invalid" } } },
    ],
    [
      "role enum",
      { data: { ...validResponse.data, user: { ...validResponse.data.user, role: "OWNER" } } },
    ],
    [
      "date-time format",
      {
        data: {
          ...validResponse.data,
          session: { ...validResponse.data.session, createdAt: "not-a-date" },
        },
      },
    ],
  ])("rejects invalid %s values", (_name, response) => {
    expect(() => parsePublicAuthResponse(response)).toThrow();
  });

  it("accepts RFC3339 offsets and strips fields outside the public contract", () => {
    const parsed = parsePublicAuthResponse({
      token: "unpublished-token",
      data: {
        user: { ...validResponse.data.user, displayName: "Not part of the public DTO" },
        session: {
          ...validResponse.data.session,
          createdAt: "2026-01-01T01:00:00+01:00",
          expiresAt: "2026-02-01T00:00:00.000Z",
          token: "unpublished-session-token",
        },
      },
    });

    expect(parsed.data.session.createdAt).toBe("2026-01-01T01:00:00+01:00");
    expect(parsed).toEqual({
      data: {
        user: validResponse.data.user,
        session: { id: "session-id", createdAt: "2026-01-01T01:00:00+01:00" },
      },
    });
  });
});
