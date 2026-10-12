# Plan 003 — App Shell

## Contexto

Este plan desarrolla la Spec 003 aprobada y revisada: 65 requisitos funcionales y 10 no funcionales para la Fase 2 de `docs/ruta.md`. Incluye la identidad pública y el cierre de sesión adelantados expresamente desde la Fase 7. No incorpora login ni funcionalidades de negocio.

Referencias obligatorias: `spec.md`, `docs/constitution.md`, `docs/estructura.md`, `AGENTS.md` y los contratos existentes de Auth y del Design System. La sección Dudas abiertas de la spec no contiene bloqueos de alcance; delega al diseño la composición visual, la modalidad de tablet y el punto de transición. Este plan concreta esas decisiones.

### Base inspeccionada

- La ruta `/` utiliza `BootstrapPage`; todavía no hay layouts de aplicación ni autenticación.
- `features/auth` expone `useSession` y `useAuth`. Better Auth y el plugin Inventory permanecen encapsulados dentro de esa feature.
- El plugin conserva el estado confirmado al recomprobar y expone `isRefetching`. Los fallos de red o HTTP posteriores devuelven un error al solicitante, pero no lo publican como estado reactivo cuando ya existía sesión confirmada. Los errores de contrato sí producen `unconfirmed`.
- El plugin ya descarta respuestas de sesión anteriores a un logout confirmado mediante una versión de operación. Sus pruebas cubren StrictMode y consumidores múltiples.
- `PublicAuthUser` contiene `id`, `email` y `role`; no contiene `name`. El encabezado utilizará el correo recibido, sin inventar un nombre ni cambiar el backend.
- Las once primitivas de Spec 002 están disponibles. `Icon` todavía no incluye los nombres necesarios para Inicio, navegación y logout. No hay Drawer.
- Dialog tiene un contrato propio de retorno del foco; no permite escoger explícitamente todos los destinos que requiere el panel de navegación.
- Vitest, RTL, MSW y Playwright están configurados. Hay suites de bootstrap, contratos, Auth, Design System y preview.
- Las pruebas actuales de Inicio y preview esperan la vista mínima. Preview también espera cero solicitudes API: esa expectativa cambia cuando la aplicación comprueba sesión.

### Flujo de experiencia

Modo de interfaz: **Operate**. La persona debe reconocer Inventory, su identidad y su ubicación; usar los destinos disponibles; ajustar el espacio de trabajo; cerrar sesión. La página Inicio contiene una bienvenida breve, sin tarjetas de métricas ni promesas sobre módulos futuros.

Secuencia: comprobar sesión → mostrar Inicio o página no encontrada dentro del App Shell si hay sesión → permitir navegación y logout → mostrar información de sesión no iniciada tras ausencia confirmada. Un error de comprobación presenta una acción Reintentar, sin confundirse con ausencia de sesión.

## Módulos y responsabilidades

Los nombres siguientes son destinos de implementación previstos, no archivos creados por este plan.

