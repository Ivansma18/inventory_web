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

export const nativeFocusableSelector = [
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

interface OutsideAccessibilityState {
  element: HTMLElement;
  hadInert: boolean;
  ariaHidden: string | null;
}

export const isAvailableFocusTarget = (element: HTMLElement): boolean => {
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

export const focusElement = (element: HTMLElement, allowTemporaryTabIndex = false): boolean => {
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

  element.focus({ preventScroll: true });
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

export const getFocusableElements = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) => element.getAttribute("role") !== "presentation" && isAvailableFocusTarget(element),
  );

export const getFirstFocusableElement = (container: HTMLElement): HTMLElement | undefined =>
  getFocusableElements(container)[0];

export const makeOutsideContentInert = (modalContainer: HTMLElement): (() => void) => {
  const outsideElements = Array.from(document.body.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement && element !== modalContainer,
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
};
