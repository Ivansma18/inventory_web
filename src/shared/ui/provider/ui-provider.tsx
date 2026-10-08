import { PrimeReactProvider } from "primereact/api";
import type { ReactNode } from "react";

import { ToastProvider } from "../toast/toast";

export interface UiProviderProps {
  children: ReactNode;
}

export const UiProvider = ({ children }: UiProviderProps) => (
  <PrimeReactProvider value={{ ripple: false }}>
    <ToastProvider>{children}</ToastProvider>
  </PrimeReactProvider>
);
