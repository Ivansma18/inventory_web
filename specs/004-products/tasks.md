# Tareas - Spec 004 Productos

- [x] T1. Añadir Productos a la navegación autenticada y conectar la ruta del listado con el App Shell existente. (RF-1–RF-2)
  Hecho cuando: con una sesión confirmada, Productos aparece en la navegación y `/products` muestra el listado dentro del layout existente; una prueba de router verifica ambas cosas.
- [x] T2. Registrar las rutas de creación y edición por identificador público y soportar acceso directo. (RF-3–RF-5)
  Hecho cuando: `/products/new` y `/products/:uuid/edit` abren la pantalla solicitada tras la confirmación de sesión, también al cargar la URL directamente; las pruebas de router cubren ambas rutas.
- [x] T3. Conservar los estados de acceso existentes y aislar los resultados ante cambios de sesión. (RF-6; NFR-10)
  Hecho cuando: pruebas de integración sobre rutas de Productos verifican los estados pending/error/unauthenticated de Auth y que, al cambiar o perderse la sesión, no se presenta como vigente contenido de la sesión anterior. La visibilidad por rol de cada acción se verifica al implementarla en T13, T20 y T22 (RF-7).
- [x] T4. Integrar contratos OpenAPI de Productos y construir consulta remota y filas del listado. (RF-8–RF-12)
  Hecho cuando: los tipos generados proceden de una fuente OpenAPI reproducible; una prueba MSW valida columnas, defaults (activos, nombre ascendente, 15 por página), total y cambio de página usando respuestas remotas.
- [x] T5. Implementar estados de consulta, limpieza de búsqueda sin resultados y corrección de páginas fuera de rango. (RF-13–RF-18)
  Hecho cuando: pruebas de UI cubren carga, error con retry, vacío, acción de limpiar búsqueda, última página válida y página 1 sin resultados.
- [x] T6. Añadir búsqueda, filtro de estado, ordenación y reinicio de página al cambiar criterios. (RF-19–RF-26)
  Hecho cuando: pruebas unitarias e integración verifican búsqueda parcial insensible a mayúsculas, trim, ausencia de búsqueda vacía, combinación de filtro y búsqueda, los seis campos de orden, ambas direcciones y retorno a página 1.
- [x] T7. Serializar y restaurar criterios del listado desde URL e historial. (RF-27–RF-30)
  Hecho cuando: pruebas verifican recarga, URL compartida, Atrás/Adelante y normalización por reemplazo de parámetros inválidos sin introducir una entrada adicional de historial.
- [x] T8. Evitar que una consulta obsoleta reemplace los resultados de criterios más recientes. (RF-31)
  Hecho cuando: una prueba con dos respuestas MSW diferidas y fuera de orden deja visibles únicamente las filas de la consulta vigente.
- [x] T9. Integrar el contrato OpenAPI y la consulta pública de categorías activas con búsqueda, paginación y estados de carga/error. (RF-46–RF-49)
  Hecho cuando: las pruebas MSW verifican categorías de páginas posteriores, búsqueda, carga, error y retry mediante la API pública de Categories, sin importar sus internos desde Products.
- [x] T10. Crear los campos y la validación básica del formulario de producto. (RF-32–RF-35)
  Hecho cuando: pruebas de UI verifican SKU, nombre, descripción, precios y categoría; campos requeridos, descripción opcional y errores accesibles para SKU/nombre vacíos tras trim.
- [x] T11. Implementar parseo, validación y presentación íntegra de precios decimales. (RF-36–RF-39, RF-125–RF-126; NFR-7)
  Hecho cuando: pruebas unitarias cubren vacío, no numérico, negativo, cero, coma/punto, dos y tres decimales, separadores de miles y mezcla de separadores; el valor no se redondea, se presenta con dos decimales y sin moneda, y se acepta venta menor que compra.
- [x] T12. Completar los estados de categoría requeridos para creación sin incluir gestión de categorías. (RF-50–RF-52)
  Hecho cuando: pruebas verifican el aviso de que hace falta una categoría activa, bloqueo de creación sin selección válida y ausencia de acciones de crear/editar/activar/desactivar categorías.
