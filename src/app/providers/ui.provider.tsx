import type { PropsWithChildren } from "react";

import { UiProvider as SharedUiProvider } from "@/shared/ui";

export const UiProvider = ({ children }: PropsWithChildren) => (
  <SharedUiProvider>{children}</SharedUiProvider>
);
