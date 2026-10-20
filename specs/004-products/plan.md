# Plan 004 — Productos

## Contexto

Este plan desarrolla la Spec 004 aprobada y revisada: **138 requisitos funcionales y 12 requisitos no funcionales** para la Fase 3 de `docs/ruta.md`.

Incluye listado, búsqueda, filtros, ordenación y paginación; creación, edición y activación/desactivación; y selección de categorías existentes. No incorpora gestión de categorías, edición concurrente garantizada ni autorización visual por rol.

Referencias: `spec.md`, `docs/constitution.md`, `docs/estructura.md`, `docs/ruta.md`, `AGENTS.md` y los contratos actuales del backend Inventory.

### Base inspeccionada

- El router actual utiliza `createBrowserRouter`, AppLayout y SessionBoundary; Inicio es el único destino de trabajo implementado.
- Auth expone sesión confirmada, identificador público de sesión, estado reactivo de verificación y reconsulta mediante su API pública.
- El cliente HTTP centralizado utiliza credenciales, normaliza errores y admite `AbortSignal`.
- TanStack Query está configurado con reintentos automáticos deshabilitados para consultas y mutaciones.
- DataTable ofrece paginación y ordenación controladas, pero la UI de Productos deberá traducir sus eventos al estado navegable y al contrato remoto.
- Select expone una API propia, pero sus opciones son locales y la selección se invalida cuando desaparece del conjunto entregado. El selector de categorías debe evitar perder una selección válida al cambiar de página de resultados.
- Input y Textarea usan contratos propios; el contrato actual de Input no expone todas las propiedades de foco necesarias para coordinar errores de formulario.
- Dialog dispone de cierre controlado, bloqueo de interacción exterior y recuperación de foco.
- El frontend ya genera contratos OpenAPI de Auth; Productos y Categorías tienen contratos publicados por el backend, pero todavía no integrados en los contratos generados del frontend.
- El backend ofrece `GET /products`, `GET /products/:uuid`, `POST /products`, `PATCH /products/:uuid` y `DELETE /products/:uuid`; `DELETE` desactiva, no elimina físicamente.
- El backend ofrece listado y consulta individual de Categorías. La creación de productos y la nueva asignación de categoría exigen una categoría activa existente; se permiten productos heredados sin categoría durante la clasificación temporal.
- Las escrituras están sujetas a permisos del backend. La UI no inferirá permisos a partir del rol ni ocultará las acciones definidas en la spec.
- Vitest, Testing Library, MSW y Playwright están configurados. Las suites E2E predeterminadas usan backend y Auth simulados; `preview-smoke`, `design-system` y `auth-harness` se seleccionan como proyectos separados.

### Flujo de experiencia

Modo de interfaz: **Operate**. El usuario consulta el catálogo, localiza productos mediante criterios navegables, mantiene un producto o cambia su estado con confirmación explícita.

Flujos principales:

1. Listado predeterminado → búsqueda/filtro/orden/paginación → edición → retorno al listado de origen.
2. Listado → creación con categoría activa → confirmación del backend → primera página de activos, sin búsqueda y ordenada por nombre ascendente.
3. Listado → confirmación de activación/desactivación → respuesta del backend → actualización de la consulta actual.

Los formularios no pierden datos en errores ordinarios. Una operación no se muestra como exitosa antes de confirmación del backend. Los estados de sesión prevalecen sobre la protección de navegación.

## Módulos y responsabilidades

Los módulos de la tabla son límites de responsabilidad previstos; no implican crear cada carpeta desde el inicio.

