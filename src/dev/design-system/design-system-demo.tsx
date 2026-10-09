import "./design-system-demo.css";

import {
  Badge,
  Button,
  DataTable,
  Dialog,
  Icon,
  Input,
  Select,
  Skeleton,
  Textarea,
  Tooltip,
  useToast,
} from "@/shared/ui";
import type {
  DataTableColumn,
  DataTableResult,
  DataTableSnapshot,
  DataTableSort,
} from "@/shared/ui";
import { useEffect, useRef, useState } from "react";

interface DemoRow {
  code: string;
  item: string;
  stock: number;
}

type DemoTableScenario = "ready" | "loading" | "empty" | "error";
type DemoOperationState = "ready" | "pending" | "completed";

interface DemoSectionProps {
  children: React.ReactNode;
  description: string;
  id: string;
  title: string;
}

const demoRows: DemoRow[] = [
  { code: "ART-2048", item: "Teclado compacto", stock: 18 },
  { code: "ART-1072", item: "Ratón inalámbrico", stock: 7 },
  { code: "ART-3105", item: "Cable USB-C", stock: 42 },
  { code: "ART-0540", item: "Monitor portátil", stock: 6 },
  { code: "ART-2013", item: "Adaptador HDMI", stock: 24 },
  { code: "ART-4077", item: "Soporte portátil", stock: 11 },
  { code: "ART-0905", item: "Hub USB", stock: 9 },
];

const demoPageSize = 3;
const demoTableError = "Error de carga de ejemplo.";

const demoColumns: DataTableColumn<DemoRow>[] = [
  { key: "code", header: "Código", sortable: true },
  { key: "item", header: "Artículo", sortable: true },
  { key: "stock", header: "Existencias", sortable: true },
];

const getDesignSystemDialogFallback = (): HTMLElement => {
  const target = document.getElementById("design-system-title");

  if (!(target instanceof HTMLElement)) {
    throw new Error("El encabezado de la demo debe seguir disponible para devolver el foco.");
  }

  return target;
};

const primitiveLinks = [
  { id: "badge", label: "Badge" },
  { id: "button", label: "Button" },
  { id: "data-table", label: "DataTable" },
  { id: "dialog", label: "Dialog" },
  { id: "icon", label: "Icon" },
  { id: "input", label: "Input" },
  { id: "select", label: "Select" },
  { id: "skeleton", label: "Skeleton" },
  { id: "textarea", label: "Textarea" },
  { id: "toast", label: "Toast" },
  { id: "tooltip", label: "Tooltip" },
];

const DemoSection = ({ children, description, id, title }: DemoSectionProps) => (
  <section aria-labelledby={`${id}-title`} className="design-system-demo__section" id={id}>
    <header className="design-system-demo__section-heading">
      <h2 id={`${id}-title`}>{title}</h2>
      <p>{description}</p>
    </header>
    <div className="design-system-demo__showcase">{children}</div>
  </section>
);

const ToastExample = () => {
  const { show } = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) {
      return;
    }

    shown.current = true;
    show({ kind: "info", message: "Notificación informativa de ejemplo." });
  }, [show]);

  return <p>La notificación aparece como ejemplo al abrir esta página.</p>;
};

