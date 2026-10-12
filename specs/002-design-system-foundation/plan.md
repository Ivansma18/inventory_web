# Plan 002 - Design System Foundation

## Contexto

Implementar la Spec 002 aprobada, RF-1–RF-96, dentro de la Fase 1 de `docs/ruta.md`. Son referencias obligatorias `docs/constitution.md`, `docs/estructura.md`, `AGENTS.md` y la spec. El bootstrap existente se conserva como base de providers, configuración, pruebas y fronteras de imports.

La entrega comprende Button, Icon, Input, Textarea, Select, Dialog, DataTable, Badge, Toast, Tooltip y Skeleton con API propia, más una demostración exclusiva de desarrollo. No incluye App Shell, pantallas de negocio, consultas HTTP, autorización, nuevas funciones de Auth ni una biblioteca completa de variantes. Este documento define cómo implementarlas; no crea componentes ni tareas.

### Contexto técnico comprobado

- El manifiesto fija React `19.3.0`, TypeScript `5.9.3`, Vite `8.3.2`, PrimeReact `10.9.7`, PrimeIcons `8.0.2` y Tailwind `4.3.3`; Node `24.21.0` y pnpm `12.8.1` siguen siendo el entorno del proyecto.
- `src/shared/ui` solo contiene el provider, el barrel público y estilos. No existen las once primitivas. El provider encapsula PrimeReact y los estilos cargan Lara light blue y PrimeIcons junto a Tailwind sin preflight.
- El router de aplicación solo presenta el bootstrap en `/`. Vite usa `localhost:5174` con puerto estricto; existen plugins de harness exclusivos de desarrollo que no participan en el build.
- Vitest/jsdom/Testing Library y Playwright Chromium ya están configurados. ESLint protege UI, Auth, transporte y fronteras entre features. La suite existente incluye 111 pruebas; es evidencia de la fase anterior, no cobertura de estas primitivas.
- Se consultó Context7 sobre DataTable controlada/lazy, Dialog, Tooltip y Skeleton. La documentación recuperada describe APIs actuales y no garantiza identidad con PrimeReact 10. Los tipos y comportamiento instalados de `10.9.7` deben contrastarse antes de usar una opción. Por ejemplo, los tipos locales de Dialog tienen `focusOnShow`, pero no una prop pública `focusTrap`.
- Impeccable context se ejecutó contra los estilos existentes: no encontró `PRODUCT.md` ni `DESIGN.md`. La dirección visual se definirá antes de la implementación UI; esta planificación no inventa una autoridad visual ni escribe esos documentos fuera del directorio permitido.

## Módulos y responsabilidades

Las rutas siguientes son destinos previstos, no archivos ya implementados. Cada componente tiene un archivo kebab-case en su carpeta y tipos propios junto a él; se exporta únicamente lo necesario desde `src/shared/ui/index.ts`.