| Módulo | Responsabilidad | RF cubiertos |
| --- | --- | --- |
| Router de app y catálogo de navegación | Incorporar Productos y sus páginas bajo SessionBoundary; coordinar el foco al cambiar de página. | RF-1–RF-7, RF-111 |
| API pública de `features/products` | Tipos de entrada/salida, consultas HTTP, mutaciones, normalización de errores y exportaciones públicas. | RF-19, RF-31–RF-100, RF-118–RF-120, RF-131–RF-138 |
| Consultas y estado de servidor de Productos | Query keys, lista/detalle, cancelación, invalidación y resultados remotos. | RF-8–RF-18, RF-27–RF-31, RF-55–RF-57, RF-74–RF-76, RF-86–RF-88, RF-99–RF-100, RF-118–RF-120, RF-134, RF-138 |
| Página y componentes de listado | Tabla, total, estado activo, controles de criterios, estados de carga/error/vacío y acciones por fila. | RF-2, RF-8–RF-30, RF-77–RF-89, RF-107, RF-110–RF-112 |
| Formularios de Productos | Crear/editar, valores locales, validación, envío parcial, confirmación y conservación de errores. | RF-3–RF-5, RF-32–RF-45, RF-55–RF-73, RF-90–RF-98, RF-101–RF-110, RF-113–RF-117, RF-121–RF-126, RF-131–RF-133, RF-135–RF-136 |
| API pública de lectura de Categorías | Consultar opciones activas, búsqueda/paginación y categoría seleccionada sin exponer internos de Categories. | RF-46–RF-54, RF-61–RF-65, RF-127–RF-130 |
| Selector de categoría de Productos | Buscar y recorrer categorías activas; conservar selección y valores del producto en errores. | RF-46–RF-54, RF-61–RF-65, RF-127–RF-130 |
| Coordinación de sesión/operaciones del App Shell | Invalidar resultados de sesión anterior y mantener feedback de mutación después del desmontaje de una página. | RF-6, RF-94–RF-95, RF-106, RF-117–RF-120, RF-137–RF-138; NFR-10 |
| Design System | Ajustar contratos propios de Input/controles solo si hacen falta para foco, lectura o bloqueo accesible. | RF-107–RF-112, RF-113, RF-133 |
| Contratos generados | Mantener tipos derivados de OpenAPI de Products y Categories. | RF-8, RF-32–RF-100; NFR-8, NFR-12 |

Los consumidores acceden a Categories únicamente mediante su API pública. La lógica y presentación de productos permanece dentro de Products. Los componentes no acceden directamente a Axios ni a detalles de PrimeReact.

## Modelo de datos y contratos

### Contratos HTTP

Se utilizará el OpenAPI publicado por el backend como fuente de los contratos TypeScript generados. Las solicitudes y respuestas se mantendrán separadas de los valores de formulario y modelos de presentación. La forma recibida se validará antes de presentarla como resultado confirmado.

| Operación | Contrato | Resultado relevante |
| --- | --- | --- |
| Listar productos | `GET /products` | `{ data, pagination: { total, page, limit } }` |
| Consultar producto | `GET /products/:uuid` | `{ data: Product }`, incluyendo `categoryUuid` nullable e `isActive` |
| Crear producto | `POST /products` | `201 { data: Product }`; requiere `categoryUuid` activa |
| Actualizar producto | `PATCH /products/:uuid` | `200 { data: Product }`; actualización parcial |
| Desactivar producto | `DELETE /products/:uuid` | `200 { data: { uuid, isActive: false } }`; no elimina físicamente |
| Activar producto | `PATCH /products/:uuid` con `isActive: true` | `200 { data: Product }` |
| Listar categorías | `GET /categories` | `{ data, pagination }`; permite `search`, `isActive`, `page`, `limit`, `sort`, `order` |
| Consultar categoría | `GET /categories/:uuid` | `{ data: Category }`; útil para identificar la categoría asociada que no esté en la página de opciones actual |

La lista de productos utiliza `page`, `limit`, `search`, `isActive`, `sort` y `order`. Valores omitidos del contrato: `page=1`, `limit=15`, `isActive=true`, `sort=name`, `order=asc`. Los campos de orden admitidos son `name`, `sku`, `purchasePrice`, `salePrice`, `createdAt` y `updatedAt`; el backend añade desempates estables.

El contrato de error de negocio usa `{ error: { code, message } }`. Códigos observados relevantes:

