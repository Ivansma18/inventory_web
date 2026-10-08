import { useContext } from "react";

import { toastContext } from "./toast-context";
import type { ToastApi } from "./toast";

export const useToast = (): ToastApi => {
  const context = useContext(toastContext);
  if (!context) {
    throw new Error("useToast must be used within UiProvider.");
  }

  return context;
};
