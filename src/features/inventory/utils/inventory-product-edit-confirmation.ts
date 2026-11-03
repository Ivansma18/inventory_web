import { parseInventoryReturnTo } from "./inventory-return-to";

const CONFIRMATION_TYPE = "inventory-product-edit-confirmation";
const CONFIRMED_OPERATION = "product-update";
const CONFIRMATION_KEYS = ["type", "operation", "sessionId", "destination"];

export interface InventoryProductEditConfirmation {
  type: typeof CONFIRMATION_TYPE;
  operation: typeof CONFIRMED_OPERATION;
  sessionId: string;
  destination: string;
}

const getCanonicalInventoryDestination = (candidate: unknown): string | null => {
  if (typeof candidate !== "string") {
    return null;
  }

  const canonicalDestination = parseInventoryReturnTo(new URLSearchParams({ returnTo: candidate }));

  return canonicalDestination === candidate ? candidate : null;
};

export const createInventoryProductEditConfirmation = (
  sessionId: string | null,
  destination: string,
): InventoryProductEditConfirmation | null => {
  const canonicalDestination = getCanonicalInventoryDestination(destination);
  if (sessionId === null || sessionId.length === 0 || canonicalDestination === null) {
    return null;
  }

  return {
    type: CONFIRMATION_TYPE,
    operation: CONFIRMED_OPERATION,
    sessionId,
    destination: canonicalDestination,
  };
};

export const getInventoryProductEditConfirmation = (
  state: unknown,
  sessionId: string | null,
  destination: string,
): InventoryProductEditConfirmation | null => {
  if (
    typeof state !== "object" ||
    state === null ||
    Array.isArray(state) ||
    Object.keys(state).length !== CONFIRMATION_KEYS.length ||
    !CONFIRMATION_KEYS.every((key) => Object.hasOwn(state, key))
  ) {
    return null;
  }

  const confirmation = state as Partial<InventoryProductEditConfirmation>;
  if (
    confirmation.type !== CONFIRMATION_TYPE ||
    confirmation.operation !== CONFIRMED_OPERATION ||
    typeof confirmation.sessionId !== "string" ||
    typeof confirmation.destination !== "string" ||
    sessionId === null ||
    confirmation.sessionId !== sessionId ||
    getCanonicalInventoryDestination(confirmation.destination) !== destination ||
    getCanonicalInventoryDestination(destination) !== destination
  ) {
    return null;
  }

  return confirmation as InventoryProductEditConfirmation;
};

export const rebaseInventoryProductEditConfirmation = (
  state: unknown,
  sessionId: string | null,
  currentDestination: string,
  nextDestination: string,
): InventoryProductEditConfirmation | null => {
  const confirmation = getInventoryProductEditConfirmation(state, sessionId, currentDestination);
  if (confirmation === null) {
    return null;
  }

  return createInventoryProductEditConfirmation(sessionId, nextDestination);
};
