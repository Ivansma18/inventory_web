import { Link } from "react-router";

import "./not-found-page.css";

export const NotFoundPage = () => (
  <section aria-labelledby="not-found-page-heading" className="not-found-page">
    <h1 className="not-found-page__heading" id="not-found-page-heading" tabIndex={-1}>
      Página no encontrada
    </h1>
    <p className="not-found-page__message">No encontramos una página en esta dirección.</p>
    <Link className="not-found-page__action" to="/">
      Volver a Inicio
    </Link>
  </section>
);
