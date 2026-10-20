import "./product-page-shell.css";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useLocation } from "react-router";

interface ProductPageShellProps {
  children?: ReactNode;
  contentWidth?: "default" | "wide";
  description?: string;
  title: string;
}

export const ProductPageShell = ({
  children,
  contentWidth = "default",
  description,
  title,
}: ProductPageShellProps) => {
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <section aria-labelledby="product-page-heading" className="product-page">
      <div
        className={`product-page__content${contentWidth === "wide" ? " product-page__content--wide" : ""}`}
      >
        <h1
          className="product-page__heading"
          id="product-page-heading"
          ref={headingRef}
          tabIndex={-1}
        >
          {title}
        </h1>
        {description ? <p className="product-page__description">{description}</p> : null}
        {children}
      </div>
    </section>
  );
};
