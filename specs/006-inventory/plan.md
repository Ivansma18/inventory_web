# Plan 006 — Inventario

## Contexto

Estrategia para `specs/006-inventory/spec.md`, revisada y aprobada, con RF-1–RF-80 y NFR-1–NFR-10. Este documento propone el cómo; no implementa funcionalidad ni divide el trabajo en tareas. Requiere aprobación antes de generar `tasks.md`.

Referencias: `docs/constitution.md`, `docs/estructura.md`, Fase 5 de `docs/ruta.md`, `AGENTS.md` y contratos/comportamientos existentes de las Specs 004 y 005. Inventario consulta existencias y permite abrir la edición existente de Productos; no modifica cantidades, mínimos ni movimientos. La Fase 6 sigue fuera de alcance.

### Base técnica inspeccionada

- React, TypeScript strict, React Router, TanStack Query, Axios, React Hook Form y Zod; primitivas propias sobre PrimeReact. Se conservan las versiones fijadas en `package.json`; no se necesitan dependencias nuevas.
- `src/features/products/utils/product-edit-return-to.ts` solo acepta retornos a `/products`. `ProductEditPage` resuelve ese destino y `ProductEditForm` lo utiliza para Cancelar, 404 y éxito. Productos aún no expone un constructor de enlaces público.
- `src/features/categories` aporta patrones de URL, listado, parsers, aislamiento de sesión y confirmación de escritura independiente del resultado de la lectura posterior. Se reutilizan patrones, no sus internos ni su coordinador de mutaciones.
- `src/shared/api/http-client.ts` admite `AbortSignal`, timeout de 10 segundos y errores normalizados. `query-client.ts` configura `retry: false`, caché fresh de 30 segundos y ausencia de refetch por foco.
- Vitest/Testing Library/MSW y Playwright están configurados. Los proyectos de navegador comparten el puerto estricto 5174.

### Contraste con el backend

Fuente inspeccionada en modo lectura: repositorio hermano `inventary-api`, especialmente `src/features/inventory/{http,domain,infrastructure}`, `src/features/stock-movements/{http,application,domain,infrastructure}`, `src/features/products/infrastructure/prisma-product.repository.ts` y `src/app.ts`.

- Existe `GET /inventory` con búsqueda, filtros y ordenación paginados. Consulta registros de inventario, no todos los productos; la creación ordinaria del producto crea también su inventario.
- El listado no contiene el último movimiento. `GET /inventory/{productUuid}/movements` admite página y límite; el servicio fija orden por `createdAt` descendente con desempate por UUID ascendente. `page=1&limit=1` obtiene el último según ese orden, sin descargar el historial completo.
- El estado procede del backend: cantidad cero → `OUT_OF_STOCK`; cantidad positiva menor o igual al mínimo → `LOW_STOCK`; cantidad mayor al mínimo → `IN_STOCK`.
- Cantidad actual y mínimo son enteros no negativos. En movimientos, `IN`/`OUT` expresan unidades transaccionadas y `ADJUSTMENT` expresa existencia resultante.
- Las lecturas inspeccionadas no anuncian actualmente 401/403 en todos sus esquemas OpenAPI. Su tratamiento defensivo y simulado responde a la spec; no se presentará como autorización nueva implementada en el backend.
- La captura OpenAPI reproducible se realizará durante la implementación mediante el mecanismo existente; esta inspección no equivale a ejecutar contra un backend real ni a haber generado contratos.

## Módulos y responsabilidades

Los nombres siguientes son archivos propuestos, no archivos ya implementados.

