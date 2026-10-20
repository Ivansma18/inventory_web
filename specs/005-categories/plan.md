# Plan 005 - Categorías

## Contexto

Estrategia de implementación de la Spec 005 aprobada y revisada: **140 requisitos funcionales y 11 requisitos no funcionales**, correspondientes a la Fase 4 de `docs/ruta.md`.

Referencias: `spec.md`, `docs/constitution.md`, `docs/estructura.md`, `AGENTS.md` y Spec 004 de Productos. No hay dudas funcionales abiertas en la spec. Este documento no implementa código ni divide el trabajo en tareas.

### Base técnica inspeccionada

- React/TypeScript, React Router, TanStack Query, React Hook Form y Zod ya están configurados. Las vistas utilizan el Design System propio; PrimeReact, PrimeIcons y Better Auth permanecen encapsulados.
- `features/categories` ya tiene contratos generados, validación de respuestas, listado de opciones activas y consulta de detalle, expuestos mediante su API pública. Productos consume `useActiveCategories` y `useCategory`.
- `src/app/router/router.tsx` registra Inicio y las páginas de Productos bajo `SessionBoundary`; Categorías todavía no tiene páginas de gestión.
- `src/app/router/navigation.ts` centraliza los destinos; `AppNavigation` sirve navegación compacta y persistente.
- El cliente compartido normaliza errores HTTP. TanStack Query tiene `retry: false` para consultas y mutaciones, `staleTime` de 30 segundos y no reconsulta por foco de ventana.
- Las claves actuales de Categorías son `['categories', 'active-list', sessionId, params]` y `['categories', 'detail', sessionId, uuid]`. Se conservarán compatibles con Productos.
- El selector de creación está compuesto dentro de `product-create-form.tsx`; edición tiene `ProductEditCategoryField`. Ambos retienen selecciones fuera de la página de opciones. No se supondrá que la ausencia de una opción significa inexistencia.
- Productos tiene patrones probados de URL, retorno, guard de navegación, errores y foco. Son referencia de comportamiento, no una API interna importable desde Categorías.
- Backend inspeccionado: `category.service.ts`, `category.entity.ts`, `category.schemas.ts`, `category.routes.ts` y `prisma-category.repository.ts` en `inventary-api`. Buscar usa coincidencias parciales insensibles a mayúsculas; el nombre se recorta y compara en minúsculas, incluso para categorías inactivas.
- **Diferencia crítica con Productos:** `DELETE /categories/:uuid` elimina permanentemente. Se excluye del frontend de esta fase. Activar y desactivar utilizan `PATCH` con `isActive`; desactivar se rechaza si hay cualquier producto asociado, incluido inactivo.

### Flujo de experiencia

Objetivo: localizar una categoría, mantener nombre/descripción o cambiar su disponibilidad sin perder contexto ni datos. Información principal: nombre, estado y total; descripción completa en los formularios. Flujos:

1. Listado → búsqueda/estado/orden/página → edición → retorno al origen.
2. Listado → creación → confirmación del backend → listado activo predeterminado.
3. Listado → confirmación de estado → resultado → actualización de la consulta.
4. Resultado incierto → comprobación de detalle → estado observado o recuperación de consulta.
5. Modificar categoría → regresar a Productos → opciones actualizadas sin reinicializar el producto.

Antes de construir vistas, utilizar Impeccable y el contexto visual existente. Reutilizar patrones del producto, no rediseñar el App Shell ni crear una biblioteca genérica de CRUD.

## Módulos y responsabilidades

Las ubicaciones nuevas son propuestas de implementación; no implican crear carpetas vacías anticipadamente.

