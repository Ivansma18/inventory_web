import { useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";

import "@/shared/ui/styles.css";

import { AppProviders } from "@/app/providers/app-providers";
import { useSession } from "@/features/auth";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Session focus harness root is missing.");
}

const SessionRefreshDriver = () => {
  const { refetch } = useSession();
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;

  useEffect(() => {
    const triggerSessionRefresh = () => {
      void refetchRef.current();
    };
    window.addEventListener("inventory:test:refetch-session", triggerSessionRefresh);
    return () =>
      window.removeEventListener("inventory:test:refetch-session", triggerSessionRefresh);
  }, []);

  return null;
};

document.title = "Inventory Session Focus Harness";

createRoot(root).render(
  <>
    <AppProviders />
    <SessionRefreshDriver />
  </>,
);
