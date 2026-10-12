# T39 — Revisión manual de accesibilidad

**Fecha:** 2026-10-12  
**Superficie:** `/__design-system`  
**Estado:** completada con Windows Narrator y Chromium.

## Método

- Windows Narrator se mantuvo activo durante las interacciones de revisión; se
  confirmó el proceso `Narrator` durante los recorridos.
- Se usaron teclado y navegador Chromium, junto con el árbol de accesibilidad y
  los atributos DOM observables.
- El usuario confirmó auditivamente que Narrator anunció los estados de Toast y
  Skeleton, el título/foco de Dialog y la descripción de Tooltip como se esperaba,
  sin duplicados ni pérdida de foco.
- No se conserva una grabación de audio; la confirmación auditiva fue proporcionada
  por el usuario durante la revisión interactiva.

## Resultados

| Primitiva | Resultado observado |
| --- | --- |
| Dialog | Se expone como diálogo modal con nombre «Diálogo de ejemplo». El foco inicial queda dentro; Tab y Mayús+Tab recorren el ciclo sin salir. Escape cierra y devuelve el foco a «Abrir diálogo». Mientras está abierto, la raíz exterior queda `inert` y `aria-hidden="true"`; ambos atributos se restauran al cerrar. |
| Toast | Al mostrar información, Chromium expone una sola región `status`, `aria-live="polite"` y `aria-atomic="true"`; el foco permanece en el activador. Al mostrar error, expone una región `alert` asertiva y atómica, también sin mover el foco. El botón de cierre se anuncia como «Cerrar notificación». |
| Tooltip | Al enfocar «Control con ayuda», el control recibe la descripción «Descripción breve del control» y el contenido visible tiene `role="tooltip"`. Escape oculta el contenido y retira únicamente esa descripción; el foco permanece en el control. |
| Skeleton | Al alternar la carga se expone un solo `status` con «Cargando resumen de ejemplo». Las tres formas decorativas tienen `aria-hidden="true"` y ninguna es enfocable ni aparece como contenido individual en el árbol accesible. |

## Hallazgo resuelto

Éxito e información se exponían como `alert` con `aria-live="assertive"`, igual
que los avisos urgentes. Ahora esos tipos usan `role="status"` y
`aria-live="polite"`; advertencia y error conservan `role="alert"` y
`aria-live="assertive"`. El cambio mantiene el anuncio atómico y no desplaza el
foco.

## Verificación automatizada

- `pnpm exec vitest run tests/ui/toast.test.tsx`: **17 pruebas pasan**.
- `pnpm test:e2e --project=design-system`: **7 pruebas pasan**, incluidos
  Dialog, Toast, Tooltip y Skeleton.
- `pnpm test:run`: **235 pruebas pasan**.
- `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build`: pasan.
- Impeccable detector para `src/shared/ui/toast/toast.tsx`: sin hallazgos.
