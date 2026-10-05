import { RouterProvider } from "react-router/dom";

import { router } from "@/app/router/router";
import { QueryProvider } from "@/app/providers/query.provider";
import { UiProvider } from "@/app/providers/ui.provider";

export const AppProviders = () => (
  <QueryProvider>
    <UiProvider>
      <RouterProvider router={router} />
    </UiProvider>
  </QueryProvider>
);