- [x] T13. Implementar el envío de creación, sus estados y el destino posterior al éxito. (RF-7, RF-40–RF-45)
  Hecho cuando: pruebas de operación diferida verifican una sola solicitud, indicador pendiente, confirmación solo tras respuesta válida, conservación de valores ante error y retorno a activos/página 1/sin búsqueda/nombre ascendente tras éxito; la acción de creación permanece visible para distintos roles presentados por el frontend.
- [x] T14. Mostrar y recuperar errores de categoría durante creación sin perder los demás valores. (RF-53–RF-54)
  Hecho cuando: pruebas de conflicto 404/409 identifican el campo categoría y permiten refrescar opciones manteniendo intactos los otros campos del formulario.
- [x] T15. Consultar y presentar los datos iniciales de edición para productos activos e inactivos. (RF-55–RF-58)
  Hecho cuando: pruebas verifican consulta por UUID, formulario no editable antes de la carga, inicialización con los datos recibidos y edición posible en ambos estados.
- [x] T16. Aplicar validaciones de creación en edición y permitir retirar una descripción existente. (RF-59–RF-60)
  Hecho cuando: pruebas verifican las reglas de SKU/nombre/precios en edición y que borrar la descripción envía `description: null` según el contrato PATCH.
- [x] T17. Implementar la selección de categoría en edición, incluida la categoría original ausente. (RF-61–RF-65)
  Hecho cuando: pruebas verifican conservación sin reasignación, sustitución por categoría activa, etiqueta «Sin categoría», guardado de otros campos sin exigir categoría para productos heredados sin ella y que una selección vacía no retire una asociación existente.
- [x] T18. Construir PATCH parcial y evitar actualizaciones sin cambios o cambios de estado accidentales. (RF-66–RF-67)
  Hecho cuando: pruebas comparan el payload con el snapshot original; campos no modificados y `isActive` no se envían, y un formulario limpio no dispara PATCH.
- [x] T19. Implementar los estados pendiente y confirmado de la actualización de producto. (RF-68–RF-70)
  Hecho cuando: pruebas con respuesta diferida verifican indicador de operación, bloqueo de envíos duplicados y confirmación de éxito únicamente tras respuesta válida.
- [x] T20. Completar retorno al origen y conservación de cambios ante fallos de edición. (RF-7, RF-71–RF-73)
  Hecho cuando: pruebas verifican retorno a los criterios de origen después del éxito, uso de criterios predeterminados cuando edición se abrió directamente sin origen y conservación editable de los valores locales después de un error ordinario; la acción de edición permanece visible para distintos roles presentados por el frontend.
- [x] T21. Implementar estados de UUID inválido, producto inexistente y error recuperable al cargar edición. (RF-74–RF-76)
  Hecho cuando: pruebas verifican estados distintos para dirección inválida y producto 404, que un UUID inválido no genera petición, retorno al listado y retry de un error de red/servidor.
- [x] T22. Añadir acciones de activación/desactivación y su confirmación accesible. (RF-7, RF-77–RF-81)
  Hecho cuando: pruebas verifican acciones según estado, confirmación con identidad del producto, explicación de desactivación lógica y que cancelar no modifica ni envía una operación; las acciones de estado permanecen visibles para distintos roles presentados por el frontend.
- [ ] T23. Implementar mutaciones de estado con confirmación remota y actualización de la consulta vigente. (RF-82–RF-86, RF-89)
  Hecho cuando: pruebas diferidas verifican indicador y protección contra duplicados por producto, ausencia de optimistic update, uso de PATCH para activar y DELETE lógico para desactivar, confirmación y refresco con los criterios aplicados.
- [ ] T24. Manejar páginas fuera de rango y errores recuperables del cambio de estado. (RF-87–RF-88)
  Hecho cuando: pruebas verifican última página disponible después de retirar resultados y error con retry manual solo mientras el producto siga disponible.
- [ ] T25. Presentar conflictos de SKU y rechazos de autorización del backend. (RF-90–RF-93; NFR-8)
  Hecho cuando: pruebas de SKU duplicado activo/inactivo sitúan el error junto al campo, explican que desactivar un producto no libera su SKU sin afirmar qué producto lo ocupa, y respuestas 403 en creación/edición/cambio de estado se muestran como no permitidas, nunca como éxito.
