import "./tooltip.css";

import { Tooltip as PrimeTooltip } from "primereact/tooltip";
import { useCallback, useId, useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: string;
  targetRef: RefObject<HTMLElement | null>;
  position?: TooltipPosition;
}

const tooltipHideDelayMs = 120;

const addDescriptionReference = (target: HTMLElement, tooltipId: string) => {
  const descriptions =
    target.getAttribute("aria-describedby")?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (!descriptions.includes(tooltipId)) {
    target.setAttribute("aria-describedby", [...descriptions, tooltipId].join(" "));
  }
};

const removeDescriptionReference = (target: HTMLElement, tooltipId: string) => {
  const descriptions = target
    .getAttribute("aria-describedby")
    ?.trim()
    .split(/\s+/)
    .filter((descriptionId) => descriptionId && descriptionId !== tooltipId);

  if (!descriptions?.length) {
    target.removeAttribute("aria-describedby");
    return;
  }

  target.setAttribute("aria-describedby", descriptions.join(" "));
};

export const Tooltip = ({ content, targetRef, position = "top" }: TooltipProps) => {
  const generatedId = useId();
  const tooltipId = `ui-tooltip-${generatedId}`;
  const tooltipRef = useRef<PrimeTooltip>(null);
  const pointerInsideTarget = useRef(false);
  const focusInsideTarget = useRef(false);
  const pointerInsideTooltip = useRef(false);
  const dismissedByEscape = useRef(false);
  const pointerExitedAfterEscape = useRef(false);
  const tooltipIsVisible = useRef(false);
  const [escapeCloseRequested, setEscapeCloseRequested] = useState(false);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key !== "Escape" || event.defaultPrevented || !tooltipIsVisible.current) {
      return;
    }

    dismissedByEscape.current = true;
    pointerExitedAfterEscape.current = !pointerInsideTarget.current;
    setEscapeCloseRequested(true);
  }, []);

  const handleTargetPointerEnter = useCallback(() => {
    pointerInsideTarget.current = true;
  }, []);

  const handleTargetPointerLeave = useCallback(() => {
    pointerInsideTarget.current = false;

    if (dismissedByEscape.current) {
      pointerExitedAfterEscape.current = true;
    }
  }, []);

  const handleTargetFocus = useCallback(() => {
    focusInsideTarget.current = true;
  }, []);

  const handleTargetBlur = useCallback(() => {
    focusInsideTarget.current = false;
  }, []);

  const handleTooltipPointerEnter = useCallback(() => {
    pointerInsideTooltip.current = true;
  }, []);

  const handleTooltipPointerLeave = useCallback(() => {
    pointerInsideTooltip.current = false;
  }, []);

  const handleBeforeHide = useCallback(
    () =>
      dismissedByEscape.current ||
      !(pointerInsideTarget.current || focusInsideTarget.current || pointerInsideTooltip.current),
    [],
  );

  const handleBeforeShow = useCallback(({ originalEvent }: { originalEvent: { type: string } }) => {
    if (!dismissedByEscape.current) {
      return true;
    }

    if (originalEvent.type !== "mouseenter" || !pointerExitedAfterEscape.current) {
      return false;
    }

    dismissedByEscape.current = false;
    pointerExitedAfterEscape.current = false;
    return true;
  }, []);

  const handleShow = useCallback(
    ({ target }: { target: HTMLElement }) => {
      tooltipIsVisible.current = true;
      addDescriptionReference(target, tooltipId);
      document.addEventListener("keydown", handleEscape);
    },
    [handleEscape, tooltipId],
  );

  const handleHide = useCallback(
    ({ target }: { target: HTMLElement }) => {
      tooltipIsVisible.current = false;
      removeDescriptionReference(target, tooltipId);
      document.removeEventListener("keydown", handleEscape);
      setEscapeCloseRequested(false);
    },
    [handleEscape, tooltipId],
  );

  useLayoutEffect(() => {
    const target = targetRef.current;

    if (!target) {
      return;
    }

    target.addEventListener("pointerenter", handleTargetPointerEnter);
    target.addEventListener("pointerleave", handleTargetPointerLeave);
    target.addEventListener("focus", handleTargetFocus);
    target.addEventListener("blur", handleTargetBlur);

    return () => {
      target.removeEventListener("pointerenter", handleTargetPointerEnter);
      target.removeEventListener("pointerleave", handleTargetPointerLeave);
      target.removeEventListener("focus", handleTargetFocus);
      target.removeEventListener("blur", handleTargetBlur);
      document.removeEventListener("keydown", handleEscape);
      pointerInsideTarget.current = false;
      focusInsideTarget.current = false;
      pointerInsideTooltip.current = false;
      tooltipIsVisible.current = false;
      removeDescriptionReference(target, tooltipId);
    };
  }, [
    handleTargetBlur,
    handleTargetFocus,
    handleTargetPointerEnter,
    handleTargetPointerLeave,
    handleEscape,
    targetRef,
    tooltipId,
  ]);

  useLayoutEffect(() => {
    if (escapeCloseRequested) {
      tooltipRef.current?.hide();
    }
  }, [escapeCloseRequested]);

  return (
    <PrimeTooltip
      autoHide={escapeCloseRequested}
      className="ui-tooltip"
      content={content}
      closeOnEscape={false}
      event="both"
      hideDelay={escapeCloseRequested ? 0 : tooltipHideDelayMs}
      id={tooltipId}
      onBeforeHide={handleBeforeHide}
      onBeforeShow={handleBeforeShow}
      onHide={handleHide}
      onShow={handleShow}
      position={position}
      pt={{
        root: {
          "aria-hidden": false,
          onPointerEnter: handleTooltipPointerEnter,
          onPointerLeave: handleTooltipPointerLeave,
        },
      }}
      target={targetRef as RefObject<HTMLElement>}
      ref={tooltipRef}
    />
  );
};
