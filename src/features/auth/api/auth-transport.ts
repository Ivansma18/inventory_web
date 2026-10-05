import { parseJSON, type BetterAuthClientOptions } from "better-auth/client";

export const AUTH_REQUEST_TIMEOUT_MS = 10_000;

export class AuthResponseContractError extends Error {
  readonly kind = "contract";

  constructor(readonly status: number) {
    super("The authentication server returned a malformed successful response.");
    this.name = "AuthResponseContractError";
  }
}

const isJsonMediaType = (contentType: string | null): boolean => {
  const mediaType = contentType?.split(";")[0]?.trim().toLowerCase();

  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
};

const parseAuthJson = (text: string): unknown => {
  if (text.trim().length === 0) {
    return null;
  }

  return parseJSON(text, { strict: false, parseDates: false });
};

export const createAuthFetchOptions = (
  fetchImplementation?: typeof fetch,
): NonNullable<BetterAuthClientOptions["fetchOptions"]> => ({
  credentials: "include",
  timeout: AUTH_REQUEST_TIMEOUT_MS,
  jsonParser: parseAuthJson,
  customFetchImpl: async (input, init) => {
    const response = await (fetchImplementation ?? globalThis.fetch)(input, init);

    if (!response.ok || response.status === 204) {
      return response;
    }

    if (!isJsonMediaType(response.headers.get("content-type"))) {
      throw new AuthResponseContractError(response.status);
    }

    const responseText = await response.clone().text();

    try {
      JSON.parse(responseText);
    } catch {
      throw new AuthResponseContractError(response.status);
    }

    return response;
  },
});
