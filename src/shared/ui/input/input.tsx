import { InputText as PrimeInputText } from "primereact/inputtext";
import { useId } from "react";
import type { ChangeEvent } from "react";

export type InputType = "text" | "email" | "password" | "search" | "tel" | "url";

export interface InputProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  label?: string;
  helpText?: string;
  error?: string;
  type?: InputType;
  disabled?: boolean;
  readOnly?: boolean;
}

const supportedInputTypes = new Set<string>(["text", "email", "password", "search", "tel", "url"]);

const invalidInputTypeMessage =
  "Error de configuración: tipo de Input no admitido. Tipos válidos: text, email, password, search, tel y url.";

export const Input = ({
  value,
  onValueChange,
  id,
  label,
  helpText,
  error,
  type = "text",
  disabled = false,
  readOnly = false,
}: InputProps) => {
  const generatedId = useId();
  const inputType: string = type ?? "text";

  if (!supportedInputTypes.has(inputType)) {
    return <p role="alert">{invalidInputTypeMessage}</p>;
  }

  const inputId = id?.trim() ? id : `ui-input-${generatedId}`;
  const visibleHelp = helpText?.trim() ? helpText : undefined;
  const visibleError = error?.trim() ? error : undefined;
  const helpId = visibleHelp ? `${inputId}-help` : undefined;
  const errorId = visibleError ? `${inputId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!disabled && !readOnly) {
      onValueChange(event.currentTarget.value);
    }
  };

  return (
    <div className="ui-input-field">
      {label ? (
        <label className="ui-input__label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <PrimeInputText
        aria-describedby={describedBy}
        aria-invalid={visibleError ? true : undefined}
        className="ui-input"
        disabled={disabled}
        id={inputId}
        onChange={handleChange}
        readOnly={readOnly}
        type={inputType}
        value={value}
      />
      {visibleHelp ? (
        <small className="ui-input__help" id={helpId}>
          {visibleHelp}
        </small>
      ) : null}
      {visibleError ? (
        <small className="ui-input__error" id={errorId}>
          {visibleError}
        </small>
      ) : null}
    </div>
  );
};
