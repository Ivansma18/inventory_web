import "./home-page.css";

export const HomePage = () => (
  <section aria-labelledby="home-page-heading" className="home-page">
    <div className="home-page__content">
      <h1 className="home-page__heading" id="home-page-heading" tabIndex={-1}>
        Bienvenido a Inventory
      </h1>
      <p className="home-page__message">Aquí empieza tu jornada de trabajo.</p>
    </div>
  </section>
);