| Situación | Código / status esperado |
| --- | --- |
| SKU duplicado, incluso inactivo | `PRODUCT_SKU_ALREADY_EXISTS` / 409 |
| Producto no encontrado | `PRODUCT_NOT_FOUND` / 404 |
| Categoría no encontrada | `PRODUCT_CATEGORY_NOT_FOUND` / 404 |
| Categoría inactiva | `PRODUCT_CATEGORY_INACTIVE` / 409 |
| Conflicto al asociar categoría | `PRODUCT_CATEGORY_ASSIGNMENT_CONFLICT` / 409 |
| Datos de producto inválidos | `INVALID_PRODUCT_DATA` / 400 |
| Sesión ausente | `401` |
| Permiso insuficiente | `403` |

Mensajes internos del backend no se presentarán directamente. La UI resolverá los textos mediante código/status normalizados. Respuestas no válidas se tratarán como error de contrato, nunca como éxito.

### Modelo de consulta

La URL será la fuente del estado navegable. La representación acordada de la spec usa:

```text
/products?page=2&search=keyboard&status=active&sort=name&order=asc
```

La feature normalizará los parámetros y los mapeará al contrato HTTP: `status=active` → `isActive=true`; `status=inactive` → `isActive=false`. Un estado inválido se normaliza al valor predeterminado. Se omitirá `search` cuando quede vacío tras recortar espacios.

Cambios intencionales de criterios y navegación por páginas/orden crearán historial para que Atrás/Adelante restaure consultas anteriores. Correcciones de parámetros y de página por resultados fuera de rango reemplazarán la entrada actual para evitar un ciclo de historial. Búsqueda y estado aplicados en conjunto viajarán en la misma URL/query key.

El estado de consulta no se duplicará en Zustand ni en estado paralelo de página. Las claves de TanStack Query incluirán criterios normalizados y el identificador público de la sesión confirmada; no persistirán en almacenamiento local. Al cambiar o perder sesión se cancelarán y retirarán resultados y mutaciones de la sesión previa.

### Modelo de formulario y dinero

Los valores de formulario serán distintos del DTO:

- SKU/nombre/description: strings controlados; `description` puede quedar vacía para crear sin descripción o eliminar la descripción en actualización.
- Precios: strings durante la edición para conservar exactamente lo introducido; se convierten a número solo tras validar sintaxis y escala.
- Categoría: identificador seleccionado separado de la etiqueta visible.
- Producto cargado: snapshot de referencia inmutable para determinar dirty state y construir un `PATCH` solo con valores modificados.

Los importes aceptarán coma o punto como único separador decimal, no separadores de miles ni mezclas, hasta dos decimales, sin redondeo ni truncamiento. Se aceptan cero y precios de venta inferiores a compra. Se muestran dos decimales y sin símbolo de moneda.

En edición no se enviará `isActive` al guardar información. Si la categoría no cambió, no se incluirá una nueva asignación en el payload. Si el usuario elimina una descripción existente, se enviará `description: null`, que el contrato de actualización acepta para retirar la descripción. En creación, una descripción vacía podrá omitirse o representarse como `null`.

### Categorías y selección

La selección se realizará sobre categorías activas. La búsqueda y paginación remotas permiten encontrar resultados fuera de la página inicial. La selección actual no dependerá de que su opción esté en la página visible: una consulta de opciones nueva no puede limpiarla por sí sola.

En edición se mantienen separados:

1. Categoría original del producto.
2. Opción visible/consultada.
3. Nueva asignación pendiente del usuario.

Si el producto original no tiene categoría, se muestra «Sin categoría». El fallo de consulta de opciones no bloquea cambios de otros campos si se conserva la categoría original, incluido el estado sin categoría admitido temporalmente. Una categoría seleccionada y rechazada por el backend se invalida; para reintentar se exige seleccionar una opción activa obtenida de nuevo.

### Estados de operación

Las escrituras no usan optimistic updates. Cada creación, actualización o cambio de estado sigue estados explícitos: listo, pendiente, confirmado, rechazado/error. Las acciones por producto se bloquean durante el cambio de estado pendiente; no se reenvían automáticamente.

