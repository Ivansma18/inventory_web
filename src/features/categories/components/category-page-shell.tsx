import "./category-page-shell.css";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router";

interface CategoryPageShellProps {
  children?: ReactNode;
  description?: string;
  title: string;
}

export const CategoryPageShell = ({ children, description, title }: CategoryPageShellProps) => {
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <section aria-labelledby="category-page-heading" className="category-page">
      <div className="category-page__content">
        <h1
          className="category-page__heading"
          id="category-page-heading"
          ref={headingRef}
          tabIndex={-1}
        >
          {title}
        </h1>
        {description ? <p className="category-page__description">{description}</p> : null}
        {children}
      </div>
    </section>
  );
};
