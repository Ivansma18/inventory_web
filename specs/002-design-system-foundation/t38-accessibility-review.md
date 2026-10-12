# T38 — Revisión manual de accesibilidad

**Fecha:** 2026-10-12  
**Superficie:** `/__design-system`  
**Estado:** completada con Windows Narrator y Chromium.

## Método y evidencia

- Recorrido con teclado en Chromium: foco de Input y Select, selección de una opción
  mediante flechas/Enter, ordenación de DataTable desde un encabezado con Enter y
  paginación con Enter.
- Inspección del árbol de accesibilidad de Chromium para nombres, descripciones,
  opciones, celdas y estados.
- Lighthouse Accessibility (snapshot, escritorio): **100** tras las correcciones.
- Suite unitaria completa: **235 pruebas** pasan, incluidas las asociaciones de
  Input/Textarea, contratos de Icon/Badge/Select y estados de DataTable.
- Playwright: pasan las **7 pruebas** de `design-system` y la prueba Chromium de
  teclado/paginación de DataTable.
- Windows Narrator se mantuvo activo durante la revisión manual de los controles.

## Comprobaciones

| Primitiva | Resultado observado |
| --- | --- |
| Input | El árbol expone el nombre «Código de artículo». La ayuda y, al vaciar el campo, el error están en la descripción accesible; el campo figura como inválido. |
| Textarea | Se expone como cuadro multilínea con nombre «Descripción» y su ayuda como descripción. Las pruebas del wrapper también verifican ayuda y error asociados a la vez. |
| Icon | Los iconos decorativos no aparecen como imágenes en el árbol. El informativo aparece como imagen «Información». El botón icon-only conserva el nombre «Activar acción con icono». |
| Select | El control visible tiene nombre «Estado» y popup de lista. La selección por flechas/Enter funciona y el error de limpieza se expone como descripción. El helper nativo tiene ID y `aria-hidden`; «Archivado» expone estado disabled a tecnologías de asistencia y se omite durante el recorrido de teclado. |
| Badge | Los tonos mantienen una etiqueta textual: «Disponible», «Por revisar», «Neutral» y el estado actualizado; el significado no depende solo del color. |
| DataTable | Chromium expone tabla, encabezados, filas y celdas. Los encabezados ordenables tienen `tabindex="0"`; Enter aplica orden y expone `aria-sort`. Enter en «Página siguiente» avanza la página; se actualizan `aria-current` y el informe «Página 2 de 3». |

## Hallazgos T38 y resolución

1. **Resuelto — Select auxiliar sin nombre accesible.** El helper nativo recibe un
   ID estable y `aria-hidden="true"`; el único control expuesto en el árbol es el
   Select visible, con nombre «Estado» y su popup. Lighthouse deja de reportar
   `select-name`.
2. **Resuelto — Estado disabled de una opción de Select.** El wrapper añade
   `aria-disabled="true"` a las opciones deshabilitadas mediante el contexto
   público de Pass Through. El árbol muestra «Archivado» como deshabilitado y el
   teclado continúa omitiéndola.
3. **Resuelto — Nombres del paginador en inglés.** PrimeReact usa locale `es` con
   «Página anterior», «Página siguiente» y «Página {page}».

## Verificación con tecnología de asistencia

Durante esta sesión el usuario confirmó haber oído con Narrator los nombres y
descripciones de Input y Textarea, el nombre y las opciones de Select, los
encabezados/estados de DataTable, la alternativa de Icon informativo, las
etiquetas textuales de Badge y la ausencia de anuncio del Icon decorativo.
También confirmó que la revisión de teclado/foco y los estados observados en
Chromium coincidían con la salida de Narrator.

No se conserva una grabación de audio; la confirmación auditiva fue proporcionada
por el usuario durante la revisión interactiva.
