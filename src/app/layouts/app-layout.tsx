import "./app-layout.css";

import { useCallback } from "react";
import { Outlet } from "react-router";

import { CurrentUserAppHeader } from "@/app/components/app-header";
import { CompactNavigation } from "@/app/components/compact-navigation";
import { AppNavigation } from "@/app/components/app-navigation";
import { isPersistentNavigationViewport, useNavigationMode } from "@/app/hooks/use-navigation-mode";
import { useShellPreferences } from "@/app/state/shell-preferences";
import { Button } from "@/shared/ui";

export const AppLayout = () => {
  const sidebarCollapsed = useShellPreferences((state) => state.sidebarCollapsed);
  const toggleSidebar = useShellPreferences((state) => state.toggleSidebar);
  const navigationMode = useNavigationMode();
  const isCompactNavigation = navigationMode === "compact";
  const handleCompactNavigationUnmount = useCallback(() => {
    if (!isPersistentNavigationViewport()) {
      return;
    }

    window.requestAnimationFrame(() => {
      if (!isPersistentNavigationViewport()) {
        return;
      }

      const activeNavigationLink = document.querySelector<HTMLElement>(
        '.app-layout__sidebar .app-navigation__link[aria-current="page"]',
      );
      const pageHeading = document.querySelector<HTMLElement>('#main-content h1[tabindex="-1"]');
      (activeNavigationLink ?? pageHeading)?.focus({ preventScroll: true });
    });
  }, []);

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
          <CurrentUserAppHeader
            actions={
              isCompactNavigation ? (
                <CompactNavigation onUnmountWhileOpen={handleCompactNavigationUnmount} />
              ) : undefined
            }
          />
        </div>
        <main className="app-layout__main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