| Módulo | Responsabilidad | RF cubiertos |
| --- | --- | --- |
| `app/router/router.tsx` y `app/router/navigation.ts` | Registrar Inicio y ruta desconocida, mantener historial y URL; catálogo de destinos implementados con Inicio como único enlace inicial. | RF-6–RF-14, RF-29, RF-49 |
| `app/layouts/session-boundary.tsx` | Consumir la API pública de Auth y escoger comprobación, error, ausencia o vista autenticada; conservar la dirección solicitada. | RF-1, RF-11–RF-14, RF-31–RF-40, RF-45, RF-49, RF-54–RF-55, RF-63–RF-65 |
| `app/layouts/app-layout.tsx` y CSS local | Componer encabezado, navegación, enlace de salto y contenido; coordinar foco y modalidad responsive. | RF-1–RF-2, RF-5, RF-15–RF-30, RF-50–RF-53, RF-56–RF-65 |
| `app/layouts/auth-layout.tsx` y `app/components/session-state.tsx` | Presentar comprobación, error con reintento y ausencia de sesión fuera de la navegación de trabajo; encabezado principal y anuncios accesibles. | RF-5, RF-31–RF-32, RF-35–RF-39, RF-54, RF-65 |
| `app/components/app-header.tsx` | Identidad pública, acceso al panel compacto y acción de logout con estados pendiente y error. | RF-2, RF-22, RF-33–RF-34, RF-41–RF-48, RF-51–RF-53 |
| `app/components/app-navigation.tsx` | Enlaces semánticos activos, presentación expandida/contraída, nombres visibles y cierre al seleccionar destino. | RF-6–RF-10, RF-15–RF-17, RF-21–RF-30, RF-51–RF-53, RF-58–RF-59 |
| `app/state/shell-preferences.ts` | Estado de cliente de sidebar, persistencia defensiva y degradación ante almacenamiento no disponible. | RF-18–RF-20, RF-30, RF-57 |
| `app/hooks/use-navigation-focus.ts` | Resolver el foco tras navegación, cierre, cambios de modalidad y sustitución por estados de sesión. | RF-23, RF-27, RF-29, RF-50, RF-58, RF-62–RF-65 |
| `app/pages/home-page.tsx` y `app/pages/not-found-page.tsx` | Bienvenida breve y página no encontrada con retorno a Inicio. | RF-3–RF-5, RF-13–RF-14 |
| `features/auth` mediante su API pública | Exponer la verificación reactiva, operaciones y errores normalizados; mantener sesión autoritativa y evitar respuestas obsoletas. | RF-31–RF-49, RF-55, RF-63–RF-65 |
| `shared/ui/drawer` y ampliación de `shared/ui/icon` | Proporcionar el panel modal genérico y los iconos necesarios detrás de contratos propios. | RF-16–RF-17, RF-22–RF-27, RF-51–RF-53, RF-60–RF-64 |

Las composiciones específicas del shell quedan en `app/components`; no se extraen a `shared/components` sin reutilización demostrada. Las primitivas usan CSS co-localizado. `shared/ui/styles.css` mantiene solo reglas transversales.

## Modelo de datos y contratos

### Sesión y última verificación

Se conservan los contratos HTTP generados y los tipos públicos existentes de Auth. No se crean entidades de usuario o sesión paralelas en Zustand, TanStack Query ni estado local de componentes.

La API pública de `useSession` se ampliará de forma aditiva con metadatos reactivos de la última verificación, propiedad de Auth:

| Campo propuesto | Significado |
| --- | --- |
| `verification.status` | `pending`, `success` o `error` para la comprobación vigente. |
| `verification.error` | Error normalizado de sesión cuando la verificación vigente falla; `null` en los demás estados. |

Estos metadatos no contienen una copia de usuario o sesión. El resultado de cada comprobación y su vigencia se publican en la misma integración encapsulada que ya administra la sesión. La consulta inicial sigue siendo única para los consumidores y StrictMode.

Proyección del boundary, en orden de prioridad:

| Condición | Vista |
| --- | --- |
| Verificación pendiente | Comprobación de sesión; sin contenido autenticado. |
| Verificación fallida o sesión `unconfirmed` | Error de sesión con Reintentar; sin contenido autenticado. |
| Ausencia confirmada | Información de sesión no iniciada, incluso en una URL desconocida. |
| Verificación exitosa y sesión autenticada | App Shell con la página correspondiente a la URL. |

Un `401` de consulta de sesión es ausencia confirmada, no error técnico. La recepción de `204` en logout establece ausencia confirmada e invalida verificaciones anteriores. Un fallo de logout no restaura una instantánea antigua ni borra el resultado de una comprobación concurrente.

El estado confirmado retenido por el plugin sigue disponible para consumidores existentes; el boundary usa además la verificación para cumplir el ocultamiento estricto de Spec 003. Un error de recomprobación no puede quedar disponible solo en el valor devuelto por `refetch`, porque la vista necesita observarlo reactivamente.

