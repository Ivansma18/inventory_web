import "./icon.css";

export type IconName =
  | "add"
  | "close"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "loading"
  | "previous"
  | "next"
  | "sort"
  | "sortAscending"
  | "sortDescending";

export type IconSize = "sm" | "md" | "lg";

type DecorativeIconProps = {
  name: IconName;
  size?: IconSize;
  decorative?: true;
  label?: never;
};

type InformativeIconProps = {
  name: IconName;
  size?: IconSize;
  decorative: false;
  label: string;
};

export type IconProps = DecorativeIconProps | InformativeIconProps;

const primeIconByName: Record<IconName, string> = {
  add: "pi-plus",
  close: "pi-times",
  info: "pi-info-circle",
  success: "pi-check-circle",
  warning: "pi-exclamation-triangle",
  error: "pi-times-circle",
  loading: "pi-spinner pi-spin",
  previous: "pi-chevron-left",
  next: "pi-chevron-right",
  sort: "pi-sort-alt",
  sortAscending: "pi-sort-amount-up-alt",
  sortDescending: "pi-sort-amount-down",
};

export const Icon = (props: IconProps) => {
  const { name, size = "md" } = props;
  const decorative = props.decorative !== false;

  if (props.decorative === false && props.label.trim().length === 0) {
    throw new Error("Informative Icon requires a non-empty accessible label.");
  }

  return (
    <span
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : props.label}
      className={`ui-icon ui-icon--${size} pi ${primeIconByName[name]}`}
      role={decorative ? undefined : "img"}
    />
  );
};