| Módulo | Responsabilidad | RF cubiertos |
| --- | --- | --- |
| Router y navegación de app | Rutas `/categories`, `/categories/new`, `/categories/:uuid/edit`, enlace y estados de sesión. | RF-1–RF-7, RF-113 |
| `features/categories/api` | Lecturas, escrituras, tipos derivados de OpenAPI, validación de respuestas y errores normalizados. | RF-8–RF-19, RF-33–RF-58, RF-70–RF-103, RF-115–RF-118, RF-131–RF-140 |
| Hooks de consulta y utilidades URL de Categorías | Consulta remota, claves, cancelación, criterios, corrección de página, historial y retorno seguro. | RF-10–RF-32, RF-49, RF-65–RF-69, RF-79, RF-99–RF-103 |
| Páginas y tabla de Categorías | Listado, formularios de página, estados, acciones y confirmaciones. | RF-2–RF-5, RF-8–RF-19, RF-33–RF-56, RF-70–RF-89, RF-109–RF-114, RF-122–RF-130 |
| Formulario, esquemas y guard de Categorías | Valores locales, actualización parcial, dirty state, protección de salida y recuperación. | RF-33–RF-69, RF-87, RF-94–RF-98, RF-110–RF-111, RF-124–RF-126, RF-131–RF-133 |
| Coordinador de operaciones de Categorías | Mutaciones por sesión/categoría, avisos tardíos, pendientes y comprobación de incertidumbre. | RF-75–RF-86, RF-90–RF-103, RF-112, RF-117–RF-118, RF-122–RF-123, RF-127–RF-138 |
| API pública y selector de Categorías | Opciones activas actualizadas, selección retenida y verificación de selección nueva. | RF-104–RF-108, RF-119–RF-121, RF-139–RF-140 |
| Composición de formularios de Productos | Integrar selector sin alterar categoría original, valores, payload ni protección existentes. | RF-104–RF-108, RF-119–RF-121, RF-139–RF-140 |
| Design System y composiciones compartidas existentes | Controles, diálogo, anuncios y referencias de foco mediante contratos propios. | RF-109–RF-114; NFR-1–NFR-6 |

`app` integra páginas y coordinador mediante el `index.ts` de Categorías. Productos solo consume esa API pública. Categorías no importa internos de Productos. CSS visual co-localizado; los estilos globales no recibirán selectores propios de la feature.

## Modelo de datos y contratos

### Contratos HTTP

Fuente reproducible existente: `tests/contracts/categories.openapi.json` y tipos generados en `src/shared/api/generated/category-contracts.ts`. Confirmar compatibilidad de los contratos de escritura contra el backend inspeccionado antes de implementarlos. No editar tipos generados manualmente ni añadir endpoints.

| Operación | Contrato | Respuesta esperada |
| --- | --- | --- |
| Listar | `GET /categories` | `200 { data, pagination: { total, page, limit } }` |
| Consultar | `GET /categories/:uuid` | `200 { data: Category }` |
| Crear | `POST /categories`, nombre y descripción opcional | `201 { data: Category }`; nueva categoría activa |
| Editar información | `PATCH /categories/:uuid`, solo nombre/descripción modificados | `200 { data: Category }` |
| Activar/desactivar | `PATCH /categories/:uuid`, solo `isActive: true/false` | `200 { data: Category }` |

La entidad contractual incluye `uuid`, `name`, `description: string | null`, `isActive`, `createdAt` y `updatedAt`. El nombre normalizado interno del backend no es un campo del frontend. La respuesta exitosa debe ser válida y corresponder a la categoría solicitada; un cuerpo inválido o incompatible con el resultado de estado no se interpretará como confirmación de éxito.

No se implementará una función de eliminación ni se utilizará `DELETE` como desactivación.

### Consulta y URL

- Estado navegable propuesto: `/categories?page=2&search=oficina&status=inactive&sort=name&order=asc`.
- Valores válidos: página entera positiva; estado `active` o `inactive`; orden por `name`, `createdAt` o `updatedAt`; dirección `asc` o `desc`. El tamaño es fijo en 15.
- Traducir estado a `isActive: 'true'/'false'`; búsqueda con espacios exteriores retirados y omitida si vacía. Los resultados y totales proceden del backend, no de filtrar páginas localmente.
- Defaults: página 1, activos, nombre ascendente. Parser y serializador únicos normalizan parámetros inválidos.
- Interacciones deliberadas crean historial; normalización y corrección de rango reemplazan la entrada actual. Solo cambiar búsqueda, estado u orden reinicia página; Atrás/Adelante restaura el estado representado.
- No usar filas anteriores de otra clave como resultados del nuevo criterio. Conservar snapshots únicamente de la misma consulta durante refresco o error.
- El origen de formulario se guarda en URL y se conserva al recargar. Aceptar exclusivamente `/categories` con criterios admitidos; rechazar orígenes externos, otras rutas y direcciones malformadas. Fallback al listado predeterminado.

