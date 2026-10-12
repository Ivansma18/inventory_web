import { addLocale, locale, localeOptions, PrimeReactProvider } from "primereact/api";
import type { LocaleOptions } from "primereact/api";
import type { ReactNode } from "react";

import { ToastProvider } from "../toast/toast";

const englishLocale = localeOptions("en") as LocaleOptions;

addLocale("es", {
  ...englishLocale,
  aria: {
    ...(englishLocale.aria ?? {}),
    firstPageLabel: "Primera página",
    lastPageLabel: "Última página",
    navigation: "Paginación",
    nextPageLabel: "Página siguiente",
    pageLabel: "Página {page}",
    prevPageLabel: "Página anterior",
    rowsPerPageLabel: "Filas por página",
  },
});
locale("es");

export interface UiProviderProps {
  children: ReactNode;
}

export const UiProvider = ({ children }: UiProviderProps) => (
  <PrimeReactProvider value={{ locale: "es", ripple: false }}>
    <ToastProvider>{children}</ToastProvider>
  </PrimeReactProvider>
);