| Módulo | Responsabilidad | RF cubiertos |
| --- | --- | --- |
| `src/app/router/navigation.ts`, `router.tsx` | Añadir Inventario tras Categorías, bajo el `SessionBoundary` y App Shell existentes. | RF-1–RF-4, RF-65 |
| `src/app/router/product-edit-route.tsx` | Componer la edición pública de Productos con la política de retorno validada de Inventario, sin imports cruzados de internos. | RF-45–RF-55, RF-71–RF-73 |
| `features/inventory/index.ts` | Exportar la página, tipos propios de integración y utilidades de URL/retorno necesarias para la composición; no exponer librerías UI. | RF-2–RF-3, RF-40–RF-55 |
| `inventory/api/inventory-contract.ts`, `inventory-api.ts` | Tipos derivados de OpenAPI, validación integral del listado y GET mediante cliente HTTP compartido. | RF-5–RF-13, RF-19–RF-24, RF-29–RF-37, RF-66–RF-67, RF-77 |
| `inventory/api/latest-movement-contract.ts`, `latest-movement-api.ts` | Lectura mínima por producto y validación independiente del último movimiento. | RF-14–RF-18, RF-68–RF-70 |
| `inventory/hooks/use-inventory-list.ts`, `use-latest-stock-movement.ts` | Query keys, cancelación, reconsulta y estados de lectura separados. | RF-19–RF-28, RF-44, RF-52, RF-58–RF-60, RF-68–RF-70, RF-75–RF-80 |
| `inventory/providers/inventory-session-scope.tsx` | Cancelar y retirar únicamente las consultas de Inventario de la sesión abandonada; contener sus efectos de acceso. | RF-4, RF-58–RF-60, RF-69, RF-72, RF-75–RF-76 |
| `inventory/utils/inventory-list-url-state.ts`, `inventory-return-to.ts` | Defaults, criterios, traducción a parámetros remotos, serialización canónica y validación estricta del origen. | RF-19–RF-22, RF-27–RF-44, RF-47–RF-54, RF-74 |
| `inventory/utils/inventory-api-errors.ts`, `format-stock-movement.ts` | Clasificación segura de errores, etiquetas, cantidades y fecha UTC. | RF-9–RF-18, RF-24, RF-58–RF-59, RF-68–RF-70, RF-75–RF-77 |
| `inventory/pages/inventory-list.page.tsx`, `components/inventory-filters.tsx`, `inventory-table.tsx` | Componer consulta, controles, tabla y feedback; edición mediante enlace construido por la composición. | RF-5–RF-44, RF-45–RF-46, RF-61–RF-65, RF-72–RF-74 |
| `inventory/components/stock-status-badge.tsx`, `latest-stock-movement.tsx` | Etiquetas de estado y celda autónoma con carga/error/reintento/ausencia de movimiento. | RF-9–RF-18, RF-63–RF-64, RF-68–RF-70, RF-78–RF-80 |
| API pública y edición de `features/products` | Admitir política de navegación inyectada; conservar formulario, guard y payload; emitir confirmación de éxito ligada a sesión/destino. | RF-45–RF-55, RF-57, RF-60, RF-71–RF-73 |
| `shared/api/generated/inventory-contracts.ts`, snapshots y scripts de contratos | Contratos HTTP reproducibles derivados del OpenAPI; no modelos duplicados a mano. | RF-5–RF-18, RF-29, RF-36, RF-77 |
| `tests/inventory`, regresiones de Productos/App Shell y `tests/browser` | Evidencia automática y manual trazable, incluidos harnesses solo de desarrollo. | RF-1–RF-80; NFR-1–NFR-10 |

Cada componente visual nuevo importa CSS co-localizado con tokens del Design System. No se agregan selectores específicos a `shared/ui/styles.css`. Los tipos generados permanecen en `shared/api/generated`; el transporte de negocio en la feature.

## Modelo de datos y contratos

### Inventario

Tipos HTTP derivados de los componentes y operaciones OpenAPI. `Inventory` contiene `productUuid`, `sku`, `name`, `categoryUuid` nullable, `isActive`, `quantity`, `minimumStock`, `status` y `updatedAt`. La tabla se identifica por `productUuid`, no por índice. No es necesario mostrar categoría ni fecha de actualización para poder ordenar por el campo contractual `updatedAt`.

`GET /inventory` devuelve `{ data: Inventory[], pagination: { total, page, limit } }`. El frontend envía explícitamente los defaults aprobados, sin depender de que coincidan con los defaults del servidor.

| Estado de URL / UI | Parámetro HTTP | Regla |
| --- | --- | --- |
| `page` | `page` | Entero positivo seguro; defecto 1. |
| Tamaño fijo, no editable | `limit=15` | No introducir selector de tamaño. |
| `search` | `search` | Trim; omitir si vacío; no filtrar solo la página local. |
| `status=active|inactive` | `isActive=true|false` | Defecto active. No confundir actividad con existencias. |
| `stockStatus=all|IN_STOCK|LOW_STOCK|OUT_OF_STOCK` | `status` | Defecto all; omitir HTTP status si all. |
| `sort` | `sort` | `name`, `sku`, `quantity`, `minimumStock`, `updatedAt`; defecto name. |
| `order` | `order` | asc/desc; defecto asc. |