### Formulario

- React Hook Form conserva strings de nombre y descripción; Zod valida nombre no vacío tras trim. No imponer límites no publicados ni cortar textos.
- Crear sin descripción: omitirla o enviar `null`; quitar una descripción existente al editar: enviar `description: null`.
- Snapshot inicial para comparar cambios y construir un PATCH parcial. Guardar información nunca envía `isActive`.
- No inicializar antes de la respuesta ni reinicializar valores/dirty state por una reconsulta mientras haya cambios locales.
- Error ordinario: recuperar edición solo si el formulario sigue montado y pertenece a la misma sesión vigente. Un 404 al guardar retiene valores en solo lectura y la protección de descarte, pero no permite reenviar.
- Tras éxito o descarte, retirar la protección antes de completar el retorno correspondiente. Un intento de salida durante escritura no se ejecuta al resolver la petición.

### Claves y ownership

| Estado | Responsable |
| --- | --- |
| Listado, detalle, opciones y resultados HTTP | TanStack Query |
| Sesión y vigencia | API pública de Auth |
| Filtros, página, orden y origen | React Router / URL |
| Campos, errores y dirty state | React Hook Form |
| Confirmación abierta, borrador de búsqueda y metadatos de coordinación | Estado local de la feature |

Claves propuestas: `['categories', 'management-list', sessionId, params]` y mutaciones `['categories', 'mutation', sessionId, operation]`. Mantener las claves actuales de `active-list` y `detail` y centralizar sus constructores/predicados dentro de Categorías. Incluir en cada mutación el ID de sesión solicitante, UUID y estado solicitado cuando corresponda.

Los metadatos de operación contienen identificador, sesión, categoría, estado previo/solicitado y fase; no duplican catálogos ni la sesión en Zustand. La incertidumbre y los bloqueos sobreviven a navegar entre páginas dentro del ámbito de sesión, sin persistir en almacenamiento. Al entrar de nuevo se realiza la lectura vigente antes de habilitar una operación sobre una categoría cuyo resultado siga incierto.

### Errores observables

| Caso | Evidencia del backend / transporte | Tratamiento |
| --- | --- | --- |
| Nombre duplicado | `CATEGORY_NAME_ALREADY_EXISTS`, 409 | Error de nombre; incluye inactivos y comparación normalizada. |
| Nombre inválido | `INVALID_CATEGORY_DATA`, 400 | Error del nombre cuando el código identifica esa regla. |
| Validación no específica | `VALIDATION_ERROR`, 400 | Error general; no inferir campos del texto interno. |
| Productos asociados | `CATEGORY_HAS_ASSOCIATED_PRODUCTS`, 409 | Explicar bloqueo, conservar estado, sin reasignación ni retry directo. |
| Inexistente | `CATEGORY_NOT_FOUND`, 404 | Estado específico y retorno actualizado; sin retry de escritura. |
| Permisos | 403 | Operación no permitida, nunca éxito ni retry directo de estado. |
| Sesión | 401 | Reconsultar Auth; SessionBoundary prevalece. |
| Fallo de red/servidor sin resultado confirmable | Transporte o 5xx | Advertir incertidumbre; sin reenvío automático. Para estado, comprobar detalle antes de otra modificación. |
| Respuesta exitosa inválida | Error de contrato | Mensaje distinto del éxito; si el estado no es confirmable, aplicar comprobación de incertidumbre. |
| Escritura confirmada y lectura fallida | 2xx válido seguido de fallo de consulta | Conservar éxito; retry solo de lectura. |

