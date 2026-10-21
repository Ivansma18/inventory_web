import { useLayoutEffect, useRef } from "react";
import { useBlocker } from "react-router";

export const useCategoryFormNavigationGuard = (isDirty: boolean, isOperationPending: boolean) => {
  const dismissedRef = useRef(false);
  const shouldProtectRef = useRef(isDirty && !isOperationPending);

  useLayoutEffect(() => {
    shouldProtectRef.current = !dismissedRef.current && isDirty && !isOperationPending;
  }, [isDirty, isOperationPending]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const isLeavingCurrentLocation =
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search ||
      currentLocation.hash !== nextLocation.hash;

    return shouldProtectRef.current && isLeavingCurrentLocation;
  });

  const continueEditing = () => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  const discardChanges = () => {
    if (blocker.state === "blocked") {
      dismissedRef.current = true;
      shouldProtectRef.current = false;
      blocker.proceed();
    }
  };

  const dismissProtection = () => {
    dismissedRef.current = true;
    shouldProtectRef.current = false;
  };

  return {
    blocker,
    continueEditing,
    discardChanges,
    dismissProtection,
  };
};