- [ ] T26. Manejar sesión expirada, resultado incierto, respuestas inválidas y reintentos de escritura. (RF-94–RF-98; NFR-9)
  Hecho cuando: pruebas verifican reconsulta de sesión tras 401, prioridad del SessionBoundary, error de red/servidor sin afirmar el resultado, ausencia de reenvío automático y error distinguible para respuesta inválida; mensajes no exponen texto interno ni datos sensibles.
- [ ] T27. Separar éxito de escritura de error al refrescar el listado. (RF-99–RF-100)
  Hecho cuando: una prueba confirma la escritura, fuerza fallo de la consulta posterior y verifica que se conserva el éxito y que retry repite solo la lectura.
- [ ] T28. Proteger formularios sucios ante navegación interna y salida del navegador. (RF-101–RF-105)
  Hecho cuando: pruebas verifican continuar editando, descartar hacia el destino solicitado, aviso nativo al recargar/cerrar y eliminación del aviso tras guardar o descartar.
- [ ] T29. Dar prioridad a los estados de sesión sobre el diálogo de cambios sin guardar. (RF-106)
  Hecho cuando: una prueba sustituye el formulario por un estado de sesión mientras está abierto el guard y confirma que no se interpone la confirmación de descarte.
- [ ] T30. Completar interacción por teclado, errores asociados, anuncios y gestión de foco. (RF-107–RF-112; NFR-2)
  Hecho cuando: pruebas de UI cubren teclado en filtros/tabla/formularios/confirmaciones, asociación y foco del primer error, anuncio no basado solo en color, foco al encabezado de la nueva página y retorno al control relacionado al cerrar un diálogo.
- [ ] T31. Bloquear edición y navegación interna durante guardados pendientes sin encolar salidas. (RF-113–RF-117)
  Hecho cuando: pruebas diferidas verifican campos bloqueados, aviso de espera para navegación interna y Atrás/Adelante, ausencia de descarte o navegación encolada, edición tras fallo y prioridad de sesión durante el guardado.
- [ ] T32. Permitir salir durante una mutación de estado y conservar página y foco al recibir la respuesta tardía. (RF-118–RF-120)
  Hecho cuando: una prueba navega fuera del listado mientras la mutación sigue pendiente y verifica que la respuesta no cambia la ruta ni mueve el foco.
- [ ] T33. Preservar la consulta de origen en Cancelar, retornos de error y recarga. (RF-121–RF-124)
  Hecho cuando: pruebas verifican Cancelar al listado de origen, retorno desde producto no encontrado/dirección inválida con criterios de origen, descarte a otro destino hacia ese destino, origen conservado al recargar y fallback predeterminado seguro si falta o es inválido.
- [ ] T34. Invalidar una categoría rechazada y permitir guardar sin reasignar la original si falla su consulta. (RF-127–RF-130)
  Hecho cuando: pruebas verifican que una nueva asignación rechazada no se reenvía hasta seleccionar una categoría activa nuevamente y que, ante fallo de opciones, otros cambios se guardan conservando la categoría original o la ausencia temporal de categoría.
- [ ] T35. Tratar producto desaparecido durante una modificación iniciada en la página actual. (RF-131–RF-134)
  Hecho cuando: pruebas 404 verifican estado de producto no encontrado al editar o cambiar estado, ausencia de retry de mutación, valores de edición visibles en solo lectura y refetch del listado al retornar.
- [ ] T36. Preservar datos locales y dirty state cuando se reconsulta el producto. (RF-135–RF-136)
  Hecho cuando: una prueba cambia campos, provoca una respuesta nueva del detalle y confirma que formulario y estado dirty no se reinicializan.
- [ ] T37. Comunicar un 404 tardío de cambio de estado solo en la sesión vigente y refrescar al volver. (RF-137–RF-138; NFR-10)
  Hecho cuando: pruebas diferidas verifican aviso accesible sin navegación ni robo de foco, descarte del resultado al cambiar sesión y refetch del listado al regresar en la sesión original.