Los códigos/status determinan los mensajes españoles. No renderizar directamente mensajes del servidor ni registrar cuerpos sensibles. En toda respuesta tardía comprobar sesión antes de cachear o anunciar.

### Recuperación de un cambio de estado incierto

La máquina de estados de coordinación distingue `pending`, `confirmed`, `rejected`, `uncertain`, `checking`, `check-failed` y `not-found`. El usuario puede abandonar el listado; esa navegación no cancela ni confirma una escritura.

| Resultado de comprobación de detalle | UI y operación permitida | RF |
| --- | --- | --- |
| Consulta pendiente o fallida | No permitir otra modificación de estado; ofrecer retry de consulta si falla. | RF-117, RF-134–RF-135 |
| Estado solicitado observado | Mostrar el estado vigente sin atribuir éxito a la petición incierta; no reenviar. La comprobación resuelve la incertidumbre para acciones posteriores acordes al estado observado. | RF-136–RF-137, RF-70–RF-72, RF-92 |
| Estado anterior observado | Permitir una nueva operación únicamente tras nueva confirmación explícita. | RF-138 |
| Categoría inexistente | Estado no encontrado y retorno; sin retry de escritura. | RF-95, RF-98 |
| Cambio/pérdida de sesión | Descartar resultados anteriores; prevalece Auth. | RF-6, RF-64; NFR-9 |

La comprobación es una lectura nueva del detalle, no observar únicamente una fila cacheada. No garantiza que una petición todavía en curso en el servidor no se complete después; no se inventa idempotencia ni control de versión del backend.

## Decisiones técnicas

### 1. Extender Categorías sin romper la lectura pública existente

- **Elegida:** ampliar API y hooks de Categorías con consultas de gestión y escritura; mantener `useActiveCategories`, `useCategory` y sus tipos públicos compatibles.
- **Descartada:** crear una segunda feature de administración o consumir internos desde Productos; duplicaría contratos y rompería fronteras.
- **RF cubiertos:** RF-1–RF-7, RF-33–RF-49, RF-104–RF-108, RF-119–RF-121, RF-139–RF-140.

### 2. Páginas y estado navegable propio

- **Elegida:** tres rutas bajo SessionBoundary, URL canónica y origen validado; tabla controlada por respuesta remota. Las páginas administran foco con un encabezado disponible tras carga y error.
- **Descartada:** formularios modales, filtros en Zustand o listado filtrado localmente; contradicen páginas propias, historial y paginación remota.
- **RF cubiertos:** RF-1–RF-32, RF-49, RF-65–RF-69, RF-113.

### 3. Mutaciones autoritativas y semántica de desactivación

- **Elegida:** POST para creación y PATCH separado para información/estado; validación del resultado y ausencia de optimistic updates. Invalidar listado de gestión, opciones activas y detalle afectados solo para la sesión vigente.
- **Descartada:** copiar el DELETE lógico de Productos o modificar visualmente el estado antes de respuesta; en Categorías DELETE es permanente y está fuera de alcance.
- **RF cubiertos:** RF-37–RF-49, RF-70–RF-89, RF-92–RF-93, RF-100–RF-108, RF-115–RF-118.

### 4. Formulario y protección de navegación específicos

- **Elegida:** `CategoryForm` con modos de creación/edición, esquemas propios y hook de guard propio basado en el comportamiento probado de Productos. Usar bloqueo del router para navegación interna y `beforeunload` para la advertencia nativa; la sesión desmonta el formulario con prioridad.
- **Descartada:** importar hooks internos de Productos o generalizar todos los formularios del proyecto; ampliaría alcance. Una extracción compartida posterior requiere reutilización real y pruebas de ambos consumidores.
- **RF cubiertos:** RF-33–RF-69, RF-87, RF-94–RF-98, RF-110–RF-111, RF-124–RF-126, RF-131–RF-133.

### 5. Coordinación por sesión independiente de la página

