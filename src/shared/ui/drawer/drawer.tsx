import "./drawer.css";

import { Sidebar as PrimeSidebar } from "primereact/sidebar";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";

import { Icon } from "../icon/icon";
import {
  focusElement,
  getFirstFocusableElement,
  getFocusableElements,
  makeOutsideContentInert,
} from "../modal/modal-accessibility";

export interface DrawerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onCloseRequest: () => void;
  resolveFocusTargetOnClose: () => HTMLElement | null;
}

const createPortalContainer = () => {
  if (typeof document === "undefined") {
    return null;
  }

  const container = document.createElement("div");
  container.dataset.uiDrawerPortal = "";
  return container;
};

export const Drawer = ({
  open,
  title,
  children,
  onCloseRequest,
  resolveFocusTargetOnClose,
}: DrawerProps) => {
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [portalContainer] = useState(createPortalContainer);
  const focusTargetResolverRef = useRef(resolveFocusTargetOnClose);

  useLayoutEffect(() => {
    focusTargetResolverRef.current = resolveFocusTargetOnClose;
  }, [resolveFocusTargetOnClose]);

  useLayoutEffect(() => {
    if (!portalContainer) {
      return;
    }

    document.body.appendChild(portalContainer);
    return () => portalContainer.remove();
  }, [portalContainer]);

  useLayoutEffect(() => {
    if (!open || !portalContainer) {
      return;
    }

    return makeOutsideContentInert(portalContainer);
  }, [open, portalContainer]);

  const focusDrawerOnShow = () => {
    if (!portalContainer) {
      return;
    }

    const initialFocusTarget = getFirstFocusableElement(portalContainer) ?? titleRef.current;
    initialFocusTarget?.focus({ preventScroll: true });
  };

  const focusTargetAfterClose = () => {
    const focusTarget = focusTargetResolverRef.current();
    if (focusTarget) {
      focusElement(focusTarget, true);
    }
  };

  const containTabNavigation = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !portalContainer) {
      return;
    }

    const focusableElements = getFocusableElements(portalContainer);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    if (!firstFocusable || !lastFocusable) {
      event.preventDefault();
      titleRef.current?.focus({ preventScroll: true });
      return;
    }

    const activeElement = document.activeElement;
    const focusIsInside =
      activeElement instanceof HTMLElement && portalContainer.contains(activeElement);

    if (event.shiftKey && (activeElement === firstFocusable || !focusIsInside)) {
      event.preventDefault();
      focusElement(lastFocusable);
    } else if (!event.shiftKey && (activeElement === lastFocusable || !focusIsInside)) {
      event.preventDefault();
      focusElement(firstFocusable);
    }
  };

  if (!portalContainer) {
    return null;
  }

  return (
    <PrimeSidebar
      appendTo={portalContainer}
      aria-labelledby={titleId}
      aria-modal={true}
      ariaCloseLabel="Cerrar panel"
      blockScroll
      className="ui-drawer"
      closeIcon={<Icon name="close" size="sm" />}
      closeOnEscape
      dismissable
      header={
        <h2 className="ui-drawer__title" id={titleId} ref={titleRef} tabIndex={-1}>
          {title}
        </h2>
      }
      onKeyDown={containTabNavigation}
      maskClassName="ui-drawer__mask"
      modal
      onHide={onCloseRequest}
      onShow={focusDrawerOnShow}
      position="left"
      role="dialog"
      showCloseIcon
      transitionOptions={{ onExited: focusTargetAfterClose, timeout: 300 }}
      visible={open}
    >
      <div className="ui-drawer__content">{children}</div>
    </PrimeSidebar>
  );
};