- Creación/edición: campos bloqueados durante petición y navegación interna bloqueada. El bloqueo de navegación no guarda una salida para ejecutarla posteriormente. Ante fallo ordinario, el formulario vuelve a ser editable y conserva sus valores. Ante producto no encontrado al actualizar, conserva los valores visibles en solo lectura y excluye el reintento.
- Cambio de estado: el estado visible no cambia hasta confirmación. Se permite salir del listado. Una respuesta tardía no navega ni mueve foco; se comunica con feedback accesible y se invalida la consulta del catálogo al volver.
- Sesión: Auth conserva autoridad. Si la sesión pasa a pending/error/unauthenticated, su presentación prevalece sobre guardados o confirmaciones de abandono. Resultados de la sesión anterior no se publican como vigentes.
- Refresco: una escritura confirmada seguida de un fallo de lectura mantiene el feedback de éxito y ofrece reintentar únicamente la consulta.

## Decisiones técnicas

### 1. Rutas, ownership y límites de feature

- **Elegida:** añadir Productos como rutas bajo el App Shell y SessionBoundary existentes. URL para búsqueda/filtros/página/orden; TanStack Query para servidor; React Hook Form para formularios; Auth para sesión.
- **Descartada:** copiar datos del servidor a Zustand o crear un modelo de sesión de Products; duplicaría fuentes de verdad y complicaría NFR-10.
- **RF cubiertos:** RF-1–RF-7, RF-27–RF-31, RF-55–RF-57, RF-71–RF-76, RF-94–RF-95; NFR-8, NFR-10.

### 2. Listado controlado por backend

- **Elegida:** consultas remotas para filtro, paginación y orden; DataTable como presentación controlada, con componentes de Productos para criterios, acciones y feedback de retry.
- **Descartada:** descargar el catálogo completo y aplicar filtros/orden localmente; contradice la paginación y puede dar totales/páginas falsos.
- **RF cubiertos:** RF-8–RF-31, RF-86–RF-87, RF-99–RF-100.

Las query keys usarán criterios normalizados. Las respuestas se asocian a sus claves; consultas reemplazadas se cancelan cuando sea posible. DataTable nunca recibe filas de una query diferente a los criterios visibles. Si el total deja la página fuera de rango, se corrige a la última página con resultados o a página 1 si el total es cero; la corrección no crea una entrada de historial adicional.

### 3. Estado navegable y consultas compartibles

- **Elegida:** la URL constituye la fuente de verdad; un parser/serializador único traduce `status` al `isActive` del backend y aplica defaults de la spec.
- **Descartada:** estado interno duplicado o filtros solo en memoria; se perderían en recarga, enlaces compartidos e historial.
- **RF cubiertos:** RF-9–RF-12, RF-19–RF-30, RF-71–RF-72, RF-121–RF-124.

Las interacciones deliberadas usan navegación histórica; normalización de parámetros inválidos y correcciones de página reemplazan URL. Tras crear se aplica el caso explícito de RF-44 (activos, primera página, búsqueda limpia, nombre ascendente). Cancelar y retorno desde edición restauran el origen validado, incluso tras recargar el formulario. El origen se limita a una ruta interna `/products` con parámetros permitidos; nunca se aceptan destinos externos.

### 4. Selector de categorías de lectura

- **Elegida:** selector propio de Productos con búsqueda/paginación remotas y API pública de lectura de Categories; conservar selección independientemente de la página actual.
- **Descartada:** desplegable que solo filtra opciones locales, cargar todas las categorías de una vez o adelantar la gestión de categorías.
- **RF cubiertos:** RF-46–RF-54, RF-61–RF-65, RF-127–RF-130.

El diseño concreto se confirma con Impeccable. Debe cubrir búsqueda, exploración de resultados y selección sin convertir el selector en administración de categorías. Se consultará el detalle de la categoría asociada si no está entre las opciones actuales.

### 5. Formulario compartido, parseo decimal y payload parcial

