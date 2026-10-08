import "./dialog.css";

import { Dialog as PrimeDialog } from "primereact/dialog";
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { Icon } from "../icon/icon";

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
}

interface OutsideAccessibilityState {
  element: HTMLElement;
  hadInert: boolean;
  ariaHidden: string | null;
}

const focusableSelector = [
  "a[href]",
  "area[href]",
  "button:not(:disabled)",
  'input:not(:disabled):not([type="hidden"])',
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const nativeFocusableSelector = [
  "a[href]",
  "area[href]",
  "button",
  "input",
  "select",
  "textarea",
  "iframe",
  "object",
  "embed",
  "summary",
  '[contenteditable="true"]',
].join(",");

const isAvailableFocusTarget = (element: HTMLElement): boolean => {
  if (
    !element.isConnected ||
    element.hidden ||
    element.matches(":disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    element.closest('[hidden], [inert], [aria-hidden="true"]')
  ) {
    return false;
  }

  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden";
};

const focusElement = (element: HTMLElement, allowTemporaryTabIndex = false): boolean => {
  if (!isAvailableFocusTarget(element)) {
    return false;
  }

  const addTemporaryTabIndex =
    allowTemporaryTabIndex &&
    !element.hasAttribute("tabindex") &&
    !element.matches(nativeFocusableSelector);

  if (addTemporaryTabIndex) {
    element.setAttribute("tabindex", "-1");
  }

  element.focus();
  if (document.activeElement !== element) {
    if (addTemporaryTabIndex) {
      element.removeAttribute("tabindex");
    }
    return false;
  }

  if (addTemporaryTabIndex) {
    element.addEventListener(
      "blur",
      () => {
        if (element.getAttribute("tabindex") === "-1") {
          element.removeAttribute("tabindex");
        }
      },
      { once: true },
    );
  }

  return true;
};

const getFirstFocusableElement = (container: HTMLElement): HTMLElement | undefined =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).find(
    (element) =>
      !element.matches(":disabled") &&
      !element.hidden &&
      element.getAttribute("role") !== "presentation" &&
      !element.closest('[hidden], [inert], [aria-hidden="true"]'),
  );

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
}: DialogProps) => {
  const [portalContainer] = useState(createPortalContainer);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const activatorRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useLayoutEffect(() => {
    if (!portalContainer) {
      return;
    }

    document.body.appendChild(portalContainer);
    return () => portalContainer.remove();
  }, [portalContainer]);

  useLayoutEffect(() => {
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
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !portalContainer) {
      return;
    }

    const outsideElements = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== portalContainer,
    );
    const previousStates: OutsideAccessibilityState[] = outsideElements.map((element) => ({
      element,
      hadInert: element.hasAttribute("inert"),
      ariaHidden: element.getAttribute("aria-hidden"),
    }));

    for (const { element } of previousStates) {
      element.setAttribute("inert", "");
      element.setAttribute("aria-hidden", "true");
    }

    return () => {
      for (const { element, hadInert, ariaHidden } of previousStates) {
        if (hadInert) {
          element.setAttribute("inert", "");
        } else {
          element.removeAttribute("inert");
        }

        if (ariaHidden === null) {
          element.removeAttribute("aria-hidden");
        } else {
          element.setAttribute("aria-hidden", ariaHidden);
        }
      }
    };
  }, [open, portalContainer]);

  const focusDialogOnShow = () => {
    if (!portalContainer) {
      return;
    }

    const initialFocusTarget = getFirstFocusableElement(portalContainer) ?? titleRef.current;
    initialFocusTarget?.focus();
  };

  const restoreFocusAfterExit = () => {
    const activator = activatorRef.current;
    activatorRef.current = null;

    if (activator && focusElement(activator)) {
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
      footer={footer}
      focusOnShow={false}
      header={header}
      maskClassName="ui-dialog__mask"
      modal
      onHide={() => onCloseRequest()}
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