- **Elegida:** `CategoryOperationsProvider` propio, integrado desde su API pública dentro del App Shell por encima del Outlet; utiliza hooks de mutación de TanStack Query y metadatos efímeros por categoría. Los callbacks de ciclo de vida resuelven invalidación, incertidumbre y avisos incluso después de desmontar el listado. La página solo realiza efectos de ruta/foco mientras siga siendo la solicitante y la sesión sea vigente.
- **Descartada:** confiar únicamente en callbacks pasados a `mutate` por una fila; dejan de ejecutarse al desmontar su observador. Tampoco persistir bloqueos/resultados en Zustand o localStorage.
- **RF cubiertos:** RF-75–RF-86, RF-90–RF-103, RF-112, RF-117–RF-118, RF-122–RF-123, RF-130, RF-134–RF-138; NFR-9.

El coordinador recibe `useSession` y verifica `isCurrentSession` desde Auth. Al sustituir sesión, cancelar/retirar consultas de Categorías de la sesión anterior y limpiar metadatos; las escrituras ya enviadas no se consideran canceladas en el servidor. Cancelación de lecturas y descarte de callbacks son controles distintos. No modificar el lifecycle de Productos salvo integración pública necesaria y cubierta por regresión.

### 6. Confirmaciones limitadas al conocimiento recibido

- **Elegida:** asociar la confirmación a UUID/estado esperado y contrastarla con la información vigente recibida antes del envío. Si hay evidencia de desaparición/cambio, informar y reconsultar sin mutar. Durante pending bloquear cambio duplicado y apertura de edición de esa fila, no la salida del listado.
- **Descartada:** garantizar detectar cambios de otro cliente que aún no llegaron o implementar polling/versionado; la spec excluye esa garantía y el backend no publica ese contrato.
- **RF cubiertos:** RF-72–RF-77, RF-84–RF-86, RF-122–RF-123, RF-127–RF-130.

### 7. Selección pública reutilizable para Productos

- **Elegida:** extraer la composición repetida de búsqueda/paginación/selección a `CategorySelector` dentro de Categorías y exponer solo su contrato propio. El valor y errores del formulario pertenecen a Productos; el selector gestiona opciones y lectura de disponibilidad. No incluye crear/editar categorías.
- **Descartada:** mover formularios de Productos a Categorías, añadir gestión inline o depender de detalles de React Hook Form en el contrato público; acoplaría dominios y ampliaría alcance.
- **RF cubiertos:** RF-104–RF-108, RF-119–RF-121, RF-139–RF-140.

La API del selector distinguirá categoría original de nueva asignación, valor seleccionado, bloqueo, mensaje de error, cambio de valor e invalidación confirmada. Retener etiqueta/selección fuera de la página; no limpiar por paginación ni búsqueda. Consultar detalle de la selección nueva cuando se requiera comprobar disponibilidad: solo detalle exitoso inactivo, 404 o rechazo autoritativo equivalente invalida. Un fallo de comprobación conserva la selección y permite al backend autorizar el guardado. No convierte en válida una asignación que ya había sido rechazada por el backend en la Spec 004.

Al confirmar una escritura de Categorías, invalidar las opciones activas y detalles de su sesión. Al montar/regresar al formulario de Productos reconsultar las opciones aunque la caché siga dentro de `staleTime`; actualizar opciones expresamente también revalida la selección nueva. No hacer que una consulta de opciones reinicie campos/dirty state del producto. Mantener la categoría original, incluso inactiva o ausente temporalmente, al guardar sin reasignación.

### 8. UI y feedback mediante contratos propios

- **Elegida:** DataTable, Button, Input, Textarea, Select, Badge, Dialog y Toast existentes; estados loading/error/empty/success/pending y nombres accesibles. Retorno de foco a la acción disponible o encabezado cuando una fila desaparece. Avisos tardíos nunca enfocan ni navegan.
- **Descartada:** importar PrimeReact en la feature o ampliar wrappers con opciones innecesarias; las mejoras genéricas solo se incorporan si una prueba demuestra su necesidad.
- **RF cubiertos:** RF-8–RF-19, RF-52–RF-56, RF-72–RF-86, RF-102, RF-109–RF-114, RF-122–RF-129; NFR-1–NFR-6.