- **Elegida:** composición común para crear/editar con modos explícitos; mantener texto en precios hasta validación; validar con Zod y convertir sin redondeo; construir payload parcial comparando con el snapshot original.
- **Descartada:** conversión por cada pulsación a `number`, regex tolerante a formatos ambiguos o enviar el objeto entero con campos sin cambios; puede alterar importes, seleccionar miles incorrectamente o mutar estado.
- **RF cubiertos:** RF-32–RF-45, RF-55–RF-73, RF-90–RF-91, RF-108–RF-109, RF-125–RF-126, RF-135–RF-136; NFR-7, NFR-12.

Antes de fijar el formato de descripción vacía en `PATCH`, se comprobará el mapeo del backend para enviar el `null` esperado por RF-20 de su contrato. No se cambia el backend. Los errores de validación señalan el campo y enfocan el primero inválido; los wrappers propios se amplían solo si hace falta para exponer referencias/foco.

### 6. Protección de navegación y cambios sin guardar

- **Elegida:** usar el mecanismo de bloqueo de navegación SPA del router para formularios sucios, con confirmación accesible; durante el guardado se bloquea sin ofrecer descarte. Para recarga/cierre se usa el aviso nativo del navegador.
- **Descartada:** interceptar links individualmente o manipular historial, porque deja rutas de salida sin proteger y compite con Atrás/Adelante.
- **RF cubiertos:** RF-101–RF-106, RF-113–RF-117, RF-121–RF-124.

Prioridad: estado de sesión → escritura pendiente/aviso de espera → confirmación de descarte → navegación. Un intento bloqueado durante una escritura no se ejecuta al resolverla; éxito sigue el retorno definido y un fallo requiere una nueva acción. Si se confirma descarte al navegar a otro destino, se continúa a ese destino. La acción explícita Cancelar vuelve al listado de origen. En modo de producto no encontrado tras `PATCH`, los datos quedan de solo lectura y el retorno conserva la protección de descarte requerida por RF-101–RF-103.

### 7. Activación/desactivación y ausencia de optimistic update

- **Elegida:** PATCH con `isActive: true` para activar y DELETE lógico para desactivar; esperar respuesta antes de cambiar estado y actualizar consulta después de confirmar.
- **Descartada:** ocultar fila o cambiar badge antes de la respuesta, DELETE físico o PATCH de estado false si el contrato vigente ofrece DELETE lógico.
- **RF cubiertos:** RF-77–RF-89, RF-118–RF-120, RF-131–RF-132, RF-137–RF-138.

Se bloquean activaciones duplicadas del mismo producto, no la navegación. Si llega respuesta después de salir, no se cambia página/foco; un error 404 se anuncia sin reemplazar la página. El listado se invalida cuando el usuario vuelve. Si el usuario permanece en el listado, el estado de producto no encontrado se presenta en contexto del listado, sin ofrecer reintento de la mutación.

### 8. Aislamiento de datos y operaciones por sesión

- **Elegida:** incluir el ID público de sesión confirmado en claves de Productos/Categorías y asociar cada mutación/aviso a esa sesión; ante pending, error, ausencia o sustitución de sesión, cancelar consultas y retirar resultados previos. Los callbacks tardíos verifican que su sesión siga vigente antes de modificar caché o feedback.
- **Descartada:** usar solo el UUID de producto o conservar resultados en estado global al salir; reintroduciría información de la sesión anterior.
- **RF cubiertos:** RF-6, RF-31, RF-94–RF-95, RF-106, RF-117, RF-137; NFR-10.

El ID de sesión se usa solo como ámbito efímero de caché/operación; no se persiste ni se copia a Zustand. Auth sigue siendo autoritativo. No se añade autorización del cliente: todos los rechazos de permiso provienen del backend y se muestran como no permitidos.

### 9. Respuestas tardías fuera del listado

- **Elegida:** mantener la suscripción de la mutación en el ámbito autenticado de AppLayout, por encima del Outlet, y notificar resultado sin navegar ni tomar foco de la página actual.
- **Descartada:** depender de un callback de fila que desaparece al cambiar de página; perdería el feedback prometido.
- **RF cubiertos:** RF-82–RF-89, RF-118–RF-120, RF-131–RF-138.