export const DesignSystemDemo = () => {
  const [actionCount, setActionCount] = useState(0);
  const [iconActionCount, setIconActionCount] = useState(0);
  const [badgeAvailable, setBadgeAvailable] = useState(false);
  const [articleCode, setArticleCode] = useState("ART-2048");
  const [description, setDescription] = useState(
    "Contenido ficticio para revisar texto multilínea.",
  );
  const [selectedStatus, setSelectedStatus] = useState<string | null>("available");
  const [statusError, setStatusError] = useState<string | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogShowCloseButton, setDialogShowCloseButton] = useState(true);
  const [dialogCloseOnEscape, setDialogCloseOnEscape] = useState(true);
  const [dialogCloseOnBackdrop, setDialogCloseOnBackdrop] = useState(true);
  const [dialogCloseBlocked, setDialogCloseBlocked] = useState(false);
  const [dialogOperationState, setDialogOperationState] = useState<DemoOperationState>("ready");
  const [tablePage, setTablePage] = useState(1);
  const [tableSort, setTableSort] = useState<DataTableSort<DemoRow> | null>(null);
  const [tableScenario, setTableScenario] = useState<DemoTableScenario>("ready");
  const [tableHasSnapshot, setTableHasSnapshot] = useState(true);
  const tooltipTarget = useRef<HTMLButtonElement>(null);
  const articleCodeError = articleCode.trim()
    ? undefined
    : "El código de artículo no puede estar vacío.";
  const selectedStatusLabel =
    selectedStatus === "available"
      ? "Disponible"
      : selectedStatus === "review"
        ? "Por revisar"
        : "sin selección";
  const sortedTableRows = tableSort
    ? [...demoRows].sort((left, right) => {
        const leftValue = left[tableSort.columnId];
        const rightValue = right[tableSort.columnId];
        const comparison =
          typeof leftValue === "number" && typeof rightValue === "number"
            ? leftValue - rightValue
            : String(leftValue).localeCompare(String(rightValue), "es", { numeric: true });

        return tableSort.direction === "asc" ? comparison : -comparison;
      })
    : demoRows;
  const tablePageRows = sortedTableRows.slice(
    Math.max(0, (tablePage - 1) * demoPageSize),
    tablePage * demoPageSize,
  );
  const tableSnapshot: DataTableSnapshot<DemoRow> = {
    page: tablePage,
    rows: tablePageRows,
    total: demoRows.length,
  };
  const visibleTableResult: DataTableResult<DemoRow> =
    tableScenario === "empty"
      ? { status: "ready", page: 0, rows: [], total: 0 }
      : tableScenario === "loading"
        ? tableHasSnapshot
          ? { status: "loading", snapshot: tableSnapshot }
          : { status: "loading" }
        : tableScenario === "error"
          ? tableHasSnapshot
            ? { status: "error", message: demoTableError, snapshot: tableSnapshot }
            : { status: "error", message: demoTableError }
          : { status: "ready", ...tableSnapshot };

  const resetDemoTable = () => {
    setTableScenario("ready");
    setTableHasSnapshot(true);
    setTablePage(1);
    setTableSort(null);
  };

  return (
    <main className="design-system-demo" id="design-system-main">
      <header className="design-system-demo__header">
        <h1 id="design-system-title" tabIndex={-1}>
          Demostración del sistema de diseño
        </h1>
        <p>Primitivas de interfaz y estados disponibles para las pantallas de Inventory.</p>
      </header>

      <div className="design-system-demo__layout">
        <nav aria-label="Índice de primitivas" className="design-system-demo__index">
          {primitiveLinks.map(({ id, label }) => (
            <a href={`#${id}`} key={id}>
              {label}
            </a>
          ))}
        </nav>

        <div className="design-system-demo__sections">
          <DemoSection
            description="Etiquetas textuales con tonos semánticos y un estado alternable."
            id="badge"
            title="Badge"
          >
            <Badge label="Disponible" tone="success" />
            <Badge label="Por revisar" tone="warning" />
            <Badge label="Neutral" />
            <Button
              onClick={() => setBadgeAvailable((available) => !available)}
              variant="secondary"
            >
              Cambiar estado de ejemplo
            </Button>
            <Badge
              label={`Estado: ${badgeAvailable ? "Disponible" : "Por revisar"}`}
              tone={badgeAvailable ? "success" : "warning"}
            />
          </DemoSection>

          <DemoSection
            description="Acciones con variantes y estados de disponibilidad."
            id="button"
            title="Button"
          >
            <Button onClick={() => setActionCount((count) => count + 1)}>Acción primaria</Button>
            <Button onClick={() => setActionCount((count) => count + 1)} variant="secondary">
              Acción secundaria
            </Button>
            <Button disabled onClick={() => undefined}>
              Deshabilitado
            </Button>
            <Button loading onClick={() => undefined}>
              Cargando
            </Button>
            <output aria-live="polite" className="design-system-demo__interaction-feedback">
              Acciones activadas: {actionCount}
            </output>
          </DemoSection>

          <DemoSection
            description="Paginación, ordenación y estados con datos ficticios locales."
            id="data-table"
            title="DataTable"
          >
            <Button onClick={() => setTableScenario("loading")} variant="secondary">
              Simular carga
            </Button>
            <Button onClick={() => setTableScenario("error")} variant="secondary">
              Simular error
            </Button>
            <Button
              onClick={() => {
                setTableScenario("empty");
                setTableHasSnapshot(false);
                setTablePage(0);
              }}
              variant="secondary"
            >
              Vaciar tabla
            </Button>
            <Button onClick={resetDemoTable} variant="secondary">
              Restablecer tabla
            </Button>
            <DataTable
              columns={demoColumns}
              onPageChange={setTablePage}
              onSortChange={(sort) => {
                setTableSort(sort);
                setTablePage(1);
              }}
              pageSize={demoPageSize}
              result={visibleTableResult}
              rowKey="code"
              sort={tableSort}
            />
          </DemoSection>

          <DemoSection
            description="Superficie modal con foco y cierre controlados."
            id="dialog"
            title="Dialog"
          >
            <Button
              onClick={() => setDialogShowCloseButton((enabled) => !enabled)}
              variant="secondary"
            >
              {`Botón de cierre: ${dialogShowCloseButton ? "habilitado" : "deshabilitado"}`}
            </Button>
            <Button
              onClick={() => setDialogCloseOnEscape((enabled) => !enabled)}
              variant="secondary"
            >
              {`Escape: ${dialogCloseOnEscape ? "habilitado" : "deshabilitado"}`}
            </Button>
            <Button
              onClick={() => setDialogCloseOnBackdrop((enabled) => !enabled)}
              variant="secondary"
            >
              {`Clic exterior: ${dialogCloseOnBackdrop ? "habilitado" : "deshabilitado"}`}
            </Button>
            <Button
              onClick={() => {
                const nextBlocked = !dialogCloseBlocked;
                setDialogCloseBlocked(nextBlocked);
                setDialogOperationState(nextBlocked ? "pending" : "ready");
              }}
              variant="secondary"
            >
              {`Bloqueo pendiente: ${dialogCloseBlocked ? "activo" : "inactivo"}`}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>Abrir diálogo</Button>
            <Dialog
              closeBlocked={dialogCloseBlocked}
              closeOnBackdrop={dialogCloseOnBackdrop}
              closeOnEscape={dialogCloseOnEscape}
              fallbackFocusTarget={getDesignSystemDialogFallback}
              footer={
                <div className="design-system-demo__dialog-actions">
                  <Button
                    disabled={dialogCloseBlocked}
                    onClick={() => setDialogOpen(false)}
                    variant="secondary"
                  >
                    Cerrar desde el contenido
                  </Button>
                  <Button
                    disabled={!dialogCloseBlocked}
                    onClick={() => {
                      setDialogCloseBlocked(false);
                      setDialogOperationState("completed");
                    }}
                  >
                    Completar operación de ejemplo
                  </Button>
                </div>
              }
              onCloseRequest={() => setDialogOpen(false)}
              open={dialogOpen}
              showCloseButton={dialogShowCloseButton}
              title="Diálogo de ejemplo"
            >
              <p role="status">
                {dialogOperationState === "pending"
                  ? "Operación de ejemplo pendiente. El cierre está bloqueado."
                  : dialogOperationState === "completed"
                    ? "Operación completada. Ya puedes cerrar el diálogo."
                    : "Prueba los mecanismos de cierre y la operación pendiente."}
              </p>
              <p>Contenido ficticio de la demostración.</p>
            </Dialog>
          </DemoSection>

          <DemoSection
            description="Iconos decorativos, informativos y una acción con icono."
            id="icon"
            title="Icon"
          >
            <Icon name="info" />
            <Icon decorative={false} label="Información" name="info" />
            <Icon name="success" size="lg" />
            <Button
              accessibleLabel="Activar acción con icono"
              icon="add"
              onClick={() => setIconActionCount((count) => count + 1)}
            />
            <output aria-live="polite" className="design-system-demo__interaction-feedback">
              Acciones con icono activadas: {iconActionCount}
            </output>
          </DemoSection>

          <DemoSection
            description="Campo editable con ayuda y validación de ejemplo."
            id="input"
            title="Input"
          >
            <Input
              helpText="Valor ficticio para revisar la presentación."
              label="Código de artículo"
              onValueChange={setArticleCode}
              error={articleCodeError}
              value={articleCode}
            />
            <Input
              disabled
              label="Campo deshabilitado"
              onValueChange={() => undefined}
              value="Sin edición"
            />
          </DemoSection>

          <DemoSection
            description="Selección simple, opción deshabilitada y error al limpiar."
            id="select"
            title="Select"
          >
            <Select
              label="Estado"
              error={statusError}
              onValueChange={(value) => {
                setSelectedStatus(value);
                setStatusError(value ? undefined : "Selecciona un estado para revisar el error.");
              }}
              options={[
                { value: "available", label: "Disponible" },
                { value: "review", label: "Por revisar" },
                { value: "archived", label: "Archivado", disabled: true },
              ]}
              value={selectedStatus}
            />
            <Badge
              label={`Estado de ejemplo: ${selectedStatusLabel}`}
              tone={selectedStatus === "available" ? "success" : "neutral"}
            />
          </DemoSection>

          <DemoSection
            description="Formas decorativas para contenido pendiente."
            id="skeleton"
            title="Skeleton"
          >
            <Skeleton count={3} loadingText="Cargando resumen de ejemplo" />
          </DemoSection>

          <DemoSection
            description="Campo multilínea con valor controlado editable."
            id="textarea"
            title="Textarea"
          >
            <Textarea
              helpText="Puedes editar el texto para comprobar el valor controlado."
              label="Descripción"
              onValueChange={setDescription}
              rows={3}
              value={description}
            />
          </DemoSection>

          <DemoSection
            description="Avisos breves para comunicar resultados."
            id="toast"
            title="Toast"
          >
            <ToastExample />
          </DemoSection>

          <DemoSection
            description="Ayuda contextual disponible por puntero y foco."
            id="tooltip"
            title="Tooltip"
          >
            <button
              className="design-system-demo__tooltip-target"
              ref={tooltipTarget}
              type="button"
            >
              Control con ayuda
            </button>
            <Tooltip content="Descripción breve del control." targetRef={tooltipTarget} />
          </DemoSection>
        </div>
      </div>
    </main>
  );
};
