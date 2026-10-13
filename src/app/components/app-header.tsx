import "./app-header.css";

import { useState } from "react";
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
  const [signOutFailed, setSignOutFailed] = useState(false);

  if (!identity) {
    return null;
  }

  const handleSignOut = async () => {
    setSignOutFailed(false);
    const result = await signOut();
    setSignOutFailed(result.error !== null);
  };

  return (
    <AppHeader
      identity={identity}
      actions={
        <>
          {actions}
          <div className="app-header__logout">
            {signOutFailed ? (
              <span className="app-header__logout-error" role="alert">
                No se pudo cerrar sesión. Inténtalo de nuevo.
              </span>
            ) : null}
            <Button loading={isSigningOut} onClick={() => void handleSignOut()} variant="secondary">
              {isSigningOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </Button>
          </div>
        </>
      }
    />
  );
};