La caché de consulta sigue bajo TanStack Query; el coordinador conserva únicamente metadatos/transiciones de operación y feedback. Si cambia la sesión, los resultados pendientes de la sesión anterior se descartan.

### 10. Diseño visual y accesibilidad

- **Elegida:** revisar antes de implementar con Impeccable; reutilizar DataTable, Button, Input, Select, Dialog, Badge, Tooltip y tokens existentes; estilos específicos co-localizados.
- **Descartada:** crear una biblioteca de Productos genérica anticipadamente o importar PrimeReact en la feature.
- **RF cubiertos:** RF-8, RF-32, RF-46–RF-54, RF-77–RF-89, RF-101–RF-112; NFR-1–NFR-7, NFR-12.

Estados aplicables: loading, error, empty, success y pending. Acciones por fila y confirmaciones tendrán nombres accesibles. La tabla admite scroll dentro de su propio contenedor a ancho reducido. Los avisos de mutación tardía no roban foco.

## Estrategia de pruebas

Se prueban contratos de API, esquemas, hooks y resultados accesibles de la interfaz. Las pruebas no consultan detalles internos de PrimeReact. MSW proporcionará respuestas de Productos/Categorías y operaciones diferidas; Playwright cubrirá workflows reales del router con Auth simulado.

### Matriz de cobertura funcional

