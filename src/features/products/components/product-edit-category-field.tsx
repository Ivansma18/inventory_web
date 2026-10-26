import "./product-edit-category-field.css";

import { CategorySelector } from "@/features/categories";

interface ProductEditCategoryFieldProps {
  categoryAssignmentRejected: boolean;
  categoryRefreshRequired: boolean;
  disabled?: boolean;
  error?: string;
  onActiveCategorySelected: () => void;
  onCategoryOptionsRefreshed: () => void;
  onBlur: () => void;
  onValueChange: (value: string | null) => void;
  originalCategoryUuid: string | null;
  sessionId: string | null;
  value: string | null;
}

export const ProductEditCategoryField = ({
  categoryAssignmentRejected,
  categoryRefreshRequired,
  disabled = false,
  error,
  onActiveCategorySelected,
  onCategoryOptionsRefreshed,
  onBlur,
  onValueChange,
  originalCategoryUuid,
  sessionId,
  value,
}: ProductEditCategoryFieldProps) => {
  const retainedCategoryMessage =
    originalCategoryUuid === null
      ? "El producto seguirá sin categoría."
      : "Se conserva la categoría original.";

  return (
    <div className="product-edit-category-field">
      {originalCategoryUuid === null && value === null ? (
        <p className="product-edit-category-field__status" role="status">
          Sin categoría
        </p>
      ) : null}

      {categoryAssignmentRejected ? (
        categoryRefreshRequired ? (
          <div className="product-edit-category-field__error" role="alert">
            <p>
              El backend rechazó la categoría seleccionada. {retainedCategoryMessage} Actualiza las
              opciones antes de elegir otra.
            </p>
          </div>
        ) : (
          <p className="product-edit-category-field__status" role="status">
            La asignación rechazada se retiró. {retainedCategoryMessage} Elige una categoría activa
            para asignarla de nuevo.
          </p>
        )
      ) : null}

      <CategorySelector
        allowEmptySelection={originalCategoryUuid === null}
        disabled={disabled}
        emptyMessage={
          originalCategoryUuid === null
            ? "No hay categorías activas; el producto seguirá sin categoría."
            : "No hay categorías activas para reemplazar la categoría actual."
        }
        error={error}
        label="Categoría"
        onActiveCategorySelected={onActiveCategorySelected}
        onBlur={onBlur}
        onOptionsRefreshed={() => {
          if (categoryRefreshRequired) {
            onCategoryOptionsRefreshed();
          }
        }}
        onValueChange={onValueChange}
        originalCategoryUuid={originalCategoryUuid}
        refreshRequired={categoryRefreshRequired}
        required={originalCategoryUuid !== null}
        sessionId={sessionId}
        value={value}
      />
    </div>
  );
};
