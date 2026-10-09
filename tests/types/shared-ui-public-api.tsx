import type {
  BadgeProps,
  ButtonProps,
  DataTableProps,
  DialogProps,
  IconProps,
  InputProps,
  SelectProps,
  SkeletonProps,
  TextareaProps,
  ToastOptions,
  TooltipProps,
} from "@/shared/ui";

const vendorBadgeProp: BadgeProps = {
  label: "Saved",
  // @ts-expect-error PrimeReact severity is not part of the Badge API.
  severity: "success",
};

const vendorButtonProp: ButtonProps = {
  children: "Save",
  // @ts-expect-error PrimeReact classes are not part of the Button API.
  className: "p-button-success",
};

const vendorTableProp: DataTableProps<{ id: string }> = {
  columns: [{ key: "id", header: "ID", sortable: false }],
  onPageChange: () => {},
  onSortChange: () => {},
  pageSize: 10,
  result: { status: "ready", page: 1, rows: [], total: 0 },
  rowKey: "id",
  sort: null,
  // @ts-expect-error PrimeReact lazy mode is not part of the DataTable API.
  lazy: true,
};

const vendorDialogProp: DialogProps = {
  open: true,
  title: "Confirm",
  children: "Continue?",
  onCloseRequest: () => {},
  fallbackFocusTarget: () => document.body,
  // @ts-expect-error PrimeReact drag behavior is not part of the Dialog API.
  draggable: true,
};

const vendorIconProp: IconProps = {
  name: "add",
  // @ts-expect-error PrimeIcons classes are not part of the Icon API.
  className: "pi pi-plus",
};

const vendorInputProp: InputProps = {
  value: "",
  onValueChange: () => {},
  // @ts-expect-error Native change handlers are not part of the Input API.
  onChange: () => {},
};

const vendorSelectProp: SelectProps = {
  value: null,
  options: [],
  onValueChange: () => {},
  label: "Category",
  // @ts-expect-error PrimeReact filtering is not part of the Select API.
  filter: true,
};

const vendorSkeletonProp: SkeletonProps = {
  // @ts-expect-error PrimeReact animation choices are not part of the Skeleton API.
  animation: "wave",
};

const vendorTextareaProp: TextareaProps = {
  value: "",
  onValueChange: () => {},
  // @ts-expect-error PrimeReact auto-resize is not part of the Textarea API.
  autoResize: true,
};

const vendorTooltipProp: TooltipProps = {
  content: "More information",
  targetRef: { current: null },
  // @ts-expect-error PrimeReact event modes are not part of the Tooltip API.
  event: "both",
};

const vendorToastProp: ToastOptions = {
  kind: "success",
  message: "Saved",
  // @ts-expect-error PrimeReact timing options are not part of the Toast API.
  life: 5_000,
};

void [
  vendorBadgeProp,
  vendorButtonProp,
  vendorTableProp,
  vendorDialogProp,
  vendorIconProp,
  vendorInputProp,
  vendorSelectProp,
  vendorSkeletonProp,
  vendorTextareaProp,
  vendorTooltipProp,
  vendorToastProp,
];
