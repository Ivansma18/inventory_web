import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

import { AppLayout } from "@/app/layouts/app-layout";
import { SessionBoundary } from "@/app/layouts/session-boundary";
import { HomePage } from "@/app/pages/home-page";
import { NotFoundPage } from "@/app/pages/not-found-page";

export const appRoutes = [
  {
    path: "/",
    element: (
      <SessionBoundary>
        <AppLayout />
      </SessionBoundary>
    ),
    children: [
      { index: true, Component: HomePage },
      { path: "*", Component: NotFoundPage },
    ],
  },
] satisfies RouteObject[];

export const router = createBrowserRouter(appRoutes);
