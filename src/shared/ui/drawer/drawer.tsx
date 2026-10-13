import "./drawer.css";

import { Sidebar as PrimeSidebar } from "primereact/sidebar";
import { useId } from "react";
import type { ReactNode } from "react";

import { Icon } from "../icon/icon";

export interface DrawerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onCloseRequest: () => void;
}

export const Drawer = ({ open, title, children, onCloseRequest }: DrawerProps) => {
  const titleId = useId();

  return (
    <PrimeSidebar
      aria-labelledby={titleId}
      aria-modal={true}
      ariaCloseLabel="Cerrar panel"
      blockScroll
      className="ui-drawer"
      closeIcon={<Icon name="close" size="sm" />}
      closeOnEscape
      dismissable
      header={
        <h2 className="ui-drawer__title" id={titleId}>
          {title}
        </h2>
      }
      maskClassName="ui-drawer__mask"
      modal
      onHide={onCloseRequest}
      position="left"
      role="dialog"
      showCloseIcon
      visible={open}
    >
      {children}
    </PrimeSidebar>
  );
};
