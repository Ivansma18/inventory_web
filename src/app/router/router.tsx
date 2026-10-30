import { createBrowserRouter } from "react-router";
import type { RouteObject } from "react-router";

import { AppLayout } from "@/app/layouts/app-layout";
import { SessionBoundary } from "@/app/layouts/session-boundary";
import { HomePage } from "@/app/pages/home-page";
import { NotFoundPage } from "@/app/pages/not-found-page";
import { InventoryPage } from "@/features/inventory";
import { CategoryCreatePage, CategoryEditPage, CategoryListPage } from "@/features/categories";
import { ProductCreatePage, ProductListPage } from "@/features/products";

import { buildInventoryProductEditLocation } from "./inventory-edit-link";
import { ProductEditRoute } from "./product-edit-route";

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
      { path: "products", Component: ProductListPage },
      { path: "categories", Component: CategoryListPage },
      { path: "categories/new", Component: CategoryCreatePage },
      { path: "categories/:uuid/edit", Component: CategoryEditPage },
      {
        path: "inventory",
        element: <InventoryPage buildProductEditLocation={buildInventoryProductEditLocation} />,
      },
      { path: "products/new", Component: ProductCreatePage },
      { path: "products/:uuid/edit", Component: ProductEditRoute },
      { path: "*", Component: NotFoundPage },
    ],
  },
] satisfies RouteObject[];

export const router = createBrowserRouter(appRoutes);
