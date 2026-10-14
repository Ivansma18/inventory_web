# Evidencia T40 — Navegación por teclado y destinos del foco

**Estado:** revisión automatizada y pasada auditiva humana aprobadas.  
**Navegador automatizado:** Playwright Chromium 153.0.8010.12, headless.  
**Lector de pantalla:** Windows Narrator + Chromium; el usuario confirmó la pasada auditiva.

## Resultados verificables en el navegador

- **Nombres y estados:** los locators por rol de Playwright resolvieron el enlace «Saltar al contenido», el destino «Inicio», el botón «Expandir navegación» / «Contraer navegación» y el diálogo «Navegación principal». Se comprobó `aria-current="page"` en Inicio, ausencia de destino activo en 404 y `aria-expanded` false/true al alternar la navegación con Enter.
- **Foco visible:** el foco de teclado en los controles comprobados presenta outline sólido de 2 px, color `rgb(39, 103, 109)`.
- **Salto y modo compacto:** la navegación por Tab llega al activador; abrir el panel coloca el foco en «Cerrar panel». Tab y Mayús+Tab permanecen dentro; Escape cierra el panel, quita el bloqueo exterior y devuelve foco al activador.
- **Destino nuevo y destino activo:** desde 404, elegir Inicio cierra el panel y lleva el foco al encabezado de Inicio. Elegir Inicio estando ya allí cierra el panel y restaura el foco al activador sin recargar el documento.
- **Sidebar persistente contraída:** Tab recorre salto, control de expansión y enlace Inicio. El enlace conserva el nombre y el Tooltip aparece con el foco. Enter alterna el control entre expandir y contraer; `aria-expanded` refleja true/false.
- **Cambio responsive:** al cerrar el panel pasando a sidebar persistente, el foco termina en el enlace activo o en el encabezado de 404 cuando no existe destino activo.

## Pruebas y comandos

- `pnpm test:e2e --project=bootstrap-smoke --grep "operates compact navigation by keyboard|tabs through collapsed persistent navigation|composes App Shell regions|selecting Inicio from Not Found|selecting active Inicio|closes compact navigation|moves focus into Drawer|closes by button|resolves focus to a destination" --workers=1`: **13/13**.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- Prettier focalizado en `tests/browser/navigation-keyboard.bootstrap-smoke.spec.ts`: aprobado.

## Confirmación auditiva humana

El usuario confirmó que con Narrator + Chromium se anunciaron correctamente los nombres, el estado activo/expandido, el enlace de salto y el diálogo, y que la navegación por teclado mantuvo los destinos de foco verificados arriba.
