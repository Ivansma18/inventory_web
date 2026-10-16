import "./product-unsaved-changes-dialog.css";

import { Button, Dialog } from "@/shared/ui";

interface ProductUnsavedChangesDialogProps {
  open: boolean;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
}

const getProductPageFocusFallback = () => {
  const heading = document.getElementById("product-page-heading");

  if (!heading) {
    throw new Error("The product page heading is required to restore focus after confirmation.");
  }

  return heading;
};

export const ProductUnsavedChangesDialog = ({
  open,
  onContinueEditing,
  onDiscardChanges,
}: ProductUnsavedChangesDialogProps) => (
  <Dialog
    fallbackFocusTarget={getProductPageFocusFallback}
    footer={
      <div className="product-unsaved-changes-dialog__actions">
        <Button onClick={onContinueEditing}>Continuar editando</Button>
        <Button onClick={onDiscardChanges} variant="secondary">
          Descartar cambios
        </Button>
      </div>
    }
    onCloseRequest={onContinueEditing}
    open={open}
    showCloseButton={false}
    title="¿Descartar los cambios?"
  >
    <p className="product-unsaved-changes-dialog__message">
      Hay cambios sin guardar. Si sales de esta página, se perderán.
    </p>
  </Dialog>
);
