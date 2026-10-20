import { ProductPageShell } from "../components/product-page-shell";
import { ProductCreateForm } from "../components/product-create-form";

export const ProductCreatePage = () => (
  <ProductPageShell
    description="Añade los datos básicos para incorporar un producto al catálogo."
    title="Crear producto"
  >
    <ProductCreateForm />
  </ProductPageShell>
);
