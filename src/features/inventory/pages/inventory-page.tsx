import "./inventory-page.css";

import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router";

export const InventoryPage = () => {
  const { pathname } = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useLayoutEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <section aria-labelledby="inventory-page-heading" className="inventory-page">
      <div className="inventory-page__content">
        <h1
          className="inventory-page__heading"
          id="inventory-page-heading"
          ref={headingRef}
          tabIndex={-1}
        >
          Inventario
        </h1>
        <p className="inventory-page__description">
          Consulta las existencias registradas de tus productos.
        </p>
      </div>
    </section>
  );
};