URL canónica: `/inventory?page=1&status=active&stockStatus=all&sort=name&order=asc`, añadiendo `search` solo cuando corresponda. Los valores duplicados de un criterio se normalizan a su default; los desconocidos no se reenvían a la API. La normalización del listado y la corrección por total utilizan replace. Los cambios deliberados de criterios usan navegación ordinaria y página 1; cambiar de página o recorrer historial no reinicia otros criterios.

Los parsers comprueban la respuesta completa antes de producir filas: UUID, campos obligatorios, booleanos, fechas, enums, cantidades enteras no negativas y paginación válida. Comprueban coherencia de `status` con cantidad/mínimo según RF-10; una incoherencia es error contractual, no permiso para corregir silenciosamente lo recibido. No se sustituye un dato ausente por cero. Un registro inválido invalida el listado entero (RF-13, RF-66–RF-67, RF-77).

### Último movimiento

`GET /inventory/{productUuid}/movements?page=1&limit=1`, sin filtros por tipo, fecha o referencia. Se conserva el orden contractual del backend; el frontend no calcula el último por fecha de actualización de inventario ni compara páginas descargadas.

Respuesta: `{ data: StockMovement[], pagination: { total, page, limit } }`. Cada movimiento contiene `uuid`, `productUuid`, `type`, `quantity`, `previousStock`, `newStock`, `reason`, `reference`, `createdAt`. No se duplica un esquema manual idéntico al generado; se añade validación runtime compatible con ese tipo.

- Validar el contenedor, campos y fecha, la pertenencia al producto consultado y el límite solicitado. Un vacío solo representa ausencia si la paginación es coherente con total cero; vacío con total positivo es error contractual.
- Resultado de feature: movimiento válido o ausencia confirmada. Carga, errores y refetch se mantienen como estados de la query, no como movimientos ficticios.
- `IN` → Entrada; `OUT` → Salida; `ADJUSTMENT` → Ajuste. Mostrar «Cantidad» en entradas/salidas y «Existencia resultante» en ajustes; no anteponer un signo que transforme el significado contractual.
- Formatear `createdAt` con locale español y `timeZone: "UTC"`, etiqueta UTC y elemento `time` con el valor original. Probar fechas que cambien de día en otra zona. No usar `updatedAt` como sustituto.
- Un resultado inválido afecta solo a esa celda. No deriva datos de inventario de `previousStock`/`newStock`, ya que ambas consultas no son un snapshot atómico.

### Contratos generados

Prever `tests/contracts/inventory.openapi.json` y `src/shared/api/generated/inventory-contracts.ts`. Añadir una captura equivalente a `scripts/snapshot-categories-openapi.mjs` sobre el helper `snapshot-openapi.mjs`, seleccionando `/inventory` y `/inventory/{productUuid}/movements` con sus referencias. El snapshot de la segunda ruta puede describir también operaciones de escritura existentes; eso no autoriza wrappers ni UI de escritura.

Añadir los scripts propuestos `snapshot:inventory-openapi` y `generate:inventory-contracts` siguiendo las convenciones existentes. No existen todavía y no se presentan como comandos ejecutados. La generación utilizará la dependencia fijada `openapi-typescript`; las pruebas contrastarán métodos, parámetros y esquemas con la captura. No se incluyen rutas de mínimos, entradas, salidas ni ajustes como capacidades consumidas.

### Errores observables

| Causa | Listado | Último movimiento | Recuperación |
| --- | --- | --- | --- |
| Red/timeout o 5xx | Error identificable sin presentar otro criterio como vigente. | «No se pudo consultar»; existencias válidas visibles. | Retry manual del GET que falló; conservar criterios. |
| Contrato 2xx inválido | Error de listado completo sin filas parciales. | «No se pudo consultar» sin borrar existencias. | Celda permite retry de su GET; nunca escritura. |
| 401 | Solicitar comprobación de Auth. | Mismo flujo de sesión. | Sin retry directo mientras se comprueba; aplicar `SessionBoundary`. |
| 403 | Acceso no permitido. | Acceso no permitido en el dato afectado; no ocultar existencias válidas por ese fallo aislado. | Sin retry directo de esa consulta. |
| 404 de movimiento tras desaparecer producto | Error independiente; no equivale a «Sin movimientos». | «No se pudo consultar». | No inventar stock ni atribuir ausencia confirmada de movimientos. |
| Fallo de lectura tras PATCH confirmado de producto | Conservar confirmación mientras la sesión solicitante siga vigente. | Mantener separación de errores. | Reintentar solo lectura y aplicar primero las restricciones 401/403. |
| Cancelación o respuesta de sesión anterior | No generar avisos ni sustituir resultados. | No generar avisos ni sustituir resultados. | Descartar efectos anteriores. |