- [ ] T38. Verificar y ajustar el uso responsive del listado y los formularios, incluido zoom nativo. (RF-8, RF-32, RF-55; NFR-1, NFR-3)
  Hecho cuando: Playwright y revisión manual a 360/768/1280 px no detectan overflow horizontal del documento, la tabla desplaza su propia región y las acciones siguen disponibles con zoom nativo al 200 %.
- [ ] T39. Revisar movimiento reducido, idioma y consistencia visual de Productos. (RF-13, RF-40, RF-50; NFR-4–NFR-6)
  Hecho cuando: la vista respeta `prefers-reduced-motion`, los mensajes de aplicación están en español, la advertencia nativa de salida conserva el idioma del navegador y la revisión Impeccable confirma tokens compartidos, estilos co-localizados y patrones del Design System; se registran hallazgos y correcciones.
- [ ] T40. Completar revisión manual de accesibilidad WCAG aplicable a las vistas de Productos. (RF-107–RF-112; NFR-2)
  Hecho cuando: queda evidencia de revisión con lector de pantalla y teclado, contraste contextual, foco y zoom; cualquier barrera detectada se corrige y se repite la comprobación.
- [ ] T41. Verificar los flujos E2E con APIs y Auth simulados, sin credenciales privadas. (RF-5, RF-40, RF-71, RF-85; NFR-11)
  Hecho cuando: la suite predeterminada cubre al menos listado, creación, retorno de edición y cambio de estado con MSW; preview-smoke no incluye harnesses/demo ni llama al backend de negocio real.
- [ ] T42. Verificar integridad de campos largos y precios sin truncamiento silencioso. (RF-32, RF-36; NFR-12)
  Hecho cuando: pruebas con SKU, nombres, descripciones y precios largos verifican valores introducidos y payload exacto sin recortes, redondeo ni transformación silenciosa.

## Orden y dependencias

| Tarea | Depende de | Motivo |
| --- | --- | --- |
| T1 | Ninguna | Establece el primer punto de entrada de Productos en el App Shell. |
| T2 | T1 | Añade rutas hermanas bajo el shell y la misma protección de navegación. |
| T3 | T1, T2 | Verifica estados de acceso en las rutas registradas; RF-7 se prueba al implementar cada acción en T13, T20 y T22. |
| T4 | T1, T3 | La consulta remota necesita la ruta protegida y los contratos de sesión existentes. |
| T5 | T4 | Los estados de consulta dependen de la respuesta y paginación remotas. |
| T6 | T4 | Los controles traducen sus criterios al contrato de listado. |
| T7 | T6 | El parser/serializador da persistencia e historial a criterios ya definidos. |
| T8 | T4, T6 | La protección contra respuestas obsoletas se verifica con consultas diferenciadas. |
| T9 | T4 | Reutiliza el cliente HTTP y el patrón de consulta; agrega contrato público de lectura de Categories. |
| T10 | T2, T9 | El formulario de creación requiere su ruta y selector de categoría. |
| T11 | T10 | El parseo monetario se integra con los campos del formulario. |
| T12 | T9, T10 | Los estados de categoría vacía y selección requerida usan el selector implementado. |
| T13 | T10, T11, T12 | El flujo de creación necesita formulario válido y categoría seleccionable. |
| T14 | T9, T13 | El rechazo y recuperación de categorías se comprueban en el formulario de creación. |
| T15 | T2, T4 | La edición necesita ruta por UUID y contratos/modelos del producto. |
| T16 | T11, T15 | Aplica reglas de formulario y parser de precios a los datos cargados. |
| T17 | T9, T15 | La categoría original y las nuevas opciones se coordinan en edición. |
| T18 | T15, T17 | El PATCH parcial requiere snapshot y semántica de categoría. |
| T19 | T18 | Implementa la operación de actualización sobre el payload parcial. |
| T20 | T7, T19 | El resultado de edición restaura los criterios de origen. |
| T21 | T15 | Los estados de error pertenecen a la consulta inicial del detalle. |
| T22 | T4 | Las acciones y confirmaciones se añaden a las filas del listado. |
| T23 | T22 | La mutación de estado parte de la acción confirmada. |
| T24 | T5, T23 | La corrección de página y retry responden al nuevo conjunto remoto. |
| T25 | T13, T19, T23 | Los errores de SKU y permisos afectan las tres clases de escritura. |
| T26 | T3, T13, T19, T23 | Los errores de sesión y transporte deben coordinarse con Auth y las mutaciones. |
| T27 | T4, T13, T19, T23 | Distingue la confirmación de escritura de la lectura posterior. |
| T28 | T15, T19 | El bloqueo de salida necesita el formulario editable y su estado dirty. |
| T29 | T3, T28 | Define prioridad de sesión sobre la protección ya implementada. |
| T30 | T4, T10, T15, T22, T28 | Revisa teclado y foco en tabla, formularios, confirmaciones y guard. |
| T31 | T19, T28, T29 | Endurece el guard existente específicamente durante escrituras pendientes. |
| T32 | T23, T30 | La respuesta tardía debe preservar navegación y foco actuales. |
| T33 | T7, T20, T21, T28 | El origen se restaura en retornos, errores, cancelación y recarga. |
| T34 | T14, T17 | La invalidación/revalidación se aplica a categorías en creación y edición. |
| T35 | T20, T21, T23, T33 | El 404 de modificación depende de errores, mutaciones y retorno al listado. |
| T36 | T15, T18 | La reconsulta debe respetar el snapshot y dirty state de edición. |
| T37 | T3, T23, T32, T35 | El 404 tardío depende de vigencia de sesión, operación y navegación. |
| T38 | T4, T10, T15 | Revisa las vistas de listado y formularios ya implementadas. |
| T39 | T4, T10, T15, T22 | La revisión visual transversal requiere las vistas y estados principales. |
| T40 | T30, T39 | La comprobación manual final sigue la implementación y revisión visual. |
| T41 | T13, T20, T23, T26, T33 | Los workflows E2E componen creación, edición, estado, sesión y retorno. |
| T42 | T10, T11, T15 | Los casos largos comprueban campos implementados en creación y edición. |

