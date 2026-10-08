import "./dialog.css";

import { Dialog as PrimeDialog } from "primereact/dialog";
import { useLayoutEffect, useState } from "react";
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

  if (!portalContainer) {
    return null;
  }

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
      header={title}
      maskClassName="ui-dialog__mask"
      modal
      onHide={() => onCloseRequest()}
      resizable={false}
      showCloseIcon={showCloseButton}
      visible={open}
    >
      {children}
    </PrimeDialog>
  );
};
