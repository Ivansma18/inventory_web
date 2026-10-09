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
import { useEffect, useRef } from "react";

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
  const tooltipTarget = useRef<HTMLButtonElement>(null);

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
            description="Etiquetas textuales con tonos semánticos."
            id="badge"
            title="Badge"
          >
            <Badge label="Disponible" tone="success" />
            <Badge label="Por revisar" tone="warning" />
            <Badge label="Neutral" />
          </DemoSection>

          <DemoSection
            description="Acciones con variantes y estados de disponibilidad."
            id="button"
            title="Button"
          >
            <Button onClick={() => undefined}>Acción primaria</Button>
            <Button onClick={() => undefined} variant="secondary">
              Acción secundaria
            </Button>
            <Button disabled onClick={() => undefined}>
              Deshabilitado
            </Button>
            <Button loading onClick={() => undefined}>
              Cargando
            </Button>
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

          <DemoSection description="Iconos decorativos e informativos." id="icon" title="Icon">
            <Icon name="info" />
            <Icon decorative={false} label="Información" name="info" />
            <Icon name="success" size="lg" />
          </DemoSection>

          <DemoSection
            description="Campo de texto con ayuda y estado de solo lectura."
            id="input"
            title="Input"
          >
            <Input
              helpText="Valor ficticio para revisar la presentación."
              label="Código de artículo"
              onValueChange={() => undefined}
              readOnly
              value="ART-2048"
            />
            <Input
              disabled
              label="Campo deshabilitado"
              onValueChange={() => undefined}
              value="Sin edición"
            />
          </DemoSection>

          <DemoSection
            description="Selección simple con opciones de ejemplo."
            id="select"
            title="Select"
          >
            <Select
              disabled
              label="Estado"
              onValueChange={() => undefined}
              options={[
                { value: "available", label: "Disponible" },
                { value: "review", label: "Por revisar" },
              ]}
              value="available"
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
            description="Campo multilínea con contenido de ejemplo."
            id="textarea"
            title="Textarea"
          >
            <Textarea
              label="Descripción"
              onValueChange={() => undefined}
              readOnly
              rows={3}
              value="Contenido ficticio para revisar texto multilínea."
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
