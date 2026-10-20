import "./category-list.page.css";

import { useLayoutEffect, useRef } from "react";

export const CategoryListPage = () => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section aria-labelledby="category-list-heading" className="category-list-page">
      <div className="category-list-page__content">
        <h1
          className="category-list-page__heading"
          id="category-list-heading"
          ref={headingRef}
          tabIndex={-1}
        >
          Categorías
        </h1>
        <p className="category-list-page__description">
          Organiza las categorías que utilizas para clasificar tus productos.
        </p>
      </div>
    </section>
  );
};
