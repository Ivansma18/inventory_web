import "./tooltip.css";

import { Tooltip as PrimeTooltip } from "primereact/tooltip";
import { useCallback, useId, useLayoutEffect, useRef } from "react";
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
  const pointerInsideTarget = useRef(false);
  const focusInsideTarget = useRef(false);
  const pointerInsideTooltip = useRef(false);

  const handleTargetPointerEnter = useCallback(() => {
    pointerInsideTarget.current = true;
  }, []);

  const handleTargetPointerLeave = useCallback(() => {
    pointerInsideTarget.current = false;
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
      !(pointerInsideTarget.current || focusInsideTarget.current || pointerInsideTooltip.current),
    [],
  );

  const handleShow = useCallback(
    ({ target }: { target: HTMLElement }) => {
      addDescriptionReference(target, tooltipId);
    },
    [tooltipId],
  );

  const handleHide = useCallback(
    ({ target }: { target: HTMLElement }) => {
      removeDescriptionReference(target, tooltipId);
    },
    [tooltipId],
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
      pointerInsideTarget.current = false;
      focusInsideTarget.current = false;
      pointerInsideTooltip.current = false;
      removeDescriptionReference(target, tooltipId);
    };
  }, [
    handleTargetBlur,
    handleTargetFocus,
    handleTargetPointerEnter,
    handleTargetPointerLeave,
    targetRef,
    tooltipId,
  ]);

  return (
    <PrimeTooltip
      autoHide={false}
      className="ui-tooltip"
      content={content}
      event="both"
      hideDelay={tooltipHideDelayMs}
      id={tooltipId}
      onBeforeHide={handleBeforeHide}
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
    />
  );
};