### Identidad de presentación

El encabezado recibe una etiqueta de identidad, no un objeto de sesión propio. Con el contrato vigente se deriva de `user.email`. El formateador de presentación admite el orden nombre público no vacío → correo público no vacío → «Usuario», para verificar RF-33 y RF-34 sin relajar el contrato de Auth. Las pruebas de esas ramas son de presentación; una respuesta HTTP incompleta continúa siendo un error de contrato.

Los textos largos se presentan sin desplazar las acciones. Si se recortan visualmente, el texto completo permanece accesible mediante foco o descripción. No se interpreta `role` como permiso ni se muestra un menú de perfil.

### Preferencia de sidebar

- Store Zustand de UI con `sidebarCollapsed: boolean` y una acción de alternancia.
- Persistencia local con clave versionada `inventory.shell.preferences.v1` y contenido limitado a la preferencia.
- Valor predeterminado: `false`, equivalente a expandida.
- Lectura inválida, almacenamiento bloqueado o excepción de escritura: continuar con un store operativo en memoria; no bloquear navegación.
- `compactNavigationOpen` es transitorio y no se persiste. Abrirlo o cerrarlo no altera `sidebarCollapsed`.
- La sesión, la identidad y los errores de Auth nunca entran en ese store.

### Navegación y rutas

Catálogo tipado con identificador, etiqueta, destino e icono propios. Entrada inicial única: Inicio en `/`. Las rutas de desarrollo y los harnesses conservan sus puntos de entrada existentes y no pasan a formar parte del catálogo de trabajo.

Los enlaces usan React Router con semántica nativa de enlace y `aria-current="page"` en coincidencia exacta. La ruta desconocida se resuelve dentro del boundary. No se redirige a una ruta de login inexistente ni se sustituye la dirección solicitada durante comprobación o error.

### Drawer propio

Contrato previsto: `open`, `title`, `children`, `onCloseRequest` y un resolvedor de destino de foco al terminar el cierre. El consumidor elige el destino; Drawer ejecuta el traslado después de retirar la modalidad y restaurar la interacción exterior.

La primitiva ofrece nombre accesible, botón de cierre, Escape, cierre por fondo, entrada y contención del foco, bloqueo de interacción exterior y limpieza al desmontar. Usa PrimeReact exclusivamente dentro de `shared/ui`; no expone sus tipos, eventos ni selectores a los consumidores.

El shell identifica el motivo de cierre antes de iniciarlo:

| Motivo | Destino final de foco |
| --- | --- |
| Cierre manual o selección del destino activo | Control de apertura. |
| Selección de otra página | Encabezado principal de la página mostrada. |
| Cambio a navegación persistente con panel abierto | Enlace activo de sidebar; si no existe, encabezado principal. |
| Sustitución por comprobación, error o ausencia de sesión | Encabezado principal del estado mostrado. |

No se conserva como destino un nodo desmontado. El coordinador consulta el DOM vigente mediante referencias y cancela solicitudes de foco supersedidas. Cada vista objetivo ofrece un encabezado con posibilidad de foco programático, sin introducirlo en el recorrido Tab ordinario.

### Errores observables

| Origen | Respuesta de UI |
| --- | --- |
| Red/timeout en sesión | Error de comprobación en español con Reintentar. |
| HTTP distinto de `401` en sesión | Error de comprobación en español con Reintentar. |
| Respuesta de sesión inválida | Error de comprobación; no mostrar identidad derivada de la respuesta. |
| Fallo de logout con sesión vigente | Error accesible junto a la acción; permitir reintento. |
| Fallo de logout con ausencia confirmada | Mantener pantalla informativa; no ofrecer logout; anunciar el fallo sin restaurar la vista anterior. |
| Almacenamiento no disponible | Preferencia operativa en memoria; no bloquear la aplicación. |

