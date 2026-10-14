import { createRoot } from "react-dom/client";

import "@/shared/ui/styles.css";

import { SessionState } from "@/app/components/session-state";
import { AuthLayout } from "@/app/layouts/auth-layout";
import type { SessionStateProps } from "@/app/components/session-state";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Session state harness root is missing.");
}

const requestedState = new URLSearchParams(window.location.search).get("state");
const validStates: SessionStateProps["state"][] = ["checking", "error", "signed-out"];
const state: SessionStateProps["state"] = validStates.includes(
  requestedState as SessionStateProps["state"],
)
  ? (requestedState as SessionStateProps["state"])
  : "checking";

createRoot(root).render(
  <AuthLayout>
    <SessionState state={state} onRetry={state === "error" ? () => undefined : undefined} />
  </AuthLayout>,
);
