import "./select.css";

import { Dropdown as PrimeDropdown } from "primereact/dropdown";
import { useEffect, useId, useRef } from "react";

export interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string | null;
  options: SelectOption[];
  onValueChange: (value: string | null) => void;
  label: string;
  id?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  emptyMessage?: string;
}

interface DropdownOption {
  label: string;
  value: string | null;
  disabled?: boolean;
}

export const Select = ({
  value,
  options,
  onValueChange,
  label,
  id,
  placeholder = "Selecciona una opción",
  disabled = false,
  error,
  emptyMessage = "No hay opciones disponibles.",
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id?.trim() ? id : `ui-select-${generatedId}`;
  const labelId = `${selectId}-label`;
  const visibleError = error?.trim() ? error : undefined;
  const hasNoOptions = options.length === 0;
  const isDisabled = disabled || hasNoOptions;
  const errorId = visibleError ? `${selectId}-error` : undefined;
  const emptyMessageId = hasNoOptions ? `${selectId}-empty` : undefined;
  const describedBy = [errorId, emptyMessageId].filter(Boolean).join(" ") || undefined;
  const lastInvalidValue = useRef<string | null>(null);
  let emptyOptionValue = `__ui-select-empty-${generatedId}__`;

  while (options.some((option) => option.value === emptyOptionValue)) {
    emptyOptionValue += "_";
  }

  const dropdownOptions: DropdownOption[] = hasNoOptions
    ? []
    : [{ label: placeholder, value: emptyOptionValue }, ...options];
  const dropdownValue = value ?? emptyOptionValue;

  useEffect(() => {
    if (value === null) {
      lastInvalidValue.current = null;
      return;
    }

    const selectedOption = options.find((option) => option.value === value);
    if (selectedOption && !selectedOption.disabled) {
      lastInvalidValue.current = null;
      return;
    }

    if (lastInvalidValue.current !== value) {
      lastInvalidValue.current = value;
      onValueChange(null);
    }
  }, [onValueChange, options, value]);

  const handleChange = (event: { value: unknown }) => {
    if (!isDisabled) {
      onValueChange(
        event.value === emptyOptionValue || typeof event.value !== "string" ? null : event.value,
      );
    }
  };

  return (
    <div className="ui-select-field">
      <label className="ui-select__label" htmlFor={selectId} id={labelId}>
        {label}
      </label>
      <PrimeDropdown
        aria-describedby={describedBy}
        aria-invalid={visibleError ? true : undefined}
        aria-labelledby={labelId}
        className={`ui-select${visibleError ? " ui-select--invalid" : ""}`}
        disabled={isDisabled}
        inputId={selectId}
        invalid={Boolean(visibleError)}
        onChange={handleChange}
        optionDisabled="disabled"
        optionLabel="label"
        optionValue="value"
        options={dropdownOptions}
        panelClassName="ui-select__panel"
        placeholder={placeholder}
        showClear={false}
        editable={false}
        filter={false}
        value={dropdownValue}
      />
      {visibleError ? (
        <small className="ui-select__error" id={errorId}>
          {visibleError}
        </small>
      ) : null}
      {hasNoOptions ? (
        <small className="ui-select__empty" id={emptyMessageId} role="status">
          {emptyMessage}
        </small>
      ) : null}
    </div>
  );
};