## Estrategia de pruebas

Pruebas de contrato, esquemas y UI con Vitest, Testing Library y MSW; router y workflows con Playwright. Diseñar primero escenarios y respuestas diferidas. No usar internals de PrimeReact como contrato de las pruebas de features.

### Matriz funcional completa

Cada RF pertenece al menos a una fila; los rangos incluyen todos sus identificadores.

| RF | Prueba | Nivel | Evidencia esperada |
| --- | --- | --- | --- |
| RF-1–RF-7 | Navegación, tres rutas directas y pending/error/signed-out; varios roles. | Integración/E2E | Página bajo App Shell tras Auth; acciones visibles sin inferencia de permisos. |
| RF-8–RF-13 | Respuestas paginadas y total; cambio de página. | Integración/E2E | Nombre, estado, activos/defaults/15 por página y total remoto exactos. |
| RF-14–RF-19 | Consulta diferida, fallo/retry, vacío, limpiar búsqueda y página inválida por total. | Integración | Estados identificables; última página válida o 1; solo se repite lectura. |
| RF-20–RF-27 | Búsqueda parcial/case-insensitive, trim/blancos, estado acumulado, tres campos de orden y ambas direcciones. | Unitario/Integración | Parámetros exactos; fixture de backend simulado respeta reglas; cambio de criterio reinicia página, no paginar. |
| RF-28–RF-32 | Parser/serializador, URL compartida, reload, historial, normalización por reemplazo y respuestas fuera de orden. | Unitario/Integración/E2E | Estado restaurado; sin entrada extra ni filas obsoletas. |
| RF-33–RF-39 | Campos, requerido/blancos, descripción ausente y POST diferido. | Unitario/Integración/E2E | Envío válido, sin éxito anticipado y retorno activo predeterminado. |
| RF-40–RF-49 | Carga de edición, activos/inactivos, descripción retirada, PATCH parcial y formulario limpio. | Integración/E2E | Datos solo tras carga, sin cambio de estado ni PATCH vacío; éxito y origen correctos. |
| RF-50–RF-51 | Reconsulta del detalle tras cambios locales. | Integración | Valores y dirty state permanecen. |
| RF-52–RF-59 | Creación/edición diferidas, doble submit, edición y salida durante pending, fallo posterior. | Integración/E2E | Una escritura, campos bloqueados, aviso de espera y fallo sin salida encolada. |
| RF-60–RF-64 | Continuar/descartar, enlace/historial, recarga/cierre y sesión que sustituye el form. | Integración/E2E/Manual | Destino elegido, advertencia nativa y prioridad de acceso. |
| RF-65–RF-69 | Cancelar/retornos de error, reload y origen inválido/externo. | Unitario/Integración/E2E | Origen correcto o fallback; nunca redirección externa. |
| RF-70–RF-79 | Ambos estados, confirmar/cancelar y PATCH diferido/duplicado. | Integración/E2E | Identidad, conservación, pendientes, confirmación remota y refresco de criterios. |
| RF-80–RF-83 | 409 por productos asociados activos/inactivos y fallo recuperable. | Contrato/Integración | Categoría activa, explicación, sin reasignar; retry solo en caso permitido. |
| RF-84–RF-86 | Navegar a Inicio mientras cambia estado; resolver después. | Integración/E2E | Salida permitida, ruta y foco intactos. |
| RF-87–RF-93 | Duplicado, 403, 401, red/5xx, contrato inválido y espera posterior al fallo. | Contrato/Integración | Error correcto, Auth reconsultado, sin falso éxito ni reenvío automático. |
| RF-94–RF-99 | UUID inválido, 404 de carga/guardado, fallo de carga, valores readonly y retorno. | Integración | Sin request de UUID inválido; retry solo de carga; refetch al volver del 404. |
| RF-100–RF-103 | Escritura válida y lectura fallida; error/éxito tardío fuera del listado y sustitución de sesión. | Integración/E2E | Éxito conservado o aviso vigente; retry/refetch solo de lectura; nada de otra sesión. |
| RF-104–RF-108 | Crear/renombrar/activar/desactivar categoría y volver a formularios de Productos. | Integración/E2E | Opciones actuales, sin gestión inline; categoría original y producto conservados. |
| RF-109–RF-114 | Teclado, errores asociados, primer inválido, anuncios y foco de páginas/diálogo. | Contrato/Integración/E2E/Manual | Workflow operable sin puntero; foco/labels/anuncios verificables. |
| RF-115–RF-116 | Nombres con mayúsculas/espacios y duplicado con inactiva. | Contrato/Integración | Backend simulado rechaza duplicado; error junto al nombre sin inventar estado del duplicado. |
| RF-117–RF-118 | Incertidumbre y rechazos 403/404/asociados. | Integración | No nueva escritura antes de comprobar; sin retry directo en rechazos excluidos. |
| RF-119–RF-121 | Actualización explícita de opciones y detalle inactivo/404 de selección nueva. | Integración | Selección invalidada por evidencia; demás campos intactos. |
| RF-122–RF-123 | Categoría desaparece durante PATCH de estado con página aún abierta. | Integración/E2E | Estado no encontrada, retorno al listado actualizado, sin retry de mutación. |
| RF-124–RF-126 | Guardar/descartar y posterior navegación; 404 de edición readonly. | Integración/E2E | Sin aviso después de éxito/descarte; sí aviso al descartar valores readonly. |
| RF-127–RF-130 | Recibir detalle/listado que cambia la categoría antes de confirmar; acción pendiente y edición de fila. | Integración | Sin PATCH desactualizado, aviso y refetch; edición bloqueada sin impedir navegación. |
| RF-131–RF-133 | Rechazo de campo identificable/general y textos extensos. | Unitario/Integración | Mensaje seguro en campo/formulario; payload sin truncamiento ni límites inventados. |
| RF-134–RF-135 | Comprobación de resultado incierto falla y luego se reintenta. | Integración/E2E | Modificación bloqueada; retry genera GET, no PATCH. |
| RF-136–RF-137 | GET posterior observa estado solicitado. | Integración | Estado vigente sin afirmar éxito de petición incierta ni reenviar. |
| RF-138 | GET posterior observa estado anterior. | Integración/E2E | No PATCH hasta nueva confirmación explícita. |
| RF-139–RF-140 | Selección fuera de página/búsqueda y comprobación fallida. | Integración | Selección retenida; guardado sujeto al backend, sin invalidación por ausencia/fallo. |