La clasificación utiliza estado HTTP y errores normalizados, nunca mensajes privados. No mostrar ni registrar cuerpos crudos, stack, tokens, cookies ni credenciales. El plan no añade reintentos para causas no habilitadas por la spec; los 404 independientes no introducen nuevos flujos de modificación.

## Decisiones técnicas

### 1. Una vista operativa coherente con las existentes

- Elegida: modo Operate. Objetivo: localizar un producto, interpretar cantidades/estado y abrir su edición sin perder contexto. Cabecera «Inventario», filtros etiquetados, tabla con producto/SKU/cantidad/mínimo/estado de stock/actividad/último movimiento/Editar. Componer `Input`, `Select`, `Button`, `DataTable` y `Badge` propios. `StockStatusBadge` es de Inventario y envuelve `shared/ui/Badge`.
- El último movimiento agrupa fecha UTC, tipo y cantidad; carga y retry son propios de la celda, con nombres accesibles que identifiquen el producto. Un error de celda no sustituye la tabla por un error global. Los anuncios no deben repetir quince mensajes simultáneos innecesarios; resultados globales y reintentos del usuario tienen feedback accesible contextual.
- Mantener tipografía, tokens, foco y patrones de Productos/Categorías. A 360/768 px la tabla desplaza dentro de su región, no el documento. Acciones alcanzables por teclado y scroll; no esconder datos requeridos ni agregar tarjetas/resúmenes o gráficos fuera de alcance.
- Descartada: rediseñar el App Shell o introducir otro Design System. No es necesario para la spec. La documentación de producto de Impeccable contiene contexto histórico de bootstrap; la spec y el código vigente son la autoridad de alcance y patrones, sin actualizar documentos ajenos a esta spec.
- RF cubiertos: RF-1–RF-18, RF-23–RF-26, RF-45–RF-46, RF-61–RF-65, RF-68–RF-70, RF-78–RF-80; NFR-1–NFR-6.

### 2. Dos lecturas separadas; coste acotado por página

- Elegida: GET del listado y una query por `productUuid` de la página visible, montada en `LatestStockMovement`. Como máximo una lectura inicial del listado y quince de último movimiento para una página completa, sin precargar páginas ni historial. TanStack Query deduplica observadores de la misma clave. Retry de una celda no refresca el listado ni otras celdas. La consulta de cada celda termina por el timeout existente.
- Las queries del último movimiento solo se habilitan tras validar las filas del listado y confirmar sesión. No se usa `Promise.all` que haga fallar la tabla por una sola celda. No se bloquea el listado esperando todas las celdas ni se añade una pantalla de historial de Fase 6.
- Descartada: usar la lista global de movimientos y elegir los de la página; no garantiza recuperar el último de cada producto. Descartada: añadir un endpoint agregado al backend en esta fase; está fuera de alcance. El coste de hasta quince consultas adicionales se documenta como riesgo, no como promesa de rendimiento.
- RF cubiertos: RF-14–RF-18, RF-20, RF-68–RF-70, RF-78–RF-80; NFR-7, NFR-9.

### 3. URL como fuente de criterios

- Elegida: parser/serializador de Inventario independientes de los internos de Categorías/Productos, con enums derivados de contratos y tamaño fijo. Borrador local de búsqueda solo hasta envío explícito; al cambiar URL por historial se sincroniza el control con el criterio aplicado. La paginación usa total remoto; no clasifica/busca/ordena solo quince filas locales.
- Corregir página tras recibir total mediante navegación replace, con guard contra correcciones duplicadas; no aplicar el reinicio de RF-38 durante reload, historial o corrección. No mostrar un snapshot de otra clave como resultados del criterio actual.
- Descartada: Zustand o estado de componente como fuente de filtros; impediría reconstruir la consulta compartida y duplicaría ownership.
- RF cubiertos: RF-19–RF-22, RF-25–RF-44, RF-74.

### 4. Caché y efectos delimitados por sesión

