import { useLayoutEffect, useRef } from "react";

interface FormElementRef {
  current: HTMLFormElement | null;
}

export const useFocusFirstInvalidField = (
  formRef: FormElementRef,
  focusRequest: number,
  validationState: unknown,
) => {
  const handledRequest = useRef(0);

  useLayoutEffect(() => {
    if (focusRequest === handledRequest.current) {
      return;
    }

    const firstInvalidField = Array.from(
      formRef.current?.querySelectorAll<HTMLElement>('[aria-invalid="true"]') ?? [],
    ).find(
      (field) =>
        field.tabIndex >= 0 &&
        !field.matches(":disabled") &&
        field.getAttribute("aria-disabled") !== "true",
    );

    if (!firstInvalidField) {
      return;
    }

    handledRequest.current = focusRequest;
    firstInvalidField.focus({ preventScroll: true });
  }, [focusRequest, formRef, validationState]);
};
