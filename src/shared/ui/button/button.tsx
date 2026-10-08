import "./button.css";

import { Button as PrimeButton } from "primereact/button";

import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon";

interface ButtonBaseProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: ButtonVariant;
}

type ButtonWithTextProps = ButtonBaseProps & {
  children: string;
  icon?: IconName;
  accessibleLabel?: never;
};

type IconOnlyButtonProps = ButtonBaseProps & {
  accessibleLabel: string;
  children?: never;
  icon: IconName;
};

export type ButtonVariant = "primary" | "secondary";
export type ButtonProps = ButtonWithTextProps | IconOnlyButtonProps;

export const Button = ({
  disabled = false,
  loading = false,
  onClick,
  type = "button",
  variant = "primary",
  ...content
}: ButtonProps) => {
  const unavailable = disabled || loading;
  const iconOnly = content.children === undefined;
  const iconName = content.icon;
  const label = content.children;
  const accessibleLabel = content.accessibleLabel;

  if (iconOnly && (!accessibleLabel || accessibleLabel.trim().length === 0)) {
    throw new Error("Icon-only Button requires a non-empty accessible label.");
  }

  if (typeof label === "string" && label.trim().length === 0) {
    throw new Error("Button requires visible text or an accessible icon label.");
  }

  const handleClick = () => {
    if (!unavailable) {
      onClick?.();
    }
  };

  const className = ["ui-button", `ui-button--${variant}`, iconOnly ? "ui-button--icon-only" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <PrimeButton
      aria-busy={loading || undefined}
      aria-label={iconOnly ? accessibleLabel : undefined}
      className={className}
      disabled={unavailable}
      loading={loading}
      loadingIcon={<Icon name="loading" size="sm" />}
      onClick={handleClick}
      type={type}
      unstyled
    >
      {!loading && iconName ? <Icon name={iconName} size="sm" /> : null}
      {label}
    </PrimeButton>
  );
};
