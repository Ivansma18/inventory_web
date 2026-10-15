import "./product-edit.page.css";

import { useParams } from "react-router";

import { useSession } from "@/features/auth";

import { ProductEditForm } from "../components/product-edit-form";
import { ProductPageShell } from "../components/product-page-shell";
import { useProduct } from "../hooks/use-product";

export const ProductEditPage = () => {
  const { uuid = "" } = useParams();
  const session = useSession();
  const sessionId = session.status === "authenticated" ? session.session.id : null;
  const productQuery = useProduct(sessionId, uuid);

  return (
    <ProductPageShell
      description="Consulta y edita la información del producto."
      title="Editar producto"
    >
      {productQuery.isPending ? (
        <p aria-live="polite" className="product-edit-page__status" role="status">
          Cargando datos del producto…
        </p>
      ) : productQuery.isError ? (
        <p className="product-edit-page__error" role="alert">
          No se pudieron cargar los datos del producto.
        </p>
      ) : productQuery.data ? (
        <ProductEditForm key={productQuery.data.uuid} product={productQuery.data} />
      ) : null}
    </ProductPageShell>
  );
};