- Elegida: claves propuestas `['inventory', 'list', sessionId, params]` y `['inventory', 'latest-movement', sessionId, productUuid]`; `enabled` solo con sesión confirmada. Ambos queryFns pasan `signal` al cliente HTTP y tienen `retry: false`. No copiar catálogo ni sesión a Zustand.
- `InventorySessionScope` se integra por encima del Outlet del ámbito autenticado, usando `useSession`/`isCurrentSession` públicos de Auth. Al cerrar/sustituir sesión cancela y retira solo claves del ámbito antiguo; no limpia otras features ni cancela claves de la nueva sesión. No necesita coordinador de mutaciones ni almacenamiento persistente.
- El tratamiento de 401 verifica que la sesión solicitante sigue vigente y evita lanzar una revalidación por cada celda de la misma tanda; comparte un bloqueo transitorio de comprobación por sesión. Ese bloqueo no es una copia de la sesión: Auth sigue siendo la fuente de verdad. Cuando termina la comprobación prevalece `SessionBoundary`, sin bucles automáticos de GET/401/revalidación.
- `refetchOnMount: "always"` en listado y último movimiento para recuperar lecturas actuales al volver de edición incluso con caché fresh; no introducir polling o refetch por foco. Los callbacks de retorno, avisos y éxito de la edición verifican sesión antes de producir efectos. La misma restricción se aplica al leer marcadores conservados en historial.
- Descartada: confiar solo en abortar HTTP; una respuesta puede haber terminado o una escritura de Productos seguir en el servidor. Deben descartarse también sus efectos tardíos. Descartada: añadir tenant ficticio a las claves; cuando exista multi-tenancy se añadirá el contexto real según la constitución.
- RF cubiertos: RF-4, RF-44, RF-52, RF-58–RF-60, RF-69, RF-72, RF-75–RF-76; NFR-7–NFR-9.

### 5. Edición existente, composición de rutas y retorno seguro

- Elegida: seguir usando `/products/:uuid/edit?returnTo=...`. Ampliar la API pública de Productos con un contrato opcional de integración de navegación y un constructor público de enlace de edición. La composición de `src/app/router/product-edit-route.tsx` importa solo APIs públicas de Productos e Inventario; valida el candidato y suministra a la edición un destino ya validado y la política de confirmación correspondiente.
- Inventario recibe mediante props desde la composición la función necesaria para construir el enlace Editar. Productos no importa Inventario, Inventario no importa los internos de Productos y no se forma una dependencia circular. Si no hay integración válida, `ProductEditPage` mantiene su resolver actual y defaults de Productos; las pruebas y consumidores existentes que montan la página sin props siguen funcionando.
- La política se recalcula al montar desde `returnTo`, por lo que sobrevive a reload o entrada directa. Solo acepta pathname exacto `/inventory` con criterios válidos y únicos. Rechazar origen externo, `//`, barras inversas, caracteres de control, fragmentos, rutas codificadas que eludan la validación, claves desconocidas y parámetros `returnTo` duplicados. Los candidatos inválidos vuelven al comportamiento de Productos, no a una ruta arbitraria. No usar `navigate(-1)` para Cancelar.
- El destino validado se utiliza en éxito, Cancelar limpio/sucio, UUID inválido, 404 de carga y 404 al guardar. El guard conserva su comportamiento: descarte de Cancelar vuelve al origen; descarte de enlace/Atrás/Adelante continúa al destino intentado. Mantener validación de precios/SKU/categoría, categoría original, modo readonly de 404, bloqueo de campos/envíos/salida durante PATCH y prioridad de sesión.
- Reconsultar Inventario al volver cubre productos renombrados o que dejen de coincidir y páginas fuera de rango; no insertar manualmente la fila editada en los criterios antiguos. Los payloads de Productos no incorporan `quantity` ni `minimumStock`.
- Descartada: duplicar `ProductEditForm` en Inventario o aceptar cualquier URL interna como retorno; lo primero diverge de Spec 004 y lo segundo amplía destinos sin validación. Descartada: que Productos importe parsers internos de Inventario.
- RF cubiertos: RF-45–RF-57, RF-71, RF-74; NFR-10.

### 6. Éxito de escritura separado de la lectura posterior

- Elegida: al confirmar un PATCH válido y conservarse la sesión, la integración de navegación transmite solo metadata de confirmación en `location.state`: tipo de operación, sesión solicitante y destino canónico. No transmite campos de producto, tokens ni respuestas del servidor. Inventario valida la metadata y muestra «Producto actualizado correctamente.» aunque falle su GET, con retry exclusivo de consulta cuando corresponda.
- El marcador se conserva durante normalizaciones y correcciones replace de la misma consulta; se ignora al cambiar sesión o contexto de consulta ajeno. El guard se desactiva únicamente ante escritura confirmada, como en Productos. Un estado de navegación no se interpreta como nueva escritura ni provoca otro PATCH. El mensaje del backend nunca se utiliza como contenido del marcador.
- La integración de navegación no cambia el éxito/retorno predeterminado de Productos. Si se pierde sesión prevalece la presentación de acceso y no se restaura una confirmación antigua. HTTP 403 conserva el éxito válido de la escritura pero no ofrece retry de la lectura denegada; HTTP 401 bloquea retry mientras Auth se comprueba.
- Descartada: un toast temporal como única evidencia de guardado o repetir el PATCH cuando falla el GET. Ambos confunden confirmación de escritura con actualización de lectura.
- RF cubiertos: RF-48, RF-52, RF-55, RF-60, RF-72–RF-76.