| RF | Prueba prevista | Nivel | Evidencia esperada |
| --- | --- | --- | --- |
| RF-1–RF-7 | Router y sesión confirmada; acceso directo a rutas; roles sin permiso con acciones aún visibles. | Integración/E2E | Página solicitada tras confirmación; estados de sesión correctos y navegación visible. |
| RF-8–RF-12 | Campos de fila, defaults de lista, total y páginas remotas. | Integración/E2E | Datos y paginación coinciden con respuesta del backend simulado. |
| RF-13–RF-18 | Pendiente, error/reintento, vacío, búsqueda vacía y rango de página posterior a cambios. | Integración/E2E | Feedback identificable y página válida en URL/UI. |
| RF-19–RF-26 | Normalización de búsqueda, filtro acumulativo, seis campos sort, dirección y reinicio de página. | Unitario/Integración | Query/URL contiene parámetros esperados y sin búsqueda vacía. |
| RF-27–RF-30 | URL, recarga, URL compartida, Atrás/Adelante y criterios inválidos. | Unitario/E2E | Estado visible se restaura; normalización no crea entradas extra. |
| RF-31 | Dos búsquedas con respuestas diferidas fuera de orden. | Integración/E2E | Respuesta antigua no reemplaza resultados del criterio vigente. |
| RF-32–RF-39 | Campos obligatorios/opcionales, SKU/nombre en blanco, precios cero/negativos/escala/formato. | Unitario/Integración | Campo inválido accesible; decimal válido llega sin cambio; venta menor aceptada. |
| RF-40–RF-45 | Crear con respuesta diferida, doble submit, éxito y fallos HTTP/red/contrato. | Integración/E2E | Una solicitud; espera de confirmación; valores conservados en fallo; destino activo predeterminado en éxito. |
| RF-46–RF-54 | Categorías multipágina, búsqueda, carga/error/vacío y rechazo por categoría que cambió. | Integración/E2E | Selección conservada al paginar; retry de lectura; campos restantes intactos tras conflicto. |
| RF-55–RF-60 | Carga inicial de edición, espera no editable, producto con/no descripción. | Integración/E2E | Formulario solo se rellena con respuesta inicial; borrar descripción genera actualización contractual. |
| RF-61–RF-67 | Categoría original, sustitución, producto sin categoría, estado no afectado, dirty state. | Unitario/Integración | Payload parcial correcto; no se envía categoría/estado sin modificación; no hay PATCH vacío. |
| RF-68–RF-73 | Edición con demora, duplicados, éxito/retorno y fallo conservando datos. | Integración/E2E | Campos/navegación bloqueados mientras pendiente; operación no optimista; origen restaurado. |
| RF-74–RF-76 | UUID inválido, producto 404 y fallo de red/servidor al consultar. | Integración/E2E | No se envía request con UUID inválido; estado específico y retry de carga donde corresponda. |
| RF-77–RF-81 | Acciones según estado, confirmación con identidad, cancelar. | Integración/E2E | No hay escritura al cancelar; texto aclara desactivación lógica. |
| RF-82–RF-89 | Mutación diferida, duplicados, éxito, fallo, reintento manual y cambio lógico. | Integración/E2E | Estado no cambia antes de respuesta; llamadas HTTP corresponden a PATCH/DELETE acordados. |
| RF-90–RF-93 | SKU duplicado activo/inactivo; rechazo 403 en create/update/deactivate. | Integración/E2E | Error junto al SKU; explicación no afirma estado desconocido; no hay feedback de éxito con 403. |
| RF-94–RF-98 | 401, recomprobación, error incierto, retry automático apagado y contrato inválido. | Integración/E2E | Boundary de sesión tiene prioridad; mutación no se reenvía automáticamente ni se muestra exitosa. |
| RF-99–RF-100 | Escritura 2xx y fallo de posterior lectura. | Integración/E2E | Éxito permanece; retry vuelve a consultar y no repite escritura. |
| RF-101–RF-106 | Confirmación de cambios, continuar, descartar a otro destino, reload warning y sesión que sustituye form. | Integración/E2E/Manual | Dirty state se conserva o descarta según elección; sesión prevalece. |
| RF-107–RF-112 | Teclado, orden de foco, validación, anuncios y recuperación de foco al cerrar Dialog. | Contrato/E2E/Manual | Operaciones completas sin puntero; foco y mensajes accesibles. |
| RF-113–RF-117 | Campos bloqueados y navegación interna pendiente; fallo permite edición/nuevo intento; sesión interrumpe bloqueo. | Integración/E2E | No hay salida en espera ni navegación encolada; prioridad de sesión verificada. |
| RF-118–RF-120 | Salir del listado durante mutación; resolver operación después. | Integración/E2E | Ruta y foco no cambian al recibir la respuesta tardía. |
| RF-121–RF-124 | Cancelar vs descartar navegando, retorno después de recargar form, origen inválido/ausente. | Unitario/E2E | Destino y criterios se restauran según cada acción; fallback predeterminado seguro. |
| RF-125–RF-126 | Tabla de casos decimal con coma/punto, tres decimales, miles y separadores mixtos. | Unitario/Integración | Casos aceptados/rechazados exactamente; no hay redondeo ni truncamiento. |
| RF-127–RF-130 | Rechazo invalida nueva selección; consulta fallida con categoría original o ausencia temporal. | Integración | No se reenvía selección rechazada; otros cambios sí se guardan sin reasignación. |
| RF-131–RF-134 | Producto desaparece al guardar/cambiar estado, usuario se queda o ya navegó. | Integración/E2E | Solo lectura y sin retry al editar; aviso tardío sin reemplazo de página; listado se actualiza al volver. |
| RF-135–RF-136 | Reconsulta del detalle tras dirty state. | Integración | Los valores locales y dirty state permanecen; no se envía actualización implícita. |
| RF-137–RF-138 | 404 tardío de cambio de estado después de abandonar listado y cambio de sesión concurrente. | Integración/E2E | Aviso accesible solo en sesión vigente; no roba foco/navega; al volver hay refetch. |

### Cobertura no funcional

