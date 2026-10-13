import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

import { SessionBoundary } from "@/app/layouts/session-boundary";
import { HomePage } from "@/app/pages/home-page";
import { NotFoundPage } from "@/app/pages/not-found-page";

export const appRoutes = [
  {
    path: "/",
    element: (
      <SessionBoundary>
        <HomePage />
      </SessionBoundary>
    ),
  },
  {
    path: "*",
    element: (
      <SessionBoundary>
        <NotFoundPage />
      </SessionBoundary>
    ),
  },
] satisfies RouteObject[];

export const router = createBrowserRouter(appRoutes);