### Cobertura no funcional

| NFR | Verificación planificada |
| --- | --- |
| NFR-1 | Playwright a 360/768/1280 px: overflow del documento, scroll local de tabla y acciones de listado/crear/editar. |
| NFR-2 | Roles, labels, errores, teclado, foco y contraste contextual en navegador; revisión humana con Narrator/Chromium del workflow completo. |
| NFR-3 | Ampliar el proyecto optativo `native-zoom` a Categorías con preferencia nativa real al 200 %, acciones dentro de viewport y sin overflow del documento; revisión manual. Un viewport equivalente no sustituye esta evidencia. |
| NFR-4 | Emular movimiento reducido y completar confirmación/descarte sin movimiento funcional obligatorio. |
| NFR-5 | Revisar mensajes en español y tipo nativo `beforeunload`; su texto/idioma pertenece al navegador. |
| NFR-6 | Revisión Impeccable, tokens/CSS co-localizado, primitivas propias y fronteras de imports verificadas por lint. |
| NFR-7 | Contratos HTTP y rechazos autoritativos; comprobar PATCH para ambos estados y ausencia total de DELETE en workflows. |
| NFR-8 | Respuestas con centinelas sensibles: ningún secreto/texto interno aparece en mensajes ni registros de la aplicación. |
| NFR-9 | Sustituir/cerrar sesión durante consultas, guardados, cambios de estado y comprobaciones diferidas; descartar caché, avisos, navegación y bloqueos anteriores. |
| NFR-10 | Suites MSW y Playwright simuladas; sin dependencia de cuenta/backend real. |
| NFR-11 | Nombres y descripciones largos: comparar campos y payload exacto, incluidos errores y reintentos. |

