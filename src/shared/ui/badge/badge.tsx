import "./badge.css";

import { Tag as PrimeTag } from "primereact/tag";

export type BadgeTone = "neutral" | "success" | "info" | "warning" | "error";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

export const Badge = ({ label, tone = "neutral" }: BadgeProps) => {
  if (label.trim().length === 0) {
    throw new Error("Badge requires a non-empty label.");
  }

  return <PrimeTag className={`ui-badge ui-badge--${tone}`} unstyled value={label} />;
};
