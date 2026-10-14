import "./auth-layout.css";

import type { ReactNode } from "react";

export interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="auth-layout">
    <header className="auth-layout__header">
      <p className="auth-layout__brand">Inventory</p>
    </header>
    <main className="auth-layout__main">{children}</main>
  </div>
);
