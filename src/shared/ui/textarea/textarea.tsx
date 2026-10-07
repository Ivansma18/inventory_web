import { InputTextarea as PrimeInputTextarea } from "primereact/inputtextarea";
import type { ChangeEvent } from "react";

export interface TextareaProps {
  value: string;
  onValueChange: (value: string) => void;
  rows?: number;
  disabled?: boolean;
  readOnly?: boolean;
}

export const Textarea = ({
  value,
  onValueChange,
  rows = 3,
  disabled = false,
  readOnly = false,
}: TextareaProps) => {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    if (!disabled && !readOnly) {
      onValueChange(event.currentTarget.value);
    }
  };

  return (
    <PrimeInputTextarea
      className="ui-textarea"
      disabled={disabled}
      onChange={handleChange}
      readOnly={readOnly}
      rows={rows}
      value={value}
    />
  );
};
