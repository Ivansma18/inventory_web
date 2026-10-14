import "./product-list.page.css";

export const ProductListPage = () => (
  <section aria-labelledby="product-list-page-heading" className="product-list-page">
    <div className="product-list-page__content">
      <h1 className="product-list-page__heading" id="product-list-page-heading" tabIndex={-1}>
        Productos
      </h1>
      <p className="product-list-page__description">Catálogo de productos</p>
    </div>
  </section>
);
