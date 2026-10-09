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
import type { DataTableColumn } from "@/shared/ui";
import { useEffect, useRef, useState } from "react";

interface DemoRow {
  code: string;
  item: string;
  stock: number;
}

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
];

const demoColumns: DataTableColumn<DemoRow>[] = [
  { key: "code", header: "Código", sortable: true },
  { key: "item", header: "Artículo", sortable: true },
  { key: "stock", header: "Existencias", sortable: true },
];

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

  return (
    <main className="design-system-demo" id="design-system-main">
      <header className="design-system-demo__header">
        <h1 id="design-system-title">Demostración del sistema de diseño</h1>
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
            description="Filas de ejemplo y columnas ordenables."
            id="data-table"
            title="DataTable"
          >
            <DataTable
              columns={demoColumns}
              onPageChange={() => undefined}
              onSortChange={() => undefined}
              pageSize={5}
              result={{ status: "ready", page: 1, rows: demoRows, total: demoRows.length }}
              rowKey="code"
              sort={null}
            />
          </DemoSection>

          <DemoSection
            description="Superficie modal con foco y cierre controlados."
            id="dialog"
            title="Dialog"
          >
            <p>El diálogo de ejemplo permanece cerrado para mantener accesible la revisión.</p>
            <Dialog
              fallbackFocusTarget={() =>
                document.getElementById("design-system-title") ?? document.body
              }
              onCloseRequest={() => undefined}
              open={false}
              title="Diálogo de ejemplo"
            >
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
