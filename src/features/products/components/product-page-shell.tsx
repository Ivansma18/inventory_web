import "./product-page-shell.css";

interface ProductPageShellProps {
  description?: string;
  title: string;
}

export const ProductPageShell = ({ description, title }: ProductPageShellProps) => (
  <section aria-labelledby="product-page-heading" className="product-page">
    <div className="product-page__content">
      <h1 className="product-page__heading" id="product-page-heading" tabIndex={-1}>
        {title}
      </h1>
      {description ? <p className="product-page__description">{description}</p> : null}
    </div>
  </section>
);
