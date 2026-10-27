import "./dialog.css";

import { Dialog as PrimeDialog } from "primereact/dialog";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Icon } from "../icon/icon";
import {
  focusElement,
  getFirstFocusableElement,
  isAvailableFocusTarget,
  makeOutsideContentInert,
  nativeFocusableSelector,
} from "../modal/modal-accessibility";

export interface DialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onCloseRequest: () => void;
  fallbackFocusTarget: () => HTMLElement;
  showCloseButton?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  closeBlocked?: boolean;
}

interface FocusReturnMonitor {
  observer: MutationObserver;
  handleFocusIn: (event: FocusEvent) => void;
}

const createPortalContainer = () => {
  if (typeof document === "undefined") {
    return null;
  }

  const container = document.createElement("div");
  container.dataset.uiDialogPortal = "";
  return container;
};

export const Dialog = ({
  open,
  title,
  children,
  footer,
  onCloseRequest,
  fallbackFocusTarget,
  showCloseButton = true,
  closeOnEscape = true,
  closeOnBackdrop = true,
  closeBlocked = false,
}: DialogProps) => {
  const [portalContainer] = useState(createPortalContainer);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const activatorRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const focusReturnMonitorRef = useRef<FocusReturnMonitor | null>(null);

  const stopMonitoringFocusReturn = useCallback(
    (monitor: FocusReturnMonitor | null = focusReturnMonitorRef.current) => {
      if (!monitor) {
        return;
      }

      monitor.observer.disconnect();
      document.removeEventListener("focusin", monitor.handleFocusIn);
      if (focusReturnMonitorRef.current === monitor) {
        focusReturnMonitorRef.current = null;
      }
    },
    [],
  );

  const monitorActivatorRemoval = useCallback(
    (activator: HTMLElement) => {
      stopMonitoringFocusReturn();

      const observer = new MutationObserver(() => {
        if (activator.isConnected) {
          return;
        }

        stopMonitoringFocusReturn(monitor);
        if (document.activeElement === document.body) {
          focusElement(fallbackFocusTarget(), true);
        }
      });
      const handleFocusIn = (event: FocusEvent) => {
        if (event.target !== activator && event.target !== document.body) {
          stopMonitoringFocusReturn(monitor);
        }
      };

      const monitor: FocusReturnMonitor = { observer, handleFocusIn };
      focusReturnMonitorRef.current = monitor;
      document.addEventListener("focusin", handleFocusIn);
      observer.observe(document.body, { childList: true, subtree: true });
    },
    [fallbackFocusTarget, stopMonitoringFocusReturn],
  );

  useLayoutEffect(() => {
    if (!portalContainer) {
      return;
    }

    document.body.appendChild(portalContainer);
    return () => portalContainer.remove();
  }, [portalContainer]);

  useLayoutEffect(() => {
    if (open) {
      stopMonitoringFocusReturn();
    }

    if (open && !wasOpenRef.current) {
      const activeElement = document.activeElement;
      activatorRef.current =
        activeElement instanceof HTMLElement &&
        activeElement !== document.body &&
        isAvailableFocusTarget(activeElement)
          ? activeElement
          : null;
    }

    wasOpenRef.current = open;
  }, [open, stopMonitoringFocusReturn]);

  useLayoutEffect(() => () => stopMonitoringFocusReturn(), [stopMonitoringFocusReturn]);

  useLayoutEffect(() => {
    if (!open || !portalContainer) {
      return;
    }

    return makeOutsideContentInert(portalContainer);
  }, [open, portalContainer]);

  const focusDialogOnShow = () => {
    if (!portalContainer) {
      return;
    }

    const initialFocusTarget = getFirstFocusableElement(portalContainer) ?? titleRef.current;
    initialFocusTarget?.focus({ preventScroll: true });
  };

  const restoreFocusAfterExit = () => {
    const activator = activatorRef.current;
    activatorRef.current = null;

    if (activator && focusElement(activator)) {
      monitorActivatorRemoval(activator);
      return;
    }

    const pageHeader = Array.from(
      document.querySelectorAll<HTMLElement>("header, [role='banner']"),
    ).find(isAvailableFocusTarget);
    if (pageHeader && focusElement(pageHeader, true)) {
      return;
    }

    const mainRegion = Array.from(
      document.querySelectorAll<HTMLElement>("main, [role='main']"),
    ).find(isAvailableFocusTarget);
    if (mainRegion && focusElement(mainRegion, true)) {
      return;
    }

    const fallback = fallbackFocusTarget();
    const firstInteractive = getFirstFocusableElement(document.body);
    if (
      firstInteractive &&
      firstInteractive !== fallback &&
      !portalContainer?.contains(firstInteractive) &&
      !firstInteractive.closest('[role="dialog"]') &&
      focusElement(firstInteractive)
    ) {
      return;
    }

    if (!fallback.hasAttribute("tabindex") && !fallback.matches(nativeFocusableSelector)) {
      throw new Error("Dialog fallbackFocusTarget must return a focusable element.");
    }

    if (!focusElement(fallback)) {
      throw new Error(
        "Dialog fallbackFocusTarget must remain connected and focusable until close.",
      );
    }
  };

  const handleCloseRequest = () => {
    if (!closeBlocked) {
      onCloseRequest();
    }
  };

  if (!portalContainer) {
    return null;
  }

  const header = (
    <h2 className="ui-dialog__title" ref={titleRef} tabIndex={-1}>
      {title}
    </h2>
  );

  return (
    <PrimeDialog
      appendTo={portalContainer}
      ariaCloseIconLabel="Cerrar diálogo"
      className="ui-dialog"
      closeIcon={<Icon name="close" size="sm" />}
      closeOnEscape={closeOnEscape}
      closable
      dismissableMask={closeOnBackdrop}
      draggable={false}
      blockScroll
      footer={footer}
      focusOnShow={false}
      header={header}
      contentClassName="ui-dialog__content"
      maskClassName="ui-dialog__mask"
      modal
      onHide={handleCloseRequest}
      onShow={focusDialogOnShow}
      resizable={false}
      showCloseIcon={showCloseButton}
      transitionOptions={{ onExited: restoreFocusAfterExit, timeout: 150 }}
      visible={open}
    >
      {children}
    </PrimeDialog>
  );
};