Los mensajes se derivan de `kind` y de códigos/estados normalizados, nunca de interpretar mensajes internos. No se muestran datos sensibles ni se escriben en registros.

## Decisiones técnicas

### 1. Layout persistente y boundary de sesión

- **Elegida:** boundary en la raíz de rutas de trabajo, con AppLayout y Outlet para páginas autenticadas; AuthLayout para comprobación, error y ausencia. Mantener el catálogo de navegación separado de las páginas.
- **Descartada:** duplicar encabezado, sesión y navegación en cada página; generaría divergencias en prioridades y foco. Tampoco se adelanta el formulario de login.
- **RF cubiertos:** RF-1–RF-14, RF-31–RF-40, RF-49, RF-55, RF-65.

### 2. Verificación reactiva dentro de Auth

- **Elegida:** ampliar la API pública con metadatos de verificación, conservando los contratos de sesión previos. Todas las comprobaciones actualizan esos metadatos, incluidas las iniciadas fuera del boundary. Deduplicar comprobaciones simultáneas de la misma generación y descartar sus resultados tras un logout confirmado.
- **Descartada:** guardar la sesión o el resultado de `refetch` en Zustand o en un estado privado del layout; perdería sincronización entre consumidores. Cambiar unilateralmente la semántica histórica de retención de sesión también afectaría a la spec de bootstrap.
- **RF cubiertos:** RF-31–RF-32, RF-38–RF-40, RF-45–RF-49, RF-55, RF-63–RF-65.
- **Compatibilidad:** los campos existentes se conservan; las pruebas de Auth anteriores deben seguir pasando. Una respuesta obsoleta no altera sesión, verificación, errores ni banderas pendientes de otra operación vigente.

### 3. Responsive concreto

- **Elegida:** navegación compacta por debajo de `1024px` y sidebar persistente desde `1024px`. Por tanto, 360 y 768 usan compacto; 1280 usa persistente. Usar una misma consulta de medios para CSS y el coordinador de interacción.
- **Descartada:** elegir modalidad por user agent o conservar dos navegaciones interactivas ocultas solo visualmente; perjudica zoom, cambios de ancho y accesibilidad.
- **RF cubiertos:** RF-15–RF-30, RF-56–RF-64; NFR-1, NFR-3.
- **Presentación:** header y contenido permanecen disponibles; sidebar contraída muestra iconos y nombres mediante Tooltip. La navegación compacta ocupa un panel lateral modal. El área central se adapta sin anchuras mínimas que generen scroll horizontal de página.

### 4. Drawer genérico con retorno explícito del foco

- **Elegida:** añadir solo la primitiva Drawer necesaria para esta fase, con foco de salida definido por el consumidor. Mantener las obligaciones genéricas de modalidad dentro de `shared/ui`.
- **Descartada:** usar Dialog sin cambios, pues su retorno automático puede competir con RF-62 y RF-65; duplicar la modalidad dentro del componente de app vulneraría la responsabilidad transversal del Design System.
- **RF cubiertos:** RF-22–RF-27, RF-51–RF-53, RF-58, RF-60–RF-65.
- **Reutilización:** extraer utilidades internas de modalidad desde Dialog únicamente si realmente las comparten ambas primitivas; mantener el contrato y las pruebas de Dialog existentes.

### 5. Ownership de UI y persistencia defensiva

- **Elegida:** Zustand para preferencias del shell, almacenamiento protegido ante errores y estado temporal del panel separado de la preferencia persistida. Restaurar la preferencia antes de presentar la navegación persistente.
- **Descartada:** guardar la preferencia en URL o backend; no es estado navegable y la spec limita la persistencia al mismo navegador. No se persiste apertura del panel móvil.
- **RF cubiertos:** RF-18–RF-21, RF-30, RF-57; NFR-7.

### 6. Composición visual sobre el Design System existente

