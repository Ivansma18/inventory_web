import "./category-unsaved-changes-dialog.css";

import { Button, Dialog } from "@/shared/ui";

interface CategoryUnsavedChangesDialogProps {
  open: boolean;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
}

const getCategoryPageFocusFallback = () => {
  const heading = document.getElementById("category-page-heading");

  if (!heading) {
    throw new Error("The category page heading is required to restore focus after confirmation.");
  }

  return heading;
};

export const CategoryUnsavedChangesDialog = ({
  open,
  onContinueEditing,
  onDiscardChanges,
}: CategoryUnsavedChangesDialogProps) => (
  <Dialog
    fallbackFocusTarget={getCategoryPageFocusFallback}
    footer={
      <div className="category-unsaved-changes-dialog__actions">
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
    <p className="category-unsaved-changes-dialog__message">
      Hay cambios sin guardar. Si sales de esta página, se perderán.
    </p>
  </Dialog>
);