## Estrategia de pruebas

Diseñar primero pruebas de contrato y escenarios diferidos, antes de tareas de implementación. Pruebas de features contra la UI propia, nunca internals de PrimeReact. Los rangos de la matriz comprenden todos sus identificadores; ningún RF queda fuera.

| RF | Prueba | Nivel | Evidencia esperada |
| --- | --- | --- | --- |
| RF-1–RF-4 | Navegación y URL directa bajo sesión pending/error/ausente/confirmada. | Integración/E2E | App Shell y listado solo tras Auth; sin llamadas de negocio antes de confirmar sesión. |
| RF-5–RF-12 | Filas con producto, SKU, cantidades, actividad y tres estados; cantidades 0, positivas, iguales/superiores al mínimo. | Contrato/Integración | Valores exactos y textos separados de actividad; cero/mínimo cero es agotado. |
| RF-13 | Un registro incompleto/negativo/fraccionario/estado desconocido o incoherente entre registros válidos. | Unitario/Integración | Error global; cero filas parciales y ningún cero inventado. |
| RF-14–RF-18 | Último IN/OUT/ADJUSTMENT, fecha cruzando día según zona, ausencia confirmada y updatedAt diferente. | Contrato/Integración | UTC explícito, etiquetas españolas, cantidad con semántica correcta; vacío solo tras lectura válida. |
| RF-19–RF-22 | Defaults y página remota de quince filas, total y salto de página. | Contrato/Integración/E2E | GET con parámetros exactos; no paginación local del catálogo. |
| RF-23–RF-26 | Listado diferido, red/5xx, retry, vacío y búsqueda sin coincidencias. | Integración/E2E | Estados accesibles; retry conserva criterios y limpiar búsqueda actúa sobre URL. |
| RF-27–RF-28 | Página fuera de rango con y sin total. | Integración | Última página o 1, sin bucle. |
| RF-29–RF-35 | Búsqueda parcial de SKU/nombre con mayúsculas mixtas, trim/blancos, filtros activos/inactivos y tres estados/todos. | Unitario/Integración | Parámetros remotos exactos y fixture MSW que reproduce la semántica del servidor. |
| RF-36–RF-39 | Cinco campos y dos direcciones, cambio deliberado frente a paginación. | Unitario/Integración | Cambiar criterios reinicia página; paginar conserva criterios. |
| RF-40–RF-43 | URL compartida, recarga, Atrás/Adelante y criterios inválidos/duplicados. | Unitario/Integración/E2E | Controles/resultados restaurados; normalización replace sin historial adicional. |
| RF-44 | Dos consultas diferidas terminan en orden inverso; celda de producto anterior termina después de paginar. | Integración | Solo resultados del criterio/producto vigente. |
| RF-45–RF-46 | Editar desde fila para ADMIN/MANAGER/OPERATOR/VIEWER. | Integración/E2E | Acción visible y ruta existente, sin inferir permisos. |
| RF-47–RF-50 | Editar, guardar, Cancelar limpio/sucio y recargar edición con criterios completos. | Integración/E2E | Retorno seguro a Inventario sin perder filtros/orden/página. |
| RF-51 | UUID inválido, GET 404 y PATCH 404 desde edición originada en Inventario. | Integración/E2E | Retorno de origen, readonly y guard previos conservados; sin GET de UUID inválido. |
| RF-52 | Retorno con caché de Inventario y movimientos fresh, producto renombrado o fuera del filtro. | Integración/E2E | Nuevos GET y resultados actuales, sin insertar fila que no coincide. |
| RF-53–RF-54 | Origen ausente, externo, duplicado, fragmento, ruta malformada y criterios inválidos. | Unitario/Integración | Fallback previo de Productos; ninguna navegación externa ni destino libre. |
| RF-55 | Regresión íntegra de edición de Productos y selección de Categorías. | Integración/E2E | Validación, payload parcial, errores, dirty guard, 404 readonly, pending y acceso conservados. |
| RF-56–RF-57 | Inspeccionar todas las solicitudes del workflow y payload del PATCH de producto. | Contrato/E2E | Solo GET para inventario/movimientos; ninguna escritura de stock/mínimos ni DELETE; PATCH de producto sin esos campos. |
| RF-58–RF-60 | 401/403 en listado/celdas; GET y PATCH de edición diferidos mientras A→B o logout. | Integración/E2E | Auth revalidado sin tormenta, acceso correcto, ninguna caché/alerta/URL/foco/confirmación heredada. |
| RF-61–RF-65 | Teclado, nombres, estados sin solo color, anuncios, foco de página y retry por producto. | Integración/E2E/Manual | Workflow operable; foco no robado por respuestas de celdas; revisión humana explícita. |
| RF-66–RF-67 | Fixture con producto sin inventario y producto con stock cero real. | Contrato/Integración | Se presentan solo registros devueltos; no unir con catálogo ni crear filas/stock artificiales. |
| RF-68–RF-70 | Movimiento con red/5xx, JSON inválido, fecha/tipo/cantidad inválidos, UUID de otro producto y vacío contradictorio. | Contrato/Integración/E2E | Error solo de celda, existencias intactas y retry solo de esa lectura cuando habilitado. |
| RF-71 | Descarte al navegar a Inicio y al recorrer historial desde edición. | Integración/E2E | Continúa destino solicitado, no Cancelar implícito a Inventario. |
| RF-72–RF-73 | PATCH válido seguido de GET 503/401/403, retry, cambio de sesión y navegación con marcador antiguo. | Integración/E2E | Éxito solo de sesión vigente; un PATCH; retry solo GET, excluido durante Auth o por permisos. |
| RF-74 | Corrección por total tras edición y Atrás/Adelante. | Integración/E2E | Entrada corregida reemplazada; no reaparece la página inválida. |
| RF-75–RF-76 | 401 simultáneos de celdas, Auth diferido y 403 de listado/celda, incluso tras guardado confirmado. | Integración | Sin retry directo excluido ni bucle de consultas/revalidación. |
| RF-77 | Cero y enteros no negativos, negativos, fracciones y valores no finitos en parsers. | Unitario/Contrato | Aceptación/rechazo según contrato y spec sin redondeos. |
| RF-78–RF-80 | Inventario válido mientras movimiento queda diferido o se reintenta. | Integración/E2E | Carga local identificable, existencias visibles, sin falso «Sin movimientos». |

