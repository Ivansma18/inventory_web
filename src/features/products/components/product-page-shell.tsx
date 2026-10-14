import "./product-page-shell.css";

import type { ReactNode } from "react";

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
}: ProductPageShellProps) => (
  <section aria-labelledby="product-page-heading" className="product-page">
    <div
      className={`product-page__content${contentWidth === "wide" ? " product-page__content--wide" : ""}`}
    >
      <h1 className="product-page__heading" id="product-page-heading" tabIndex={-1}>
        {title}
      </h1>
      {description ? <p className="product-page__description">{description}</p> : null}
      {children}
    </div>
  </section>
);