| NFR | Evidencia prevista |
| --- | --- |
| NFR-1 | Playwright a 360/768/1280 y medición de overflow de documento; tabla con scroll local. |
| NFR-2 | Revisión de roles/labels/errores/foco/teclado y lector de pantalla manual. |
| NFR-3 | Revisión manual de zoom nativo al 200 %; viewport equivalente solo como complemento. |
| NFR-4 | Emular `prefers-reduced-motion` y verificar uso sin movimiento funcional obligatorio. |
| NFR-5 | Revisar etiquetas, validación, estados y errores de aplicación en español. |
| NFR-6 | Revisión Impeccable, tokens compartidos, CSS local, ESLint y Prettier. |
| NFR-7 | Pruebas de formato a dos decimales sin moneda y sin redondeo del valor enviado. |
| NFR-8 | Contrastar OpenAPI/HTTP y comprobar que un rechazo del servidor prevalece sobre la validación visual. |
| NFR-9 | Fixtures con centinelas; revisar que no se reflejen mensajes internos, secretos, cookies o tokens. |
| NFR-10 | Cerrar/sustituir sesión durante query y mutation diferidas; comprobar que caché y feedback anterior no se presentan como vigentes. |
| NFR-11 | E2E predeterminado y suites MSW sin backend real ni credenciales privadas. |
| NFR-12 | Casos de texto y precios largos; verificar el payload exacto y ausencia de cortes silenciosos. |

### Integración con suites existentes y comandos

- Añadir pruebas unitarias e integración dentro de `tests/products` y cobertura de lectura/select de categoría en `tests/categories` según crezca el comportamiento.
- Añadir Playwright del shell en archivos `*.bootstrap-smoke.spec.ts`, que se ejecutan en el proyecto E2E predeterminado.
- Migrar las expectativas actuales de «Inicio como único destino» para permitir Inicio y Productos, sin introducir destinos futuros.
- Mantener MSW para Auth y endpoints de negocio. No ampliar Auth real ni exigir una cuenta privada.
- Extender preview-smoke para verificar que Productos se sirve con Auth y Productos simulados, sin harnesses/demo ni peticiones de negocio al backend real.
- Ejecutar proyectos E2E secuencialmente: sus servidores comparten el puerto estricto 5174.
- Ejecutar verificaciones de cambios: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:run`, `pnpm build`, `pnpm test:e2e`, y de forma secuencial `pnpm test:e2e --project=design-system --workers=1`, `pnpm test:e2e --project=preview-smoke --workers=1` y `pnpm test:e2e --project=auth-harness --workers=1`.
- `pnpm format:check` no incluye Markdown; verificar `spec.md` y `plan.md` con Prettier focalizado.
- Registrar comandos y resultados reales durante la implementación; el plan no anticipa resultados.

## Riesgos y dudas abiertas

- **OpenAPI de Productos/Categorías:** debe confirmarse contra el servicio actual y conservarse una fuente reproducible antes de fijar los tipos generados. Si difiere de las specs del backend inspeccionadas, detener y resolver compatibilidad, no inferir campos.
- **Descripción vacía:** en actualización se enviará `null` para retirar la descripción; conservar una prueba de contrato que compruebe esta semántica.
- **Selector de categorías:** el aspecto se decidirá en revisión Impeccable; en todos los diseños debe permanecer la selección entre páginas y resolver el 404/409 del backend.
- **Revalidación de categorías:** una selección consultada puede dejar de estar activa antes del submit. El error del backend es autoritativo; conservar demás campos y exigir seleccionar de nuevo.
- **Mutación tardía:** el coordinador debe separar respuesta del listado desmontado, error visible y sesión vigente sin almacenar datos duplicados de producto.
- **Cambio de sesión:** cancelación de queries no basta para descartar callbacks de mutación ya resueltos; cada callback debe comprobar vigencia antes de tocar caché o UI.
- **Precios:** el backend recibe un número JSON y no declara aquí un máximo de magnitud. El parser debe detectar representaciones no seguras y no cambiar silenciosamente el importe.
- **Ediciones concurrentes:** el contrato no expone control de versión; no se garantiza evitar una última escritura que sobrescriba otra.
- **Accesibilidad manual:** Narrator/Chromium, contraste contextual y zoom nativo requieren evidencia humana; ARIA automatizado no los sustituye.
- **Rendimiento:** el build actual supera el umbral de chunk de 500 kB. Medir el efecto de Products, registrar advertencia; cualquier optimización amplia requiere evidencia y autorización de alcance.
