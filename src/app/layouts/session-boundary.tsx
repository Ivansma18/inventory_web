import type { ReactNode } from "react";

import { SessionState } from "@/app/components/session-state";
import { AuthLayout } from "@/app/layouts/auth-layout";
import { useAuth, useSession } from "@/features/auth";

export interface SessionBoundaryProps {
  children: ReactNode;
}

export const SessionBoundary = ({ children }: SessionBoundaryProps) => {
  const session = useSession();
  const { signOutError } = useAuth();

  if (session.verification.status === "pending") {
    return (
      <AuthLayout>
        <SessionState state="checking" />
      </AuthLayout>
    );
  }

  if (session.verification.status === "error" || session.status === "unconfirmed") {
    return (
      <AuthLayout>
        <SessionState state="error" onRetry={() => void session.refetch()} />
      </AuthLayout>
    );
  }

  if (session.verification.status === "success" && session.status === "unauthenticated") {
    return (
      <AuthLayout>
        <SessionState signOutFailed={signOutError !== null} state="signed-out" />
      </AuthLayout>
    );
  }

  if (session.verification.status === "success" && session.status === "authenticated") {
    return children;
  }

  return (
    <AuthLayout>
      <SessionState state="error" />
    </AuthLayout>
  );
};
