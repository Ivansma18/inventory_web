import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useBlocker } from "react-router";

export const useCategoryFormNavigationGuard = (isDirty: boolean, isOperationPending: boolean) => {
  const dismissedRef = useRef(false);
  const shouldProtectRef = useRef(isDirty || isOperationPending);
  const isOperationPendingRef = useRef(isOperationPending);
  const navigationAttemptDuringOperationRef = useRef(false);
  const [navigationBlockedDuringOperation, setNavigationBlockedDuringOperation] = useState(false);
  const [showWaitingNotice, setShowWaitingNotice] = useState(false);

  useLayoutEffect(() => {
    isOperationPendingRef.current = isOperationPending;
    shouldProtectRef.current = !dismissedRef.current && (isDirty || isOperationPending);
  }, [isDirty, isOperationPending]);

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dismissedRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const isLeavingCurrentLocation =
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search ||
      currentLocation.hash !== nextLocation.hash;

    if (!isLeavingCurrentLocation || dismissedRef.current) {
      return false;
    }

    if (isOperationPendingRef.current) {
      navigationAttemptDuringOperationRef.current = true;
      setNavigationBlockedDuringOperation(true);
      setShowWaitingNotice(true);
      return true;
    }

    navigationAttemptDuringOperationRef.current = false;
    setNavigationBlockedDuringOperation(false);
    setShowWaitingNotice(false);
    return shouldProtectRef.current;
  });

  const blockerState = blocker.state;
  const resetBlocker = blocker.reset;

  useLayoutEffect(() => {
    if (
      blockerState !== "blocked" ||
      (!navigationAttemptDuringOperationRef.current && !isOperationPending)
    ) {
      return;
    }

    navigationAttemptDuringOperationRef.current = false;
    resetBlocker?.();
  }, [blockerState, isOperationPending, resetBlocker]);

  const continueEditing = () => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  const discardChanges = () => {
    if (blocker.state === "blocked") {
      dismissedRef.current = true;
      shouldProtectRef.current = false;
      navigationAttemptDuringOperationRef.current = false;
      setNavigationBlockedDuringOperation(false);
      setShowWaitingNotice(false);
      blocker.proceed();
    }
  };

  const dismissProtection = () => {
    dismissedRef.current = true;
    shouldProtectRef.current = false;
    navigationAttemptDuringOperationRef.current = false;
    setNavigationBlockedDuringOperation(false);
    setShowWaitingNotice(false);
  };

  const clearPendingNavigationNotice = () => {
    navigationAttemptDuringOperationRef.current = false;
    setNavigationBlockedDuringOperation(false);
    setShowWaitingNotice(false);
  };

  const resetBlockedNavigation = () => {
    if (blocker.state === "blocked") {
      blocker.reset();
    }
  };

  return {
    blocker,
    clearPendingNavigationNotice,
    continueEditing,
    discardChanges,
    dismissProtection,
    isNavigationBlockedDuringOperation:
      navigationBlockedDuringOperation || (isOperationPending && blockerState === "blocked"),
    resetBlockedNavigation,
    showWaitingNotice: showWaitingNotice && isOperationPending,
  };
};