### Cobertura no funcional

| NFR | Verificación planificada |
| --- | --- |
| NFR-1 | Playwright a 360/768/1280 px: documento sin overflow, scroll local de tabla, filtros/Editar/retry disponibles y textos largos íntegros. |
| NFR-2 | Labels, teclado, foco, anuncios y contraste contextual; pasada humana con Narrator/Chromium para listado, filtros, edición/retorno y error/retry de movimiento. Registrar responsable, entorno, resultado y barreras corregidas. |
| NFR-3 | Extender `native-zoom` con Inventario y sus acciones/celdas al 200 % real en Chromium visible; registrar métricas y revisión manual. No sustituirlo por viewport equivalente. |
| NFR-4 | Emular movimiento reducido y recorrer filtros, acceso a edición y retry de celda; comprobar transiciones compartidas. |
| NFR-5 | Revisar labels, validaciones heredadas, estados/errores y fecha UTC en español; tipos IN/OUT/ADJUSTMENT no aparecen como únicas etiquetas. |
| NFR-6 | Revisión Impeccable y detector de la UI terminada; comprobar tokens, CSS local, primitivas públicas, contraste y consistencia con Productos/Categorías. |
| NFR-7 | Snapshot OpenAPI, parsers y parámetros; rechazos autoritativos, sin escrituras de stock ni reparación silenciosa de datos inválidos. |
| NFR-8 | Fixtures con centinelas sensibles en errores: ausentes de UI y console de aplicación en listado/movimientos/retorno; sin datos privados en marcadores. |
| NFR-9 | Vitest/MSW y Playwright con Auth/API simulados, catch-all para impedir tráfico real y sin credenciales privadas; fallos independientes reproducibles. |
| NFR-10 | Suite existente de Productos/Categorías, navegación desde Productos y entrada directa a edición sin política inyectada, más nuevos retornos desde Inventario. |

### Integración de evidencia y comandos

