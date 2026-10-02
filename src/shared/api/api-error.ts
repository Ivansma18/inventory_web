export interface HttpApiError {
  kind: "http";
  status: number;
  message: string;
  code?: string;
  fieldErrors?: Record<string, string[]>;
}

export interface NetworkApiError {
  kind: "network";
  message: string;
}

export type ApiError = HttpApiError | NetworkApiError;

const genericHttpMessage = "The request failed.";
const genericNetworkMessage = "Unable to reach the server.";
const publicErrorCodePattern = /^[A-Z][A-Z0-9_]*$/;

type UnknownRecord = Record<string, unknown>;
type RecognizedError = { code: string; fieldErrors?: unknown };

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isPublicErrorCode = (value: unknown): value is string =>
  typeof value === "string" && publicErrorCodePattern.test(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validateFieldErrors = (value: unknown): Record<string, string[]> | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldErrors: Array<[string, string[]]> = [];

  for (const [field, messages] of Object.entries(value)) {
    if (
      field.trim().length === 0 ||
      !Array.isArray(messages) ||
      messages.length === 0 ||
      !messages.every(isNonEmptyString)
    ) {
      return undefined;
    }

    fieldErrors.push([field, messages as string[]]);
  }

  return Object.fromEntries(fieldErrors);
};

const getRecognizedError = (body: unknown): RecognizedError | undefined => {
  if (!isRecord(body) || !Object.hasOwn(body, "error") || !isRecord(body.error)) {
    return undefined;
  }

  const error = body.error;

  if (!isPublicErrorCode(error.code) || !isNonEmptyString(error.message)) {
    return undefined;
  }

  return {
    code: error.code,
    ...(Object.hasOwn(error, "fieldErrors") ? { fieldErrors: error.fieldErrors } : {}),
  };
};

export const normalizeHttpError = (status: number, body: unknown): HttpApiError => {
  const baseError: HttpApiError = {
    kind: "http",
    status,
    message: genericHttpMessage,
  };
  const recognizedError = getRecognizedError(body);

  if (!recognizedError) {
    return baseError;
  }

  const fieldErrors = validateFieldErrors(recognizedError.fieldErrors);

  return {
    ...baseError,
    code: recognizedError.code,
    ...(fieldErrors ? { fieldErrors } : {}),
  };
};

export const createNetworkApiError = (): NetworkApiError => ({
  kind: "network",
  message: genericNetworkMessage,
});
