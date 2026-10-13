import { createRoot } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";

import "@/shared/ui/styles.css";

import { HomePage } from "@/app/pages/home-page";
import { NotFoundPage } from "@/app/pages/not-found-page";

const root = document.getElementById("root");

if (!root) {
  throw new Error("App pages harness root is missing.");
}

const isMissingPage = new URLSearchParams(window.location.search).get("page") === "missing";

const AppPagesHarness = () => {
  const location = useLocation();

  return (
    <main>
      {isMissingPage ? <NotFoundPage /> : <HomePage />}
      <output data-testid="current-path" hidden>
        {location.pathname}
      </output>
    </main>
  );
};

createRoot(root).render(
  <MemoryRouter initialEntries={[isMissingPage ? "/missing-destination" : "/"]}>
    <AppPagesHarness />
  </MemoryRouter>,
);