### Integración y comandos de verificación

- Ampliar `tests/categories` con contratos, URL, esquemas, formulario, listado, mutaciones y recuperación. Añadir pruebas de regresión de los formularios de Productos para el selector público.
- Incorporar escenarios de Categorías en `*.bootstrap-smoke.spec.ts` y en el harness MSW de workflows, exclusivamente de pruebas. Mantenerlo fuera de producción y sin credenciales.
- Actualizar smokes de navegación que dependan del número/orden de enlaces: ahora Inicio, Productos y Categorías. Mantener cobertura compacta/persistente, logout y session boundary.
- Ampliar `preview-smoke` para servir Categorías con Auth/API simuladas y verificar que no contiene demo/harnesses/worker ni llama al backend de negocio real.
- Ejecutar `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:run` y `pnpm build`.
- Ejecutar `pnpm test:e2e`; después, secuencialmente, `pnpm test:e2e --project=design-system --workers=1`, `pnpm test:e2e --project=preview-smoke --workers=1`, `pnpm test:e2e --project=auth-harness --workers=1` y `pnpm test:e2e --project=native-zoom --workers=1`. Sus servidores comparten el puerto estricto 5174: no lanzar proyectos en procesos simultáneos.
- El proyecto `native-zoom` requiere escritorio gráfico. Si no está disponible, registrar bloqueo y realizar la comprobación manual documentada; no declarar el NFR verificado por equivalencia de viewport.
- Verificar Markdown mediante `pnpm exec prettier --check specs/005-categories/spec.md specs/005-categories/plan.md`; no pertenece al `format:check` global.
- Conservar evidencias RF/NFR, incidencias y verificaciones manuales durante implementación. Estos comandos son estrategia de validación, no resultados anticipados.

## Riesgos y dudas abiertas

No se identifican decisiones funcionales pendientes en la spec aprobada. Riesgos técnicos a controlar:

- **DELETE destructivo:** impedir que la analogía con Productos introduzca eliminación permanente; prueba de método y payload obligatoria.
- **Caché de opciones todavía fresh:** invalidar variantes de opciones/detalle de la sesión y reconsultar al volver; invalidar solo el listado administrativo no cumple la integración.
- **Selección fuera de página:** el wrapper Select no puede recibir un conjunto que borre automáticamente una selección retenida; verificar detalle antes de invalidar por existencia/actividad.
- **Callbacks tras desmontaje:** no depender de callbacks de observador de fila; probar coordinator después de navegar y bajo StrictMode.
- **Escritura incierta:** una lectura posterior observa estado, no causalidad ni finalización de una petición en el servidor. No anunciar éxito por inferencia ni añadir reenvío automático.
- **Sesión:** cancelar GET no impide que resuelva un PATCH enviado; descartar todos sus efectos si la sesión dejó de ser vigente.
- **Concurrencia:** el backend no aporta versión para garantizar detección previa a confirmar; solo se bloquea con información recibida.
- **Compatibilidad de Productos:** el selector extraído debe preservar asignación original, errores de categoría rechazada y estados dirty/guard de la Spec 004; bloquear cambios si la regresión contradice esa spec.
- **Contrato:** si la fuente OpenAPI o el backend vigente difiere de lo inspeccionado, detener el trabajo afectado y resolver compatibilidad; no cambiar la spec ni el backend por inferencia.
- **Accesibilidad real:** lector de pantalla y revisión manual no se sustituyen por assertions de ARIA; documentar responsable, entorno y resultado al ejecutar.
- **Bundle:** existe un aviso previo por chunk superior a 500 kB; registrar el resultado de build. Una optimización amplia no forma parte de esta fase sin medición y autorización.

El plan queda pendiente de aprobación explícita antes de generar tareas o código.