- **Elegida:** conservar tokens e identidad visual existentes; Inicio con un encabezado y un texto breve, identidad en header y logout explícito sin menú adicional. Ampliar Icon con `home`, `menu` y `logout`; reutilizar los iconos anterior/siguiente para alternar sidebar cuando proceda. Usar Button, Tooltip y estados de carga accesibles propios.
- **Descartada:** crear dashboard, logo, paleta o una biblioteca anticipada de componentes; no hay contenido real ni reutilización que lo justifique.
- **RF cubiertos:** RF-2–RF-5, RF-16–RF-17, RF-22, RF-33–RF-34, RF-41–RF-44, RF-50–RF-54; NFR-2–NFR-6.
- **Proceso:** antes de implementar las vistas, revisar la composición con Impeccable y el contexto vigente de producto. Revisar escritorio y móvil en una pasada agrupada, corregir defectos y confirmar el resultado en una segunda pasada acotada. La evidencia de lector de pantalla requiere una comprobación humana; no se infiere de capturas ni de ARIA.

## Estrategia de pruebas

Las pruebas se diseñan alrededor de resultados de usuario y contratos públicos. MSW simula Auth en integración; Playwright intercepta las rutas HTTP de Auth con respuestas ficticias en navegador. No se añade una ruta de login o un harness de negocio a producción para probar el shell.

### Matriz de cobertura funcional

| RF | Prueba | Nivel | Evidencia esperada |
| --- | --- | --- | --- |
| RF-1–RF-5 | Sesión válida muestra regiones, Inventory, bienvenida y un encabezado principal; sin métricas ficticias. | Integración y E2E | Roles accesibles y contenido esperado en Inicio. |
| RF-6–RF-8 | Catálogo y navegación contienen solo Inicio; demo y harnesses quedan fuera. | Integración y E2E | Un único destino de trabajo inicial. |
| RF-9–RF-10 | Volver a Inicio desde URL desconocida activa su enlace y presenta la bienvenida. | Integración y E2E | URL y `aria-current` correctos. |
| RF-11–RF-12 | Recarga directa, Atrás y Adelante entre Inicio y dirección desconocida. | E2E | Destino conservado sin enlaces futuros artificiales. |
| RF-13–RF-14 | Dirección desconocida autenticada muestra error y retorno; sin sesión muestra información. | Integración y E2E | Prioridad de sesión y navegación de retorno correctas. |
| RF-15–RF-17 | Alternar sidebar; recorrer enlaces contraídos con teclado y puntero. | Integración, E2E y manual | Controles operativos, nombre accesible y Tooltip visible. |
| RF-18–RF-20 | Preferencia sobrevive recarga y página nueva en el mismo contexto; valor inválido y fallos de lectura/escritura. | Unitario, integración y E2E | Persistencia válida o funcionamiento en memoria sin excepción. |
| RF-21–RF-23 | En compacto, panel inicialmente cerrado; abrir y comprobar entrada del foco. | E2E | Panel nombrado y foco interior. |
| RF-24–RF-25 | Tab y Mayús+Tab; intento de interactuar con contenido exterior. | Contrato Drawer y E2E | Foco contenido y exterior no interactivo. |
| RF-26–RF-27 | Cierre por botón, Escape y fondo exterior. | Contrato Drawer y E2E | Panel retirado, bloqueo limpio y foco en activador. |
| RF-28–RF-29 | Desde página no encontrada seleccionar Inicio en compacto. | Integración y E2E | Panel cerrado y foco en encabezado de Inicio. |
| RF-30 | Aperturas, cierres y cambios responsive tras guardar preferencia. | Integración y E2E | Preferencia intacta al volver a persistente. |
| RF-31–RF-32 | Retener respuesta inicial y posterior de sesión. | Auth, integración y E2E | Comprobación visible; identidad y contenido autenticado ausentes. |
| RF-33–RF-34 | Formateador con nombre, correo y ausencia de ambos; contrato real con correo y texto largo. | Unitario e integración | Precedencia y fallback sin aceptar respuestas HTTP inválidas. |
| RF-35–RF-37 | Sesión `401` en Inicio y URL desconocida. | Integración y E2E | Layout informativo sin navegación de trabajo ni login. |
| RF-38–RF-39 | Error inicial/posterior de red, HTTP y contrato; activar Reintentar. | Auth, integración y E2E | Error distinguible y nueva comprobación sin contenido retenido visible. |
| RF-40 | Recomprobación `401` después de sesión válida. | Auth, integración y E2E | Retirada de identidad y presentación autenticada. |
| RF-41–RF-42 | Activar logout desde header. | Integración y E2E | Acción accesible y una solicitud al contrato existente. |
| RF-43–RF-44 | Mantener logout pendiente y activarlo repetidamente. | Integración y E2E | Indicador pendiente y ausencia de solicitudes duplicadas. |
| RF-45–RF-46 | Logout `204`; fallo con sesión vigente; fallo concurrente con consulta `401`. | Auth, integración y E2E | Vista informativa tras éxito/ausencia; conservación solo con sesión vigente. |
| RF-47–RF-48 | Fallo anunciado; reintento disponible solo con sesión autenticada confirmada. | Integración, E2E y lector de pantalla | Mensaje accesible y disponibilidad condicionada. |
| RF-49 | Atrás después de logout; respuesta de sesión antigua posterior al `204`. | Auth y E2E | La sesión cerrada no recupera contenido autenticado. |
| RF-50–RF-53 | Enlace de salto, todos los controles por teclado, foco visible y estados de expansión. | Integración, E2E y manual | Orden y destino del foco correctos; nombres y estados anunciables. |
| RF-54 | Comprobación y errores iniciales/posteriores. | Integración y lector de pantalla | Anuncios comprensibles; ARIA por sí solo no cierra la evidencia auditiva. |
| RF-55 | Reintento exitoso después de una recomprobación fallida. | Auth, integración y E2E | Recuperación de App Shell en la dirección conservada. |
| RF-56–RF-57 | Anchos 360 y 1280, preferencia expandida/contraída. | E2E | Modalidad exigida y preferencia aplicada. |
| RF-58–RF-59 | Elegir Inicio desde panel estando ya en Inicio. | E2E | Foco en activador, misma URL y sin nueva navegación de documento. |
| RF-60–RF-62 | Pasar de compacto abierto a persistente en Inicio y página no encontrada. | Contrato Drawer y E2E | Sin panel/bloqueo; foco en enlace activo o encabezado alternativo. |
| RF-63–RF-65 | Con panel abierto, recomprobación pendiente, error y ausencia de sesión. | Integración y E2E | Panel cerrado, exterior desbloqueado y foco en encabezado del estado. |

