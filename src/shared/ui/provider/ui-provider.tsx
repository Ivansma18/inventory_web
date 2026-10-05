import { PrimeReactProvider } from "primereact/api";
import type { ReactNode } from "react";

export interface UiProviderProps {
  children: ReactNode;
}

export const UiProvider = ({ children }: UiProviderProps) => (
  <PrimeReactProvider value={{ ripple: false }}>{children}</PrimeReactProvider>
);
