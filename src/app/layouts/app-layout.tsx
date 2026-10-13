import "./app-layout.css";

import { Outlet } from "react-router";

import { CurrentUserAppHeader } from "@/app/components/app-header";
import { CompactNavigation } from "@/app/components/compact-navigation";
import { AppNavigation } from "@/app/components/app-navigation";
import { useNavigationMode } from "@/app/hooks/use-navigation-mode";
import { useShellPreferences } from "@/app/state/shell-preferences";
import { Button } from "@/shared/ui";

export const AppLayout = () => {
  const sidebarCollapsed = useShellPreferences((state) => state.sidebarCollapsed);
  const toggleSidebar = useShellPreferences((state) => state.toggleSidebar);
  const navigationMode = useNavigationMode();
  const isCompactNavigation = navigationMode === "compact";

  return (
    <div
      className="app-layout"
      data-navigation-mode={navigationMode}
      data-sidebar-collapsed={sidebarCollapsed}
    >
      <a className="app-layout__skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {navigationMode === "persistent" ? (
        <aside aria-label="Barra lateral de Inventory" className="app-layout__sidebar">
          <div className="app-layout__sidebar-header">
            <p className="app-layout__brand">Inventory</p>
            <div className="app-layout__sidebar-toggle">
              <Button
                accessibleLabel={sidebarCollapsed ? "Expandir navegación" : "Contraer navegación"}
                ariaExpanded={!sidebarCollapsed}
                icon={sidebarCollapsed ? "next" : "previous"}
                onClick={toggleSidebar}
                variant="secondary"
              />
            </div>
          </div>
          <AppNavigation collapsed={sidebarCollapsed} />
        </aside>
      ) : null}
      <div className="app-layout__workspace">
        <div className="app-layout__header">
          <CurrentUserAppHeader actions={isCompactNavigation ? <CompactNavigation /> : undefined} />
        </div>
        <main className="app-layout__main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
