import { useEffect, useLayoutEffect, useRef } from "react";
import { useBlocker } from "react-router";

export const useProductFormNavigationGuard = (isDirty: boolean) => {
  const dismissedRef = useRef(false);
  const shouldProtectRef = useRef(isDirty);
  useLayoutEffect(() => {
    shouldProtectRef.current = isDirty && !dismissedRef.current;
  }, [isDirty]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    const isLeavingCurrentLocation =
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search ||
      currentLocation.hash !== nextLocation.hash;

    return shouldProtectRef.current && isLeavingCurrentLocation;
  });

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!shouldProtectRef.current) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const dismissProtection = () => {
    dismissedRef.current = true;
    shouldProtectRef.current = false;
  };

  return { blocker, dismissProtection };
};
