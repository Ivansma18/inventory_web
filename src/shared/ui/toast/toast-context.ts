import { createContext } from "react";

import type { ToastApi } from "./toast";

export const toastContext = createContext<ToastApi | null>(null);