### Cobertura no funcional

| Requisito | Evidencia prevista |
| --- | --- |
| NFR-1 | E2E a 360, 768 y 1280; transiciones alrededor de 1024; comparar ancho de documento con viewport y comprobar acceso a acciones. |
| NFR-2 | Revisión de semántica, contraste, orden de foco, panel modal y teclado; checklist de WCAG 2.2 AA aplicable con evidencia manual. |
| NFR-3 | Revisión manual con zoom real al 200 %, además de E2E a viewport reducido; no sustituir zoom del navegador por una transformación CSS. |
| NFR-4 | Emulación de movimiento reducido y revisión de apertura, cierre y cambios de sidebar. |
| NFR-5 | Comprobar etiquetas y errores españoles, sin mostrar mensajes internos de Auth en inglés. |
| NFR-6 | Revisión Impeccable y de CSS local/tokens; límites de imports mediante lint. |
| NFR-7 | Inspeccionar contenido persistido: únicamente la preferencia de sidebar. |
| NFR-8 | Fixtures ficticias y revisión de errores, registros y bundle; conservar exclusión de credenciales y harnesses de producción. |
| NFR-9 | Integración del boundary con Auth y pruebas de resultados obsoletos/concurrentes. |
| NFR-10 | Suites simuladas ejecutables sin backend ni credenciales privadas. |

