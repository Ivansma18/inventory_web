import "./app-layout.css";

import { Outlet } from "react-router";

import { CurrentUserAppHeader } from "@/app/components/app-header";

export const AppLayout = () => (
  <div className="app-layout">
    <a className="app-layout__skip-link" href="#main-content">
      Saltar al contenido
    </a>
    <aside aria-label="Barra lateral de Inventory" className="app-layout__sidebar">
      <p className="app-layout__brand">Inventory</p>
    </aside>
    <div className="app-layout__workspace">
      <div className="app-layout__header">
        <CurrentUserAppHeader />
      </div>
      <main className="app-layout__main" id="main-content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  </div>
);
