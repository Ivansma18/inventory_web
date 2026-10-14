import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";

import { SessionState } from "@/app/components/session-state";
import { AuthLayout } from "@/app/layouts/auth-layout";
import { useAuth, useSession } from "@/features/auth";

export interface SessionBoundaryProps {
  children: ReactNode;
}

type SessionPresentation = "checking" | "error" | "signed-out" | "authenticated";

export const SessionBoundary = ({ children }: SessionBoundaryProps) => {
  const session = useSession();
  const { signOutError } = useAuth();
  const previousPresentation = useRef<SessionPresentation | null>(null);
  const hasResolvedInitialCheck = useRef(false);

  const presentation: SessionPresentation =
    session.verification.status === "pending"
      ? "checking"
      : session.verification.status === "error" || session.status === "unconfirmed"
        ? "error"
        : session.verification.status === "success" && session.status === "unauthenticated"
          ? "signed-out"
          : session.verification.status === "success" && session.status === "authenticated"
            ? "authenticated"
            : "error";

  useLayoutEffect(() => {
    const previous = previousPresentation.current;
    if (previous !== null && previous !== presentation && hasResolvedInitialCheck.current) {
      const focusTargetSelector =
        presentation === "authenticated"
          ? '#main-content h1[tabindex="-1"]'
          : '.session-state__heading[tabindex="-1"]';
      document.querySelector<HTMLElement>(focusTargetSelector)?.focus({ preventScroll: true });
    }

    previousPresentation.current = presentation;
    if (presentation !== "checking") {
      hasResolvedInitialCheck.current = true;
    }
  }, [presentation]);

  if (presentation === "checking") {
    return (
      <AuthLayout>
        <SessionState state="checking" />
      </AuthLayout>
    );
  }

  if (presentation === "error") {
    return (
      <AuthLayout>
        <SessionState state="error" onRetry={() => void session.refetch()} />
      </AuthLayout>
    );
  }

  if (presentation === "signed-out") {
    return (
      <AuthLayout>
        <SessionState signOutFailed={signOutError !== null} state="signed-out" />
      </AuthLayout>
    );
  }

  if (presentation === "authenticated") {
    return children;
  }

  return (
    <AuthLayout>
      <SessionState state="error" />
    </AuthLayout>
  );
};
