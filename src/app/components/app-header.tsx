import "./app-header.css";

import type { ReactNode } from "react";

import { usePublicIdentity } from "@/app/hooks/use-public-identity";
import { useAuth } from "@/features/auth";
import { Button } from "@/shared/ui";

export interface AppHeaderProps {
  identity: string;
  actions?: ReactNode;
}

export interface CurrentUserAppHeaderProps {
  actions?: ReactNode;
}

export const AppHeader = ({ identity, actions }: AppHeaderProps) => {
  const canShowFullIdentityOnFocus = identity.length > 32;

  return (
    <header className="app-header">
      <span
        className="app-header__identity"
        tabIndex={canShowFullIdentityOnFocus ? 0 : undefined}
        title={canShowFullIdentityOnFocus ? identity : undefined}
      >
        {identity}
      </span>
      {actions ? <div className="app-header__actions">{actions}</div> : null}
    </header>
  );
};

export const CurrentUserAppHeader = ({ actions }: CurrentUserAppHeaderProps) => {
  const identity = usePublicIdentity();
  const { isSigningOut, signOut } = useAuth();

  if (!identity) {
    return null;
  }

  return (
    <AppHeader
      identity={identity}
      actions={
        <>
          {actions}
          <Button loading={isSigningOut} onClick={() => void signOut()} variant="secondary">
            {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </Button>
        </>
      }
    />
  );
};