## Cobertura de requisitos

| RF | Tarea | Evidencia |
| --- | --- | --- |
| RF-1–RF-2 | T1 | Pruebas de navegación autenticada y render del listado dentro del App Shell. |
| RF-3–RF-5 | T2 | Pruebas de rutas de creación/edición y acceso directo tras confirmar sesión. |
| RF-6 | T3 | Pruebas de estados Auth en rutas de Productos y aislamiento de contenido al cambiar o perderse la sesión. |
| RF-7 | T13, T20, T22 | Pruebas de visibilidad de las acciones de creación, edición y estado para distintos roles presentados por el frontend. |
| RF-8–RF-12 | T4 | Pruebas MSW de columnas, defaults, total, límite y paginación remota. |
| RF-13–RF-18 | T5 | Pruebas de carga/error/vacío, limpiar búsqueda y rango de páginas. |
| RF-19–RF-26 | T6 | Pruebas de normalización, filtro conjunto, orden y reinicio de página. |
| RF-27–RF-30 | T7 | Pruebas de parser/URL, recarga, historial y reemplazo de parámetros inválidos. |
| RF-31 | T8 | Prueba de respuestas diferidas fuera de orden. |
| RF-32–RF-35 | T10 | Pruebas de campos, requeridos, descripción opcional y trim de SKU/nombre. |
| RF-36–RF-39 | T11 | Pruebas de validación y aceptación de precios. |
| RF-40–RF-45 | T13 | Pruebas diferidas de envío, duplicado, éxito, destino y conservación ante error. |
| RF-46–RF-49 | T9 | Pruebas de API/select remoto, paginación, búsqueda, carga y retry. |
| RF-50–RF-52 | T12 | Pruebas de ausencia/requisito de categoría y exclusión de CRUD de categorías. |
| RF-53–RF-54 | T14 | Pruebas de error en categoría y refresco sin pérdida de otros valores. |
| RF-55–RF-58 | T15 | Pruebas de consulta, bloqueo previo a carga e inicialización para ambos estados. |
| RF-59–RF-60 | T16 | Pruebas de reglas de edición y `description: null` contractual. |
| RF-61–RF-65 | T17 | Pruebas de conservar/sustituir categoría, guardar otros campos sin categoría y no retirarla con selección vacía. |
| RF-66–RF-67 | T18 | Pruebas del payload parcial y ausencia de PATCH vacío. |
| RF-68–RF-70 | T19 | Pruebas de pending, no duplicación y confirmación de actualización. |
| RF-71–RF-73 | T20 | Pruebas de retorno al origen o defaults en acceso directo y conservación editable ante fallo. |
| RF-74–RF-76 | T21 | Pruebas de dirección inválida distinta de 404 y retry de consulta recuperable. |
| RF-77–RF-81 | T22 | Pruebas de acción por estado, confirmación, texto lógico y cancelar. |
| RF-82–RF-86, RF-89 | T23 | Pruebas de mutación no optimista, endpoint, duplicados, éxito y refresco. |
| RF-87–RF-88 | T24 | Pruebas de página corregida y retry manual de fallo de estado. |
| RF-90–RF-93 | T25 | Pruebas del mensaje de SKU duplicado y de 403 en crear/editar/cambiar estado sin falso éxito. |
| RF-94–RF-98 | T26 | Pruebas de 401, sesión, resultado incierto, retries e invalidación de contrato. |
| RF-99–RF-100 | T27 | Prueba de escritura confirmada con lectura fallida y retry solo de lectura. |
| RF-101–RF-105 | T28 | Pruebas del guard dirty, continuar, descartar, salida del navegador y limpieza. |
| RF-106 | T29 | Prueba de prioridad del estado de sesión sobre el guard. |
| RF-107–RF-112 | T30, T40 | Pruebas de teclado/foco/anuncios y revisión manual accesible. |
| RF-113–RF-117 | T31 | Pruebas de bloqueo durante guardado, aviso, no encolado y recuperación. |
| RF-118–RF-120 | T32 | Prueba de navegación permitida durante pending y respuesta tardía sin cambio de página ni foco. |
| RF-121–RF-124 | T33 | Pruebas de origen en Cancelar, errores de producto/dirección, recarga y fallback. |
| RF-125–RF-126 | T11 | Pruebas de separadores de miles/mixtos y escala decimal. |
| RF-127–RF-130 | T34 | Pruebas de selección rechazada y conservación de categoría ante error de consulta. |
| RF-131–RF-134 | T35 | Pruebas de 404 al editar/cambiar estado, solo lectura, ausencia de retry y actualización al volver. |
| RF-135–RF-136 | T36 | Prueba de reconsulta con cambios locales y dirty state preservados. |
| RF-137–RF-138 | T37 | Prueba de aviso tardío, aislamiento de sesión y refetch al regresar. |

