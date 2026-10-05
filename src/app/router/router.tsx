import { createBrowserRouter } from "react-router";

import { BootstrapPage } from "@/app/bootstrap-page";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: BootstrapPage,
  },
]);
