import "./compact-navigation.css";

import { useRef, useState } from "react";

import { AppNavigation } from "@/app/components/app-navigation";
import { Button, Drawer } from "@/shared/ui";

export const CompactNavigation = () => {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const resolveTrigger = () => triggerRef.current?.querySelector("button") ?? null;

  return (
    <>
      <div className="compact-navigation__trigger" ref={triggerRef}>
        <Button
          accessibleLabel="Abrir navegación"
          ariaExpanded={open}
          icon="menu"
          onClick={() => setOpen(true)}
          variant="secondary"
        />
      </div>
      <Drawer
        onCloseRequest={() => setOpen(false)}
        open={open}
        resolveFocusTargetOnClose={resolveTrigger}
        title="Navegación principal"
      >
        <div className="compact-navigation__content">
          <p className="compact-navigation__brand">Inventory</p>
          <AppNavigation />
        </div>
      </Drawer>
    </>
  );
};
