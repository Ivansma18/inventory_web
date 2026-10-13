import type { ReactNode } from "react";

import { SessionState } from "@/app/components/session-state";
import { AuthLayout } from "@/app/layouts/auth-layout";
import { useSession } from "@/features/auth";

export interface SessionBoundaryProps {
  children: ReactNode;
}

export const SessionBoundary = ({ children }: SessionBoundaryProps) => {
  const session = useSession();

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
        <SessionState state="signed-out" />
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