### Integración con las suites existentes

- Crear cobertura de App Shell en `tests/app-shell` y `tests/browser/app-shell.bootstrap-smoke.spec.ts`, incorporada al proyecto predeterminado `bootstrap-smoke` por su patrón actual. Usar fixtures por test con respuestas Auth y cookies ficticias cuando sean necesarias.
- Ampliar pruebas del plugin, concurrencia y API pública de Auth para verificación reactiva, deduplicación y resultados obsoletos; conservar las garantías anteriores de retención del estado confirmado.
- Añadir pruebas de contrato de Drawer e Icon, sin consultar clases internas de PrimeReact desde pruebas del shell.
- Actualizar `app-bootstrap.test.tsx`, `inventory.bootstrap-smoke.spec.ts` y preview-smoke: Inicio pasa a depender de sesión. Simular explícitamente Auth en el navegador; verificar ausencia de llamadas de negocio, no ausencia de toda llamada API.
- Mantener la inspección del bundle de preview y la exclusión de demo/harnesses. Las rutas desconocidas de desarrollo siguen sin ofrecer dichas herramientas en producción.
- No ampliar auth-real ni usar una cuenta privada como requisito de cierre de App Shell. Ejecutar regresión simulada de Auth y su harness; las pruebas reales siguen siendo opt-in según README.

### Comandos y evidencia de implementación

Al implementar, ejecutar `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:run`, `pnpm build` y `pnpm test:e2e`. Ejecutar también `pnpm test:e2e --project=design-system`, `pnpm test:e2e --project=preview-smoke` y `pnpm test:e2e --project=auth-harness` por los cambios previstos en primitivas, entrada de producción y Auth.

Los proyectos E2E se ejecutan secuencialmente: sus servidores comparten el puerto estricto 5174. `pnpm format:check` no incluye Markdown; verificar los documentos de esta spec con Prettier focalizado.

Registrar durante el cierre las pruebas y resultados por RF, revisión responsive/zoom y confirmación con lector de pantalla en documentos de evidencia dentro de `specs/003-app-shell`. No marcar un RF satisfecho solo por tener una prueba planificada. Las capturas de la revisión utilizarán identidad ficticia.

## Riesgos y dudas abiertas

- **No hay dudas de alcance pendientes.** El umbral de 1024 y la modalidad compacta a 768 concretan decisiones de diseño delegadas por la spec; requieren aprobación de este plan.
- **Metadatos de verificación:** el plugin actual no publica errores posteriores de red/HTTP cuando conserva sesión. La ampliación aditiva y sus pruebas son necesarias; no puede resolverse solo en la vista con `isPending`.
- **Foco y salida del panel:** transiciones y desmontajes pueden competir con retorno automático del foco. Drawer debe tener un único responsable de salida y usar el destino actualizado tras retirar la modalidad.
- **Concurrencia Auth:** respuestas anteriores a logout y consultas simultáneas no pueden sobrescribir una ausencia confirmada ni eliminar el estado pendiente de otra generación. Probarlo antes de integrar las vistas.
- **Identidad:** el backend actual no proporciona nombre. RF-33 se cumple con correo; RF-34 se verifica como fallback de presentación sin admitir como autenticada una respuesta fuera del contrato.
- **Migración de smoke tests:** dejar las expectativas antiguas de vista estática/cero API produciría fallos que no corresponden al nuevo contrato de Inicio. Actualizarlas conservando las comprobaciones de exclusión de recursos de desarrollo.
- **Revisión humana:** lector de pantalla, zoom real y contraste requieren evidencia al implementar; no están verificados por la redacción del plan.
- **Dependencias:** usar las versiones fijadas y los providers actuales. No se prevén nuevas dependencias ni cambios de backend, contratos HTTP, permisos o gestión de organizaciones.

Este documento define la estrategia. Su aprobación precede a la generación de `tasks.md` y a cualquier implementación.
