import type { IconName } from "@/shared/ui";

export interface AppNavigationItem {
  id: string;
  label: string;
  to: string;
  icon: IconName;
}

export const appNavigationItems = [
  { id: "home", label: "Inicio", to: "/", icon: "home" },
  { id: "products", label: "Productos", to: "/products", icon: "box" },
] as const satisfies readonly AppNavigationItem[];