| Módulo                                                                           | Responsabilidad                                                                           | RF cubiertos                                                                   |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/shared/ui/styles.css`, `tokens.css` y estilos de componentes                | Escalas compartidas, tema, foco, contraste, movimiento reducido y responsive.             | RF-2; requisitos no funcionales                                                |
| `src/shared/ui/button/`, `icon/`                                                 | Activación, carga, controles de icono y semántica decorativa/informativa.                 | RF-3–RF-13, RF-71                                                              |
| `src/shared/ui/input/`, `textarea/`                                              | Valores, etiquetas, ayuda/error, disabled/readOnly y tipos válidos.                       | RF-3, RF-4, RF-14–RF-21, RF-72, RF-93, RF-95                                   |
| `src/shared/ui/select/`                                                          | Selección simple, opción vacía, teclado e invalidación de selección.                      | RF-3, RF-4, RF-22–RF-29, RF-89–RF-91                                           |
| `src/shared/ui/dialog/`                                                          | Modalidad, cierre controlado, contenido alto y ciclo completo de foco.                    | RF-4, RF-30–RF-36, RF-82–RF-85, RF-96                                          |
| `src/shared/ui/data-table/`                                                      | Tabla controlada, estados, solicitudes de página/orden y overflow.                        | RF-37–RF-47, RF-73–RF-81, RF-94                                                |
| `src/shared/ui/badge/`                                                           | Etiqueta textual y tono semántico sin significado dependiente solo del color.             | RF-48, RF-49                                                                   |
| `src/shared/ui/toast/`, provider UI                                              | API de avisos, cola efímera, cierre, anuncios y temporizadores pausables.                 | RF-4, RF-50–RF-55                                                              |
| `src/shared/ui/tooltip/`                                                         | Descripción accesible, hover/foco y precedencia de Escape.                                | RF-56–RF-60, RF-86–RF-88                                                       |
| `src/shared/ui/skeleton/`                                                        | Formas decorativas y anuncio de carga no enfocable.                                       | RF-61–RF-63, RF-92                                                             |
| `src/shared/ui/index.ts`                                                         | Exportación de once primitivas y contratos propios; sin tipos vendor.                     | RF-1; requisitos no funcionales                                                |
| `src/dev/design-system/`, `scripts/vite-design-system-demo.ts`, `vite.config.ts` | Demostración separada del grafo de producción, datos ficticios y controles de escenarios. | RF-64–RF-70                                                                    |
| `tests/ui/`, `tests/types/` y verificador de tipos de UI                         | Contratos públicos, interacción y fixtures positivas/negativas.                           | RF-1–RF-96 según matriz                                                        |
| `tests/browser/`, `playwright.config.ts`, runner y smoke de preview              | Workflows reales de teclado/foco, responsive y exclusión de demo.                         | RF-2, RF-25, RF-30–RF-36, RF-46, RF-47, RF-54, RF-56–RF-70, RF-82–RF-88, RF-96 |

Helpers de foco o identificación se mantienen privados y locales al componente hasta demostrar reutilización. No se crean capas ni features vacías. La demo importa el barrel público; no importa PrimeReact, clases PrimeIcons ni internos de componentes.

## Modelo de datos y contratos

### Principios de API

- Props explícitas propias; no extender props vendor, reexportar eventos vendor ni admitir un spread genérico que permita activar opciones fuera de alcance.
- Tipos de React/DOM necesarios, como `ReactNode`, referencias a elementos nativos y eventos de formulario, sí pueden formar parte del contrato propio. Ningún método imperativo de PrimeReact se expone.
- Controles de valores usan `value` y callbacks propios. Ref y blur permiten futura integración con React Hook Form sin introducir un formulario de negocio ni un store de valores del Design System.
- `id`, nombre accesible, ayuda/error y atributos de formulario indispensables se seleccionan explícitamente. Los IDs automáticos son estables entre renders; ayuda y error pueden coexistir en la descripción accesible.
- Los consumidores suministran datos y estado confirmado. El wrapper comunica intenciones; no decide autorización, no llama HTTP y no almacena datos en TanStack Query o Zustand.

### Contratos por primitiva

| Primitiva | Entradas propias previstas                                                                                                                                                      | Salida y comportamiento                                                                                                                                                                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Button    | Texto o icono, `accessibleLabel`, `disabled`, `loading`, `type: button/submit`, `onClick`; variante primaria/secundaria para jerarquía.                                         | `button` por defecto; submit explícito. La variante de solo icono requiere label mediante unión de props. Loading impide nuevas activaciones.                                                                      |
| Icon      | `name: IconName` de un catálogo cerrado, tamaño acotado y unión `decorative`/`label`.                                                                                           | Mapeo interno a PrimeIcons; decorativo oculto a AT, informativo con nombre accesible. Catálogo inicial ligado a acciones reales de la demo: add, close, info, success, warning, error, loading y navegación/orden. |
| Input     | `value: string`, `onValueChange(string)`, tipo cerrado text/email/password/search/tel/url, label/ayuda/error, disabled/readOnly, ref/blur y atributos de formulario necesarios. | Texto por defecto. Tipo inválido en runtime muestra un diagnóstico fijo de configuración y no monta el input. Nunca incluye el valor o el objeto de props en ese diagnóstico.                                      |
| Textarea  | Contrato de texto equivalente a Input, filas visibles y contenido multilinea.                                                                                                   | Emite string sin reglas de negocio; conserva saltos de línea, readOnly y asociaciones accesibles.                                                                                                                  |
| Select    | Opciones `{ value: string, label: string, disabled?: boolean }`, `value: string/null`, callback, label/ayuda/error/disabled.                                                    | `null` significa sin selección; opción vacía interna reservada. No hay filtro ni selección múltiple. Limpiar o invalidar emite `null`. Sin opciones seleccionables, control deshabilitado y mensaje de ausencia.   |
| Dialog    | `open`, título, children/footer, `onCloseRequest()`, tres flags de cierre con default true, `closeBlocked`, `fallbackFocusTarget: () => HTMLElement`.                           | Siempre modal; solicita cierre sin controlar `open`. Guarda activador y devuelve foco según RF-35. El consumidor garantiza que el destino alternativo esté conectado y sea enfocable al finalizar el cierre.       |
| DataTable | Filas genéricas, columnas propias, clave estable de fila, snapshot/estado, página controlada, tamaño fijo, total confirmado, orden controlado y callbacks.                      | Traduce paginación y orden a intenciones propias; no obtiene ni ordena datos por su cuenta. Estado visual y reporte español; overflow local.                                                                       |
| Badge     | `label: string`, tono neutral/success/info/warning/error.                                                                                                                       | Texto siempre disponible; no añade interacción ni comunica un estado solo por color.                                                                                                                               |
| Toast     | `show({ kind, message }) → id`, `dismiss(id)` mediante `useToast` propio dentro de UiProvider.                                                                                  | Avisos locales no persistentes con IDs internos estables. Éxito/info: 5000 ms activos; warning/error: sin vencimiento. Retirar un aviso no afecta otros.                                                           |
| Tooltip   | Texto y referencia a un único elemento nativo asociado; posición limitada a las necesarias.                                                                                     | Descripción vinculada con ID propio sin reemplazar otras descripciones. Visibilidad privada; no acepta botones/enlaces en su contenido.                                                                            |
| Skeleton  | Forma rectángulo/círculo, dimensiones y texto de carga con default español.                                                                                                     | Formas ocultas a AT y sin tab stop; región de estado anuncia carga, sin lista de formas individuales.                                                                                                              |

El conjunto de opciones visuales se limita a necesidades demostradas; no se replica el catálogo vendor. Los tonos semánticos no introducen permisos. Las variantes propuestas son decisiones de presentación del plan, sujetas a la revisión visual de implementación.

### DataTable: ownership y transiciones

- Página pública de base 1 cuando hay datos; la representación vacía es 0 de 0. Se traduce privadamente al offset vendor. Tamaño positivo fijo del consumidor; sin dropdown de tamaño.
- Orden propio: `null` o `{ columnId, direction: asc/desc }`. Una sola columna; asc → desc → null. Activar otra columna ordenable solicita ascendente. La representación cambia cuando el consumidor confirma el nuevo orden.
- Columna propia: `id`, encabezado textual, `cell(row)` y `sortable`; no recibe instancias de Column ni field paths vendor. La clave de fila evita identidad por índice.
- Resultado confirmado/snapshot: filas de la página, página de origen y total. Estado discriminado `ready`, `loading` o `error` con mensaje saneado; loading/error pueden recibir el último snapshot confirmado. El historial del resultado vive en el consumidor, no en un ref de caché dentro del wrapper.
- Carga inicial sin snapshot: indicador de carga. Error inicial: mensaje de error. Ready vacío: estado vacío, filas anteriores descartadas y navegación 0 de 0.
- Refetch con snapshot: conserva filas con feedback de carga. Fallo: conserva esas filas y muestra error. No atribuir filas viejas a una página nueva confirmada.
- Reducir total manteniendo páginas: comunicar una sola corrección para el par página/total inválido, sin callback durante render ni loops si el consumidor aún no actualizó props. Mostrar filas previas durante la transición de RF-94.
- Total confirmado cero: no solicitar una última página inexistente; ready vacío prevalece sobre el snapshot previo. El consumidor entrega el nuevo resultado confirmado y limpia la fase loading/error que ya no aplica.
- Se distingue resultado vacío del conjunto completo de un cambio de página aún no resuelto. La demo simula esos estados explícitamente; los datos de negocio reales quedan fuera de esta fase.

### Errores observables y precondiciones

- Input no admitido: `role=alert` con mensaje fijo de configuración dirigido al desarrollador; no renderizar el control, no fallback a text y no registrar props. TypeScript rechaza tipos no admitidos y una prueba runtime cubre consumidores no tipados.
- Error de campo suministrado: `aria-invalid`, mensaje visible y `aria-describedby`; no inferir validación de negocio ni conservar errores en un store paralelo.
- DataTable: error del consumidor como texto saneado; nunca renderizar HTML crudo ni objetos de transporte. La demo utiliza mensajes ficticios.
- Icono-only Button sin nombre y contratos inválidos de opciones/columnas: tipos propios y fixtures negativas como primera defensa. No agregar funciones de negocio para reparar entradas.
- Dialog exige el destino alternativo como precondición del consumidor. La página de demo lo mantiene montado y enfocable; referencias inválidas se diagnostican en pruebas de contrato, no se extiende la cadena de destinos fuera de la spec.

## Decisiones técnicas

### 1. Wrappers acotados sobre PrimeReact 10

- Elegida: conservar las versiones instaladas y envolver Button, InputText, InputTextarea, Dropdown, Dialog, DataTable/Column, Tag, Toast, Tooltip y Skeleton dentro de `shared/ui`. Icon centraliza el mapping de PrimeIcons. Traducir valores/eventos a nuestros contratos.
- Descartada: migrar a PrimeReact 11 o reenviar props completas. La primera cambia una dependencia fijada sin necesidad; la segunda rompe la independencia del Design System. No parchear node_modules ni importar internos distribuidos de la librería.
- RF cubiertos: RF-1–RF-96; fronteras y contratos de requisitos no funcionales.

### 2. Dirección visual y tokens compartidos

- Elegida: mantener la base de estilos existente mientras se define con Impeccable la superficie de operación/revisión del Design System. Antes de UI, completar el contexto de producto requerido y la dirección visual; el plan no atribuye identidad definitiva al tema vendor. Crear escalas semánticas CSS de texto, espacio, color, borde y foco compartidas por las once primitivas, con medidas de contraste para los umbrales aprobados.
- La demo será una página de revisión: encabezado, índice por primitivas y grupos de ejemplos con acciones/estado observado, sin simular un dashboard de negocio. Las secciones se reordenan en columna a 360 px; solo la tabla tiene scroll horizontal local. Dialog usa ancho limitado al viewport y contenido con overflow vertical. Motion no esencial se desactiva por `prefers-reduced-motion`.
- Descartada: una identidad visual improvisada por componente, cambiar la página bootstrap o ampliar a App Shell. No se definen valores finales sin revisión de contraste y superficie.
- RF cubiertos: RF-2, RF-47, RF-65, RF-85; requisitos no funcionales de diseño, accesibilidad y responsive.

### 3. Controles de formularios con identidad y valores propios

- Elegida: valores controlados y ref nativa; IDs estables para label/ayuda/error. Input default text y validación de su unión también en runtime; Textarea no añade máscaras. Dropdown con filtro deshabilitado y opción vacía propia, no `showClear` ni una segunda acción de limpieza.
- Select invalida un valor removido/deshabilitado comunicando null en un efecto acotado por transición; no llama el callback repetidamente en cada render. El consumidor confirma value=null. La opción vacía no cuenta como una opción de negocio disponible.
- Descartada: copiar valores a Zustand, validar negocio dentro del wrapper o emitir eventos vendor. La demo utiliza React Hook Form para el ejemplo de campos y Zod para validación ficticia; no afecta contratos HTTP ni crea un formulario de negocio.
- RF cubiertos: RF-3, RF-4, RF-14–RF-29, RF-71, RF-72, RF-89–RF-91, RF-93, RF-95.

### 4. Dialog: cierre e infraestructura de foco

- Elegida: modal true, tres mecanismos habilitados por defecto, controlados mediante flags propios. El callback verifica `closeBlocked` y mecanismo habilitado; eventos de footer que cierran el diálogo usan la misma acción del consumidor. No bloquear interacción del contenido por el mero bloqueo del cierre.
- Guardar el elemento activo al abrir; foco inicial en un control habilitado o título programáticamente enfocable. Trap dentro del modal; fondo inert/oculto a AT de forma temporal y restaurado al cerrar. Los portales se montan fuera de la región inert; estilos vendor y el overlay no bastan como prueba de modalidad.
- Restaurar foco tras finalizar el cierre y retirar inert: activador disponible → encabezado principal → main → primer interactivo disponible → destino alternativo de la página. Las referencias públicas son DOM, no métodos vendor. Conservar el estado previo de atributos y scroll en cleanup/StrictMode.
- Descartada: usar sin comprobar la devolución automática del vendor; no garantiza toda la cadena RF-35. También se descartan drag/resize/maximize, no necesarios para la spec.
- RF cubiertos: RF-30–RF-36, RF-82–RF-85, RF-96.

### 5. DataTable controlada sin caché oculta

- Elegida: modo lazy de PrimeReact para no aplicar un segundo sort/slice local; columnas y callbacks se adaptan a API propia. Orden simple/removible y paginator sin selector de rows. Reporte vacío explícito 0 de 0 cuando corresponda. Ningún storage del vendor.
- Resultado previo y error/carga pertenecen al consumidor; el wrapper presenta snapshot y solicita cambios. La demo es ese consumidor y aplica sorting/paginación a sus fixtures locales, simula espera y fallo, y descarta snapshots tras ready vacío.
- Descartada: mantener copias históricas de filas dentro del wrapper o acceder directamente a TanStack Query/HTTP. Ello mezclaría responsabilidad de datos con la primitiva y ocultaría de qué página proceden las filas.
- RF cubiertos: RF-37–RF-47, RF-73–RF-81, RF-94.

### 6. Toast: reloj propio y estado efímero

- Elegida: extender UiProvider con contexto privado de avisos y API pública `useToast`; estado efímero local al provider, sin persistencia. PrimeReact aporta presentación, pero el reloj lo posee el wrapper: avisos sticky para desactivar el timeout vendor y retirada por ID propio.
- Por aviso, registrar tiempo restante, instante de inicio y conjunto de pausas hover/focus. Mientras cualquiera esté activa no avanza el reloj; salir de una no reanuda si la otra sigue activa. Tiempo monotónico; limpiar timers al retirar/unmount. Un callback de cierre elimina solo su aviso una vez.
- Live regions con una única fuente de anuncio por aviso: presentación vendor y región propia no anuncian duplicado. No mueve foco al aparecer. El cierre manual es un control nombrado utilizable con teclado.
- Descartada: `life=5000` sin adaptación o recrear el aviso cada vez que sale hover; no acreditan pausa por foco ni conservación de tiempo restante.
- RF cubiertos: RF-4, RF-50–RF-55.

### 7. Tooltip y Skeleton: excepciones accesibles propias

- Elegida: Tooltip guarda presencia de puntero/foco en target/contenido y estado de descarte. RF-88 es la excepción prioritaria de RF-56, RF-57 y RF-86: tras Escape, cambios de foco no reabren; reabrir solo después de salida y nueva entrada del puntero en el target. Adaptar métodos públicos de Tooltip, `event=both`/`autoHide` y guardas de apertura; si el vendor no permite esa precedencia mediante API pública, detener ese componente y documentar el bloqueo.
- En tránsito de target a contenido, una demora privada corta de ocultación evita parpadeo sin crear contenido interactivo. Conservar descripciones previas del target y desmontar listeners al cambiar referencia o cerrar.
- Skeleton envuelve formas vendor `aria-hidden` con un único mensaje de estado para la representación completa. Un Skeleton puede representar varias líneas decorativas sin crear un anuncio por cada línea. Desactivar animation wave con movimiento reducido.
- Descartada: Tooltip que se reabre por foco tras Escape, o Skeleton exclusivamente decorativo sin anuncio. No cumplirían las decisiones aprobadas.
- RF cubiertos: RF-56–RF-63, RF-86–RF-88, RF-92.

### 8. Demostración fuera del grafo de producción

- Elegida: página separada en `src/dev/design-system`, servida en `/__design-system` por plugin Vite `apply: serve` y `configureServer`, habilitado en servidor de desarrollo y no en preview. Entry independiente que monta solo UiProvider y los ejemplos; no router de negocio, QueryClient ni Auth. Seguir el patrón de los harness existentes, sin introducir import de la demo desde `src/main.tsx`, router o barrel de UI.
- Vite build no tiene entrada/import de esos módulos; el código de configuración del plugin no se distribuye al navegador. Además de bloquear acceso, inspeccionar JS/CSS/assets emitidos para marcadores y fixtures exclusivos. El fallback SPA de preview para esa URL no equivale a acceso a la demo.
- Descartada: ruta ocultada solo por una condición de entorno con import estático de la demo. Podría distribuir recursos exclusivos pese a no renderizarla.
- RF cubiertos: RF-64–RF-70.

## Estrategia de pruebas

Los tests de contrato se escriben antes de cada comportamiento. Se usa `tests/ui/*.test.tsx` con imports de `@/shared/ui`, roles/nombres accesibles y callbacks propios. No seleccionar clases `p-*`, métodos privados o estructuras internas de PrimeReact. Playwright confirma lo que jsdom no prueba: foco real, inert/portales, overflow, pointer transitions y bundle de producción.

### Matriz de cobertura funcional

| RF                                | Prueba                                                                 | Nivel                  | Evidencia esperada                                                      |
| --------------------------------- | ---------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------- |
| RF-1                              | Consumidor de once exportaciones públicas y demo completa.             | Tipos/RTL/E2E          | Primitivas presentes sin tipos vendor públicos.                         |
| RF-2                              | Tab por controles y comprobación de estilo de foco.                    | Chromium/manual        | Foco visible con contraste acordado.                                    |
| RF-3, RF-4                        | Disabled sin callback; nombres en árbol accesible.                     | RTL/Chromium           | No acción y controles identificables.                                   |
| RF-5, RF-6                        | Click/Enter/Space por separado.                                        | RTL                    | Un callback por activación.                                             |
| RF-7, RF-8                        | Activar repetidamente mientras loading.                                | RTL                    | Indicador y ninguna activación adicional.                               |
| RF-9, RF-10                       | Texto, mixto e icon-only; fixture negativa sin label.                  | RTL/tipos              | Nombre propio obligatorio en icon-only.                                 |
| RF-11, RF-12, RF-13               | Icon decorativo/informativo.                                           | RTL                    | Decorativo oculto; informativo nombrado.                                |
| RF-14, RF-15                      | Escribir y confirmar callback string.                                  | RTL                    | Valores comunicados sin transformación de negocio.                      |
| RF-16, RF-17, RF-18, RF-19        | Label, ayuda, error coexistentes en ambos campos.                      | RTL                    | Asociaciones correctas y aria-invalid.                                  |
| RF-20, RF-21                      | Editar readOnly y multilinea.                                          | RTL                    | Sin edición readOnly; saltos de línea conservados.                      |
| RF-22, RF-23, RF-24               | Seleccionar uno, confirmar callback y valor null.                      | RTL                    | Valor simple, ausencia representable.                                   |
| RF-25, RF-26                      | Teclado con opciones deshabilitadas.                                   | RTL/Chromium           | Recorrido funcional sin seleccionarlas.                                 |
| RF-27, RF-28, RF-29               | Label y error del Select.                                              | RTL                    | Nombre y descripción accesibles, estado inválido.                       |
| RF-30, RF-31                      | Abrir, Tab/Shift+Tab por límites.                                      | Chromium               | Foco inicial interno; no fuga al fondo.                                 |
| RF-32, RF-33                      | Cada mecanismo default, aislado y deshabilitado.                       | RTL/Chromium           | Una solicitud solo cuando está habilitado.                              |
| RF-34                             | Intentar tres cierres con closeBlocked.                                | Chromium               | Ninguna solicitud de cierre.                                            |
| RF-35, RF-36                      | Eliminar sucesivamente destinos y leer título.                         | Chromium               | Cadena completa de restauración y diálogo nombrado.                     |
| RF-37                             | Fixtures genéricas con columnas propias.                               | RTL/tipos              | Celdas correctas y clave estable.                                       |
| RF-38, RF-39, RF-40               | Loading inicial, ready vacío, error con/sin snapshot.                  | RTL                    | Estado inequívoco; filas previas conservadas solo cuando aplican.       |
| RF-41, RF-42, RF-43               | Primera, intermedia y última página.                                   | RTL                    | Callback propio válido y reporte/límites correctos.                     |
| RF-44, RF-45                      | Orden controlado y columnas no ordenables.                             | RTL                    | Solicitud propia y marcador de orden confirmado.                        |
| RF-46, RF-47                      | Teclado paginator/sort; tabla ancha en 360 px.                         | Chromium               | Controles operables y scroll local sin overflow de página.              |
| RF-48, RF-49                      | Badge con tonos distintos.                                             | RTL/manual             | Etiqueta mantiene significado sin depender del color.                   |
| RF-50                             | Mostrar cuatro tipos.                                                  | RTL/demo               | Mensaje y tipo correctos.                                               |
| RF-51                             | Fake timers: 4999/5000 ms; hover y foco solapados.                     | RTL                    | Pausa conserva restante y solo reanuda sin ninguna pausa activa.        |
| RF-52, RF-53                      | Avanzar reloj en warning/error y cerrar manualmente.                   | RTL                    | Persistencia y retirada por interacción.                                |
| RF-54, RF-55                      | Varios avisos y árbol accesible/foco.                                  | RTL/Chromium/manual AT | Anuncio sin robo de foco ni doble lectura; cierres independientes.      |
| RF-56, RF-57                      | Pointer y focus en target.                                             | RTL/Chromium           | Tooltip visible por ambas modalidades inicialmente.                     |
| RF-58, RF-59, RF-60               | Escape, tránsito hover al contenido y descripción.                     | Chromium/RTL           | Descarte, permanencia y asociación sin perder descripciones existentes. |
| RF-61, RF-62, RF-63               | Formas Skeleton y tabulación.                                          | RTL/Chromium           | Espacio representado, ninguna forma anunciada o enfocada.               |
| RF-64, RF-65                      | Demo en dev con todas las secciones/escenarios.                        | Chromium               | Once primitivas y estados aplicables.                                   |
| RF-66, RF-67, RF-68               | Workflow demo Dialog, tabla y cuatro Toast.                            | Chromium               | Estado observable controlado por consumidor de ejemplo.                 |
| RF-69                             | Interceptar solicitudes y negar API en demo.                           | Chromium               | Uso completo sin solicitudes Auth/backend ni credenciales.              |
| RF-70                             | Build, preview y lectura de todos los artefactos emitidos.             | Proceso/Chromium       | Sin demo accesible ni marcadores/código/fixtures/assets exclusivos.     |
| RF-71                             | Button dentro de form sin type y luego submit.                         | RTL                    | Default no envía; submit explícito sí.                                  |
| RF-72                             | Seis tipos válidos, configuración cerrada.                             | RTL/tipos              | Solo los tipos aprobados admitidos.                                     |
| RF-73, RF-74, RF-75, RF-76, RF-77 | Ciclo asc/desc/null y cambio de columna.                               | RTL/Chromium           | Una columna; consumidor confirma sin sort interno.                      |
| RF-78                             | Paginación con tamaño fijo.                                            | RTL                    | Sin selector de tamaño ni cambio interno.                               |
| RF-79                             | Reducir total dejando páginas con actual inválida.                     | RTL                    | Una petición de corrección por transición, sin render-loop.             |
| RF-80                             | Ready vacío tras una página con filas.                                 | RTL/Chromium           | 0 de 0, navegación deshabilitada, sin filas viejas.                     |
| RF-81                             | Rerender de ready a loading con snapshot.                              | RTL                    | Conserva filas y muestra carga.                                         |
| RF-82                             | Dialog sin controles enfocables y cierre oculto.                       | Chromium               | Título recibe foco programático y trap funciona.                        |
| RF-83                             | Intentar click, foco y recorrido AT del fondo.                         | Chromium/manual AT     | Fondo no interactuable/oculto; atributos restaurados al cerrar.         |
| RF-84, RF-85                      | Cierre bloqueado con campo activo y contenido alto.                    | Chromium               | Contenido operable y scroll interno.                                    |
| RF-86, RF-87                      | Salir por hover/foco de target/contenido.                              | Chromium               | Visible mientras hay interacción salvo descarte, oculto fuera.          |
| RF-88                             | Escape con foco/hover; blur/refocus; salida/reentrada pointer.         | Chromium               | Solo el ciclo de puntero reabre tras Escape.                            |
| RF-89, RF-90, RF-91               | Quitar/deshabilitar valor, opción vacía y opciones inexistentes.       | RTL/Chromium           | Callback null idempotente, control vacío/deshabilitado con mensaje.     |
| RF-92                             | Skeleton de varias formas y anuncio de carga.                          | RTL/manual AT          | Un mensaje por representación, no por forma.                            |
| RF-93, RF-95                      | Tipo omitido y tipo inválido en consumidor no tipado.                  | RTL/tipos              | Default text; error explícito sin input y sin datos sensibles.          |
| RF-94                             | Reducir páginas y demorar confirmación del consumidor.                 | RTL/Chromium           | Filas anteriores siguen visibles hasta resultado de página válida.      |
| RF-96                             | Activador eliminado y todas las reservas ausentes; fallback mantenido. | Chromium               | Destino suministrado recibe foco al finalizar cierre.                   |

### Requisitos no funcionales y regresión

- Fixtures TypeScript positivas/negativas para props, columnas genéricas, icon-only, tipos de Input y fallback obligatorio. Verificar que declaraciones públicas no exporten tipos de PrimeReact.
- ESLint sobre aplicación y demo; ninguna dependencia HTTP/Auth en UI/demo. Revisar que el consumidor retenga snapshots y la tabla no introduzca caché de negocio.
- React StrictMode/remount para efectos: sin callbacks repetidos de invalidación/corrección, sin timers/listeners huérfanos y sin atributos inert persistentes.
- Contraste con estilos calculados, anotando foreground/background/tamaño/peso; verificar 4,5:1, 3:1 y foco según la spec. Revisar 360 px y escritorio, y un pase intermedio de tablet según constitución.
- Revisión Impeccable acotada: un pase conjunto desktop/mobile, corrección agrupada y como máximo un pase de confirmación. Auditoría mecánica solo después de UI, no durante esta planificación.
- Prueba `prefers-reduced-motion` para Skeleton y transiciones de overlays; no depender de que jsdom simule layout.
- Integración manual con lector de pantalla para anuncios Tooltip/Toast/Skeleton y fondo modal; la presencia de roles no se presenta como prueba completa de anuncio real.
- Crear proyecto Chromium `design-system` en el launcher/configuración con match propio y selección explícita; reutilizar mecanismo de Vite de test sin servir API real. Sus comandos son previstos, no verificados: `pnpm test:e2e --project=design-system`.
- Ampliar `preview-smoke` para exclusión de demo; mantener tests de bootstrap/proxy/Auth. La fase puede verificarse sin backend/cuenta. Repetir Auth real solo si los cambios de provider/estilos afectan el flujo; no cambiar backend ni crear cuentas.
- Cierre previsto: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:run`, `pnpm build`, E2E predeterminadas, nuevo proyecto `design-system` y `preview-smoke`; `git diff --check`. Verificar startup/hooks si se modifica su configuración.

## Riesgos y dudas abiertas

- No hay nuevas dudas funcionales: los valores visuales concretos están delegados al diseño según la spec. No ampliar variantes o comportamientos sin gestionar el cambio.
- PrimeReact 10 puede diferir de documentación actual: comprobar API instalada con tests de contrato antes de confiar en focus, sticky, lazy o Tooltip. No silenciar fallos con casts ni usar props que los tipos instalados no soportan.
- Tooltip requiere descarte por Escape prioritario sobre el foco. La condición RF-88 aprobada prevalece; algunos criterios de finalización aún mencionan foco o puntero genéricamente. Las pruebas usarán el comportamiento específico: solo puntero reabre. No modificar la spec silenciosamente.
- Dialog exige foco alternativo válido durante todo el cierre; los portales o el foco automático vendor pueden interferir con inert/restore. La verificación real debe preceder al cierre de ese componente.
- La conservación de filas es responsabilidad explícita del consumidor. Separar total confirmado, página solicitada y snapshot visible para no confundir ready vacío con una página pendiente.
- El error de configuración de Input es diagnóstico al desarrollador, no validación de negocio. Mantenerlo fijo y sin publicar el valor introducido.
- No existen todavía contexto de producto/diseño documentado ni variantes definitivas. Completar dirección con Impeccable antes de editar UI; este plan no escribe archivos fuera de su directorio ni inventa producto.
- Los nuevos proyectos E2E requieren puerto 5174 libre. No detener procesos ajenos ni habilitar demo en preview para facilitar las pruebas.
- Los 96 RF necesitan evidencia nueva; el éxito de la Spec 001 no demuestra cumplimiento de la Spec 002. La definición de este plan tampoco acredita tests ejecutados.

### Referencias consultadas

- [PrimeReact 10: componentes y configuración](https://primereact.org/).
- [DataTable](https://primereact.org/datatable/), [Dialog](https://primereact.org/dialog/), [Tooltip](https://primereact.org/tooltip/), [Toast](https://primereact.org/toast/) y [Skeleton](https://primereact.org/skeleton/).
- Tipos públicos instalados de PrimeReact `10.9.7` y documentación recuperada mediante Context7; preferir el contrato de la versión instalada ante discrepancias.

Solicitar aprobación de este plan antes de generar tareas o implementar código.