## Cobertura de requisitos no funcionales

| NFR | Tarea | Evidencia |
| --- | --- | --- |
| NFR-1 | T38 | Playwright a 360/768/1280 px, sin overflow del documento y con scroll local de tabla. |
| NFR-2 | T30, T40 | Pruebas de teclado/foco y revisión manual de lector de pantalla/contraste. |
| NFR-3 | T38 | Revisión de disponibilidad de acciones con zoom nativo al 200 %. |
| NFR-4 | T39 | Comprobación de `prefers-reduced-motion`. |
| NFR-5 | T39 | Revisión de textos de aplicación en español y advertencia nativa en idioma del navegador. |
| NFR-6 | T39 | Revisión Impeccable de tokens, patrones y estilos co-localizados. |
| NFR-7 | T11 | Pruebas de presentación con dos decimales, sin moneda ni redondeo. |
| NFR-8 | T25 | Rechazos del backend prevalecen sobre la validación visual y permisos. |
| NFR-9 | T26 | Fixtures centinela verifican que errores no expongan secretos ni detalles internos. |
| NFR-10 | T3, T37 | Cambio de sesión durante consulta/mutación no presenta resultados anteriores como vigentes. |
| NFR-11 | T41 | E2E predeterminado con Auth/MSW simulados y sin credenciales privadas/backend de negocio real. |
| NFR-12 | T42 | Pruebas de payload exacto para SKU, nombres, descripciones y precios largos. |
