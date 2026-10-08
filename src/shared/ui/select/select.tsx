import "./select.css";

import { Dropdown as PrimeDropdown } from "primereact/dropdown";
import { useId } from "react";

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
}

export const Select = ({
  value,
  options,
  onValueChange,
  label,
  id,
  placeholder = "Selecciona una opción",
  disabled = false,
}: SelectProps) => {
  const generatedId = useId();
  const selectId = id?.trim() ? id : `ui-select-${generatedId}`;
  const labelId = `${selectId}-label`;

  const handleChange = (event: { value: unknown }) => {
    if (!disabled) {
      onValueChange(typeof event.value === "string" ? event.value : null);
    }
  };

  return (
    <div className="ui-select-field">
      <label className="ui-select__label" htmlFor={selectId} id={labelId}>
        {label}
      </label>
      <PrimeDropdown
        aria-labelledby={labelId}
        className="ui-select"
        disabled={disabled}
        inputId={selectId}
        onChange={handleChange}
        optionDisabled="disabled"
        optionLabel="label"
        optionValue="value"
        options={options}
        panelClassName="ui-select__panel"
        placeholder={placeholder}
        showClear={false}
        editable={false}
        filter={false}
        value={value}
      />
    </div>
  );
};
