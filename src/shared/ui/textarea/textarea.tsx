import { InputTextarea as PrimeInputTextarea } from "primereact/inputtextarea";
import { useId } from "react";
import type { ChangeEvent } from "react";

export interface TextareaProps {
  value: string;
  onValueChange: (value: string) => void;
  id?: string;
  label?: string;
  helpText?: string;
  error?: string;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
}

export const Textarea = ({
  value,
  onValueChange,
  id,
  label,
  helpText,
  error,
  rows = 3,
  disabled = false,
  readOnly = false,
}: TextareaProps) => {
  const generatedId = useId();
  const textareaId = id?.trim() ? id : `ui-textarea-${generatedId}`;
  const visibleHelp = helpText?.trim() ? helpText : undefined;
  const visibleError = error?.trim() ? error : undefined;
  const helpId = visibleHelp ? `${textareaId}-help` : undefined;
  const errorId = visibleError ? `${textareaId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!disabled && !readOnly) {
      onValueChange(event.currentTarget.value);
    }
  };

  return (
    <div className="ui-textarea-field">
      {label ? (
        <label className="ui-textarea__label" htmlFor={textareaId}>
          {label}
        </label>
      ) : null}
      <PrimeInputTextarea
        aria-describedby={describedBy}
        aria-invalid={visibleError ? true : undefined}
        className="ui-textarea"
        disabled={disabled}
        id={textareaId}
        onChange={handleChange}
        readOnly={readOnly}
        rows={rows}
        value={value}
      />
      {visibleHelp ? (
        <small className="ui-textarea__help" id={helpId}>
          {visibleHelp}
        </small>
      ) : null}
      {visibleError ? (
        <small className="ui-textarea__error" id={errorId}>
          {visibleError}
        </small>
      ) : null}
    </div>
  );
};