- Crear suites en `tests/inventory` para contratos, criterios/URL, parsers, API, queries, tabla, último movimiento y aislamiento de sesión. Extender `tests/products` y `tests/app-shell` sin borrar regresiones previas.
- Incorporar workflow `*.bootstrap-smoke.spec.ts` con fixture MSW de Inventario y montaje mediante `scripts/vite-msw-workflow-test-harness.ts`, solo durante pruebas de desarrollo. Los mocks atienden inventario, movimientos, detalle/edición de Productos y Auth sin backend personal.
- Actualizar expectativas de navegación a Inicio/Productos/Categorías/Inventario en modo compacto y persistente, orden Tab, tooltip colapsado, historial, logout y session boundary. No tocar flujos de autenticación real por inferencia.
- Extender `preview-smoke` para Inventario y retorno desde edición, con GET/PATCH simulados; comprobar exclusión del harness, worker y demo del bundle/servidor de producción y ausencia de negocio contra backend real.
- Ejecutar `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:run` y `pnpm build`. Las suites focalizadas se ejecutarán antes de la regresión completa; probar contratos de wrappers si se modifica su comportamiento.
- Ejecutar `pnpm test:e2e --workers=1`; después, secuencialmente, `pnpm test:e2e --project=design-system --workers=1`, `pnpm test:e2e --project=preview-smoke --workers=1`, `pnpm test:e2e --project=auth-harness --workers=1` y `pnpm test:e2e --project=native-zoom --workers=1`. No lanzar procesos simultáneos que compitan por 5174. El predeterminado ya incluye `proxy-contract`.
- Verificar Markdown con `pnpm exec prettier --check specs/006-inventory/spec.md specs/006-inventory/plan.md` y revisar `git diff --check`. Los Markdown de specs no pertenecen al `format:check` global.
- Las revisiones visuales se harán en una pasada agrupada desktop/mobile, una corrección focalizada y como máximo una confirmación adicional; no un ciclo abierto de pulido. Registrar pruebas humanas y bloqueos sin atribuir a ARIA automático una revisión de lector de pantalla.
- Estos son comandos y verificaciones futuros. No son resultados de cumplimiento ni autorizan implementar antes de aprobar el plan y las tareas.

## Riesgos y dudas abiertas

No hay dudas funcionales pendientes en la spec aprobada. Riesgos técnicos que deben controlarse durante la implementación:

- **Último movimiento no agregado:** hasta quince GET adicionales por página. Medir solicitudes y comprobar deduplicación/cancelación; no resolverlo modificando el backend ni eliminando campos aprobados.
- **Lecturas no atómicas:** cantidades y último movimiento pueden cambiar entre GET. No recalcular existencias desde el movimiento ni prometer sincronización en tiempo real. Un cambio futuro de consistencia requiere `change-manager`.
- **Contrato/OpenAPI:** la captura real debe confirmar rutas, esquemas y orden del listado de movimientos. Si difiere del código inspeccionado, detener la parte afectada; no inventar campos ni defaults del servidor.
- **Permisos de lectura no documentados:** probar 401/403 mediante MSW aunque no figuren en todas las lecturas actuales de OpenAPI. No afirmar que un frontend autenticado añade permisos efectivos al backend.
- **Ciclos entre features:** la composición de navegación pertenece a `app`; los parsers de Inventario y los contratos de integración de Productos se consumen por APIs públicas. Verificar imports con lint y revisión dirigida.
- **Confirmaciones persistentes en historial:** cualquier metadata de éxito debe comprobar sesión y destino; no basta con estar presente en `location.state`. No usar query strings manipulables como prueba de escritura confirmada.
- **Respuestas tardías de Productos:** el éxito y el retorno se emitirán solo si sigue vigente la sesión solicitante. El rechazo o éxito tardío no debe restaurar datos, guards o confirmaciones en otra sesión; las regresiones son obligatorias.
- **Cancelación normalizada como red:** el cliente HTTP existente puede representar abortos como error de red. Las queries canceladas y sus callbacks deben distinguirse por ciclo de vida/sesión para no anunciar fallos espurios; no cambiar globalmente el transporte sin necesidad demostrada.
- **Herramientas y entorno manual:** el zoom requiere escritorio gráfico y el lector de pantalla evidencia humana. Si no están disponibles, registrar bloqueo; no declarar verificados NFR-2/NFR-3 solo por pruebas automáticas.
- **Aviso de bundle:** existe un aviso previo por chunk JS de 1,141.44 kB. Registrar el build real; una optimización general no se incluye en esta fase sin medición y autorización.

El plan queda pendiente de aprobación explícita antes de generar tareas o código.
