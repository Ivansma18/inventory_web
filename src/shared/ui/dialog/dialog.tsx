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
  showCloseButton = true,
  closeOnEscape = true,
  closeOnBackdrop = true,
}: DialogProps) => {
  const [portalContainer] = useState(createPortalContainer);
  const titleRef = useRef<HTMLHeadingElement>(null);

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
      visible={open}
    >
      {children}
    </PrimeDialog>
  );
};
