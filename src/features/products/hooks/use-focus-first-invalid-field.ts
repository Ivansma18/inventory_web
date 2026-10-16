import { useLayoutEffect, useRef } from "react";

interface FormElementRef {
  current: HTMLFormElement | null;
}

export const useFocusFirstInvalidField = (formRef: FormElementRef, focusRequest: number) => {
  const handledRequest = useRef(0);

  useLayoutEffect(() => {
    if (focusRequest === handledRequest.current) {
      return;
    }

    handledRequest.current = focusRequest;
    const firstInvalidField = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? [],
    ).find(
      (field) =>
        field.tabIndex >= 0 &&
        !field.matches(":disabled") &&
        field.getAttribute("aria-disabled") !== "true",
    );

    firstInvalidField?.focus({ preventScroll: true });
  }, [focusRequest, formRef]);
};
