import { useSyncExternalStore } from "react";

export type NavigationMode = "compact" | "persistent";

const persistentNavigationQuery = "(min-width: 64rem)";

const getNavigationMode = (): NavigationMode => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "persistent";
  }

  return window.matchMedia(persistentNavigationQuery).matches ? "persistent" : "compact";
};

export const isPersistentNavigationViewport = () => getNavigationMode() === "persistent";

const subscribeToNavigationMode = (onChange: () => void) => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia(persistentNavigationQuery);
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }

  mediaQuery.addListener(onChange);
  return () => mediaQuery.removeListener(onChange);
};

export const useNavigationMode = (): NavigationMode =>
  useSyncExternalStore(subscribeToNavigationMode, getNavigationMode, () => "persistent");
