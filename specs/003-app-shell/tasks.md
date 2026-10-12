# Tareas - Spec 003 App Shell

Derivadas de la spec revisada y del plan aprobado. El plan cubre RF-1–RF-65 y NFR-1–NFR-10 sin brechas de trazabilidad. Todas las tareas están pendientes.

Cada tarea busca una unidad de aproximadamente 15–30 minutos de trabajo activo, excluidas esperas de herramientas o confirmaciones humanas. En las tareas de comportamiento, escribir primero la prueba de aceptación y después incorporar el comportamiento. Ejecutar las pruebas focalizadas correspondientes antes de marcar la tarea. Si aparece una brecha de alcance, detenerla y resolverla mediante change-manager; no ampliar la spec desde una tarea.

## Tareas

### Dirección de interfaz

- [ ] T1. Definir y confirmar con Impeccable la composición del App Shell y los estados de sesión. (RF-1–RF-5, RF-15–RF-17, RF-31, RF-35–RF-39, RF-56–RF-57; NFR-1, NFR-5, NFR-6)
      Hecho cuando: un brief dentro de esta spec identifica jerarquía, header, sidebar, bienvenida y estados; conserva tokens existentes, fija compacto por debajo de 1024 px e incluye tablet a 768 px; la composición está confirmada antes de implementar vistas.

### Verificación de sesión dentro de Auth

- [ ] T2. Ampliar el catálogo propio de Icon con home, menu y logout. (RF-2, RF-16, RF-22, RF-41; NFR-6)
      Hecho cuando: pruebas de contrato escritas primero verifican las nuevas opciones decorativas/informativas; la API pública no expone tipos ni clases vendor y las opciones anteriores siguen operativas.
- [ ] T3. Exponer metadatos reactivos de verificación inicial mediante la API pública de Auth. (RF-31–RF-32, RF-35, RF-38; NFR-9)
      Hecho cuando: pruebas MSW verifican pending, success ante sesión válida o 401 y error ante red/HTTP/contrato; useSession publica verification sin duplicar usuario/sesión ni romper sus campos existentes.
- [ ] T4. Publicar el resultado reactivo de recomprobaciones posteriores. (RF-31–RF-32, RF-38–RF-40, RF-55; NFR-9)
      Hecho cuando: pruebas verifican pending → error → success después de sesión válida; el error posterior no queda solo en el retorno de refetch y se conservan las garantías previas del estado confirmado del plugin.
- [ ] T5. Deduplicar comprobaciones concurrentes de la misma generación. (RF-31, RF-39, RF-55; NFR-9, NFR-10)
      Hecho cuando: pruebas de StrictMode, consumidores múltiples y refetch simultáneos verifican una consulta inicial y una operación compartida por generación; todos observan el mismo resultado vigente.
- [ ] T6. Invalidar verificaciones anteriores al confirmar logout sin restaurar estados obsoletos. (RF-40, RF-45–RF-46, RF-49; NFR-9)
      Hecho cuando: pruebas con respuestas diferidas verifican que 204 establece ausencia confirmada y deja verificación coherente; respuestas anteriores no alteran sesión, errores o banderas vigentes y un logout fallido no sobrescribe un 401 concurrente.

### Preferencias de interfaz

- [ ] T7. Crear la preferencia de sidebar en Zustand con persistencia local versionada. (RF-18–RF-19, RF-30, RF-57; NFR-7)
      Hecho cuando: pruebas verifican valor expandido predeterminado, alternancia y restauración de un booleano válido con la clave acordada; solo se guarda la preferencia, sin datos Auth ni apertura del panel compacto.
- [ ] T8. Gestionar contenido persistido inválido y almacenamiento no disponible. (RF-19–RF-20; NFR-7)
      Hecho cuando: pruebas de lectura inválida y excepciones de lectura/escritura verifican funcionamiento en memoria y alternancia posterior sin bloquear la aplicación.

### Primitiva Drawer

- [ ] T9. Incorporar Drawer controlado con título y mecanismos de cierre. (RF-22, RF-26, RF-51, RF-53; NFR-6)
      Hecho cuando: pruebas verifican open, título accesible, botón, Escape y fondo exterior; el consumidor recibe solicitudes de cierre mediante un contrato propio exportado desde shared/ui.
- [ ] T10. Incorporar foco inicial, contención y bloqueo de interacción exterior de Drawer. (RF-23–RF-25; NFR-2)
      Hecho cuando: pruebas focalizadas verifican foco interior, Tab/Mayús+Tab y exterior no interactivo; la modalidad se resuelve dentro de shared/ui, con regresión de Dialog si se extraen utilidades compartidas.
- [ ] T11. Resolver el foco de salida de Drawer y limpiar la modalidad al cerrar o desmontar. (RF-27, RF-29, RF-58, RF-61–RF-65; NFR-2)
      Hecho cuando: pruebas verifican un único resolvedor de foco consultado tras desbloquear el exterior; destinos actualizados y desmontajes no dejan inert, bloqueo de scroll ni retornos automáticos que compitan.
- [ ] T12. Estilizar Drawer como panel lateral acotado al viewport con CSS local. (RF-22, RF-25, RF-52; NFR-1, NFR-4, NFR-6)
      Hecho cuando: el panel permite alcanzar todo su contenido a altura reducida, respeta movimiento reducido y usa tokens; no añade selectores específicos a styles.css global.
- [ ] T13. Verificar en Chromium el contrato completo de Drawer. (RF-23–RF-27, RF-51–RF-53, RF-61–RF-64; NFR-2)
      Hecho cuando: pruebas de navegador verifican ciclo de foco, cierres, bloqueo exterior y limpieza; el resolvedor puede escoger activador, enlace o encabezado sin depender de selectores internos del vendor.

### Estados, páginas y rutas

- [ ] T14. Implementar AuthLayout y las presentaciones de comprobación, error y ausencia de sesión. (RF-5, RF-31, RF-35–RF-38, RF-54; NFR-5, NFR-6)
      Hecho cuando: pruebas por roles verifican encabezado principal, estados distinguibles en español y región de anuncio; la pantalla informativa no contiene navegación de trabajo ni formulario/enlace de login.
- [ ] T15. Implementar el boundary de sesión con prioridad de verificación y ausencia confirmada. (RF-1, RF-31–RF-32, RF-35–RF-36, RF-38, RF-40, RF-55; NFR-9)
      Hecho cuando: pruebas con la API pública verifican todas las transiciones iniciales/posteriores; no se monta contenido autenticado durante pending/error y se recupera tras éxito sin copiar sesión a UI.
- [ ] T16. Conectar Reintentar con la comprobación pública y conservar el destino solicitado. (RF-11, RF-38–RF-39, RF-55; NFR-5)
      Hecho cuando: pruebas MSW cubren error de red/HTTP/contrato seguido de éxito o 401; la URL no cambia y las activaciones concurrentes respetan la deduplicación de Auth.
- [ ] T17. Crear Inicio y página no encontrada con encabezados y retorno. (RF-3–RF-5, RF-13–RF-14; NFR-5)
      Hecho cuando: pruebas verifican bienvenida breve sin métricas ficticias y página no encontrada con Volver a Inicio; ambos encabezados admiten foco programático.
- [ ] T18. Registrar rutas de trabajo y catálogo de navegación con Inicio como único destino. (RF-6–RF-14, RF-35)
      Hecho cuando: pruebas con router verifican / y dirección desconocida dentro del boundary; ausencia de sesión prevalece sobre 404 y demo/harnesses no aparecen en el catálogo ni pierden sus puntos de entrada de desarrollo.

### App Shell y navegación

- [ ] T19. Derivar y presentar la identidad pública en el encabezado. (RF-2, RF-33–RF-34; NFR-1, NFR-5, NFR-8)
      Hecho cuando: pruebas del formateador cubren nombre → correo → Usuario; la integración usa el correo del contrato vigente, no acepta una respuesta Auth incompleta y permite consultar identidad larga sin ocultar acciones.
- [ ] T20. Componer AppLayout con header, sidebar, contenido y enlace de salto. (RF-1–RF-2, RF-5, RF-50, RF-52, RF-57; NFR-6)
      Hecho cuando: pruebas por roles verifican regiones y salto al contenido; el layout presenta la página mediante Outlet, con estilos locales y foco visible.
- [ ] T21. Implementar enlaces semánticos y estado activo de navegación. (RF-6–RF-10, RF-51)
      Hecho cuando: pruebas verifican Inicio como único destino, activación por teclado y aria-current en coincidencia exacta; una URL desconocida no produce un enlace activo ficticio.
- [ ] T22. Conectar sidebar expandida/contraída con su preferencia y nombres visibles. (RF-15–RF-20, RF-51–RF-53, RF-57)
      Hecho cuando: pruebas verifican alternancia, nombre accesible, estado del control y Tooltip por puntero/foco; la preferencia se restaura antes de mostrar la sidebar persistente.
- [ ] T23. Integrar navegación compacta y modalidad responsive desde una misma condición de ancho. (RF-21–RF-26, RF-30, RF-53, RF-56–RF-57; NFR-1)
      Hecho cuando: pruebas verifican compacto a 360/768, persistente a 1280, panel inicialmente cerrado y apertura/cierre mediante Drawer; no hay dos navegaciones interactivas ni cambios en la preferencia persistida.
- [ ] T24. Coordinar cierre y foco al seleccionar destinos nuevos o ya activos. (RF-27–RF-29, RF-58–RF-59)
      Hecho cuando: pruebas verifican que desde 404 seleccionar Inicio cierra y enfoca su encabezado; seleccionar Inicio estando en Inicio cierra y enfoca el activador sin recargar el documento.
- [ ] T25. Coordinar retirada del panel y foco al pasar a navegación persistente. (RF-30, RF-60–RF-62)
      Hecho cuando: pruebas verifican cierre y desbloqueo al cruzar 1024 con panel abierto; foco en enlace activo o encabezado de 404, sin modificar preferencia ni enfocar nodos ocultos.
- [ ] T26. Coordinar cierre del panel y foco cuando un estado de sesión sustituya al shell. (RF-31–RF-32, RF-38, RF-40, RF-63–RF-65)
      Hecho cuando: pruebas con panel abierto cubren recomprobación pending, error y ausencia; no quedan bloqueos ni foco en nodos desmontados y se enfoca el encabezado del estado vigente.

### Cierre de sesión desde el encabezado

- [ ] T27. Conectar logout con indicador pendiente y bloqueo de activaciones duplicadas. (RF-41–RF-45, RF-51; NFR-5)
      Hecho cuando: pruebas MSW verifican acción de header, una solicitud durante pending y pantalla informativa tras 204; la vista no asume éxito antes de confirmación.
- [ ] T28. Presentar el fallo de logout y reintento condicionado a sesión vigente. (RF-46–RF-48; NFR-5, NFR-8)
      Hecho cuando: pruebas cubren fallo con sesión confirmada y reintento exitoso; el mensaje español es accesible y no se ofrece logout cuando no hay sesión confirmada.
- [ ] T29. Mantener la prioridad de ausencia confirmada ante fallo concurrente de logout. (RF-35, RF-40, RF-46–RF-49; NFR-9)
      Hecho cuando: pruebas con logout diferido y recomprobación 401 mantienen la información de sesión no iniciada; el fallo se anuncia sin restaurar shell ni ofrecer reintento y no se pierde al desmontarse el header.

### Workflows de navegador y migración de pruebas

- [ ] T30. Migrar las pruebas existentes de bootstrap a la entrada dependiente de sesión. (RF-1–RF-8, RF-31–RF-38; NFR-10)
      Hecho cuando: app-bootstrap e inventory.bootstrap-smoke simulan explícitamente Auth y verifican los estados nuevos; conservan controles de exclusión de herramientas de desarrollo y no dependen del backend real.
- [ ] T31. Cubrir recarga directa e historial entre Inicio y página no encontrada. (RF-9–RF-14, RF-35, RF-49)
      Hecho cuando: E2E verifica acceso directo, retorno, recarga, Atrás y Adelante; después de logout no recupera presentación autenticada por historial.
- [ ] T32. Cubrir persistencia de sidebar entre recargas y aperturas del mismo navegador. (RF-18–RF-20, RF-30, RF-57; NFR-7)
      Hecho cuando: E2E recarga y abre otra página del mismo contexto con la preferencia intacta; almacenamiento contiene únicamente el dato previsto y estados inválidos no bloquean Inicio.
- [ ] T33. Cubrir el workflow responsive y teclado de navegación en Chromium. (RF-15–RF-17, RF-21–RF-30, RF-50–RF-53, RF-56–RF-62; NFR-1, NFR-4)
      Hecho cuando: E2E a 360/768/1280 y alrededor de 1024 verifica acceso a controles, Tooltip, salto, modalidad, cierres y destinos de foco, incluido 404; no hay desbordamiento de página.
- [ ] T34. Cubrir comprobación, errores y recuperación de sesión en navegador. (RF-31–RF-32, RF-35–RF-40, RF-54–RF-55; NFR-9, NFR-10)
      Hecho cuando: E2E con respuestas Auth ficticias cubre pending inicial, 401, red/HTTP/contrato y recuperación; recomprobaciones se ejercitan también mediante integración de la API pública, sin añadir controles de prueba a producción.
- [ ] T35. Cubrir cierre de sesión, fallo y prevención de restauración en navegador. (RF-41–RF-49; NFR-9, NFR-10)
      Hecho cuando: E2E verifica pending, clics repetidos, fallo/reintento, 204 e historial; las pruebas Auth con respuestas antiguas de T6 siguen pasando.
- [ ] T36. Verificar en navegador foco y limpieza cuando la verificación sustituye un panel abierto. (RF-63–RF-65; NFR-2, NFR-9)
      Hecho cuando: pruebas Chromium verifican destinos reales de foco para pending, error y ausencia con panel abierto; usan una fixture de prueba aislada si requieren disparar refetch, sin introducir rutas ni recursos de test en producción.
- [ ] T37. Adaptar preview-smoke a la consulta de sesión conservando la inspección del bundle. (RF-8, RF-31–RF-38; NFR-8, NFR-10)
      Hecho cuando: preview intercepta Auth con datos ficticios, verifica la vista esperada y ausencia de peticiones de negocio; bundle sigue excluyendo demo, harnesses y credenciales sentinel y las rutas de desarrollo no exponen herramientas.
- [ ] T38. Ejecutar regresión específica de Design System y Auth harness. (RF-23–RF-27, RF-31–RF-49; NFR-6, NFR-9)
      Hecho cuando: pnpm test:e2e --project=design-system y pnpm test:e2e --project=auth-harness pasan secuencialmente; contratos de Dialog y primitivas existentes no regresan por Drawer o la ampliación de Auth.

### Revisión humana y cierre

- [ ] T39. Revisar responsive, zoom y movimiento reducido con Impeccable. (RF-1–RF-5, RF-15–RF-17, RF-33, RF-52, RF-56–RF-57; NFR-1, NFR-3–NFR-6)
      Hecho cuando: evidencia documentada incluye 360/768/1280, zoom real al 200 %, texto largo, contraste y movimiento reducido; se realiza una revisión agrupada y una confirmación acotada tras corregir los defectos encontrados, sin ampliar alcance.
- [ ] T40. Revisar navegación y destinos del foco con teclado y lector de pantalla. (RF-10, RF-16–RF-17, RF-23–RF-29, RF-50–RF-53, RF-58, RF-62; NFR-2)
      Hecho cuando: evidencia identifica lector/navegador y confirma nombres, estado activo/expandido, salto, contención y retornos del foco, incluido destino activo inexistente; no se declara confirmación auditiva sin pasada humana.
- [ ] T41. Revisar anuncios y transiciones de sesión con lector de pantalla. (RF-31–RF-40, RF-43, RF-47–RF-48, RF-54–RF-55, RF-63–RF-65; NFR-2, NFR-5)
      Hecho cuando: evidencia humana confirma comprobación, errores, reintentos, ausencia y cierre sin anuncios duplicados o pérdida de foco; se cubre retirada del panel y fallo concurrente sin sesión.
- [ ] T42. Verificar fronteras, separación de estados y formato de los cambios. (RF-18–RF-20, RF-31–RF-49; NFR-6–NFR-9)
      Hecho cuando: pnpm lint y pnpm format:check pasan; revisión confirma APIs públicas Auth, PrimeReact/PrimeIcons solo en shared/ui, CSS co-localizado y store sin sesión/identidad; Markdown se verifica con Prettier focalizado.
- [ ] T43. Ejecutar la suite unitaria/integración, typecheck y build. (RF-1–RF-65; NFR-6, NFR-9, NFR-10)
      Hecho cuando: pnpm typecheck, pnpm test:run y pnpm build pasan; se registran resultados y advertencias reales, incluidas regresiones Auth y contratos Drawer/Icon.
- [ ] T44. Ejecutar el E2E predeterminado y la verificación de producción. (RF-1–RF-65; NFR-1, NFR-8–NFR-10)
      Hecho cuando: pnpm test:e2e y pnpm test:e2e --project=preview-smoke pasan secuencialmente; nuevas pruebas del shell se ejecutan en bootstrap-smoke sin backend ni credenciales privadas.
- [ ] T45. Consolidar evidencia y validar cumplimiento completo de Spec 003. (RF-1–RF-65; NFR-1–NFR-10)
      Hecho cuando: el informe de cierre relaciona cada RF/NFR con resultados automatizados o manuales, incluye los casos límite y criterios de finalización, actualiza documentación operativa afectada y spec-validator no encuentra brechas; un bloqueo mantiene pendiente la tarea correspondiente.

## Orden y dependencias

El orden numérico es una secuencia de ejecución válida. La tabla permite identificar dependencias reales; no implica autorización para ejecutar agentes en paralelo. Las suites Playwright comparten el puerto estricto 5174 y se ejecutan secuencialmente.

| Tarea | Depende de | Motivo |
| --- | --- | --- |
| T1 | Ninguna | Definir la composición antes de implementar vistas. |
| T2 | Ninguna | Extensión acotada del catálogo visual existente. |
| T3 | Ninguna | Contrato aditivo que requieren las vistas de sesión. |
| T4 | T3 | Publicar las comprobaciones posteriores con el mismo contrato. |
| T5 | T4 | Coordinar observadores y operaciones de verificación. |
| T6 | T5 | Garantizar vigencia de resultados y prioridad de logout. |
| T7 | Ninguna | Preferencia de UI independiente de Auth. |
| T8 | T7 | Proteger el mecanismo de persistencia. |
| T9 | T1, T2 | Contrato visual mínimo para el panel acordado. |
| T10 | T9 | Añadir modalidad al panel controlado. |
| T11 | T10 | Limpiar y resolver foco sobre modalidad existente. |
| T12 | T11 | Completar presentación sin alterar el ciclo de foco. |
| T13 | T12 | Verificar el contrato en navegador real. |
| T14 | T1 | Presentaciones acordadas independientes de la sesión real. |
| T15 | T4, T14 | Componer estados observables de Auth y UI. |
| T16 | T5, T15 | Reintento conectado con deduplicación y conservación de URL. |
| T17 | T1 | Contenido de páginas definido por la spec. |
| T18 | T15, T16, T17 | Integrar rutas bajo la prioridad de sesión. |
| T19 | T1, T2, T3 | Header con identidad derivada del contrato público. |
| T20 | T18, T19 | Componer layout y Outlet en rutas de trabajo. |
| T21 | T18, T20 | Mostrar enlaces del catálogo dentro del shell. |
| T22 | T8, T21 | Conectar preferencia y navegación contraída. |
| T23 | T13, T20, T21, T22 | Panel compacto sobre shell y Drawer comprobados. |
| T24 | T23 | Resolver foco al seleccionar enlaces del panel. |
| T25 | T24 | Resolver transición responsive sin competir con otros cierres. |
| T26 | T6, T16, T25 | Resolver sustitución del shell y foco con resultados vigentes. |
| T27 | T6, T19, T20 | Integrar acción de logout en header y boundary. |
| T28 | T27 | Añadir error y reintento de la acción existente. |
| T29 | T26, T28 | Preservar error y ausencia ante desmontaje concurrente. |
| T30 | T18, T20, T29 | Migrar smoke a la entrada funcional del shell. |
| T31 | T30 | Recorrer historial de las rutas integradas. |
| T32 | T22, T30 | Persistencia observable desde el navegador. |
| T33 | T25, T30 | Navegación responsive y foco del shell integrado. |
| T34 | T16, T30 | Workflows de sesión con entrada real. |
| T35 | T29, T31 | Logout y navegación posterior integrados. |
| T36 | T26, T33, T34 | Foco real ante sustitución de panel por estados de sesión. |
| T37 | T30 | Adaptar preview conservando exclusiones de producción. |
| T38 | T6, T13, T29 | Regresión de las fronteras Auth y UI afectadas. |
| T39 | T31–T37 | Revisar vistas y workflows integrados. |
| T40 | T33, T36, T39 | Revisar foco y navegación sobre presentación comprobada. |
| T41 | T34–T36, T39 | Confirmar anuncios sobre workflows de sesión completos. |
| T42 | T38–T41 | Comprobar calidad y fronteras tras revisiones. |
| T43 | T42 | Verificar toda la implementación y sus tipos. |
| T44 | T43 | Validar workflows y producción tras build. |
| T45 | T38–T44 | Consolidar evidencia real de todas las comprobaciones. |

## Cobertura de requisitos

### Requisitos funcionales

| RF | Tarea | Evidencia |
| --- | --- | --- |
| RF-1–RF-2 | T19, T20, T30, T39 | Regiones y marca del shell autenticado. |
| RF-3–RF-5 | T14, T17, T20, T30 | Bienvenida/404/estados con encabezado principal y sin métricas ficticias. |
| RF-6–RF-8 | T18, T21, T30, T37 | Catálogo con solo Inicio y exclusión de herramientas de desarrollo. |
| RF-9–RF-10 | T21, T24, T31, T40 | Enlace semántico, destino y estado activo. |
| RF-11–RF-12 | T16, T18, T31 | URL conservada, recarga e historial real. |
| RF-13–RF-14 | T17, T18, T31 | 404 autenticada y retorno a Inicio. |
| RF-15–RF-17 | T22, T33, T39, T40 | Alternancia y nombre visible/accesible en contraída. |
| RF-18–RF-20 | T7, T8, T22, T32 | Persistencia, predeterminado y degradación en memoria. |
| RF-21–RF-22 | T23, T33 | Panel cerrado inicialmente y control de apertura. |
| RF-23–RF-25 | T10, T13, T23, T33, T40 | Foco interior, contención y bloqueo exterior en Chromium. |
| RF-26–RF-27 | T9, T11, T13, T24, T33, T40 | Cierres y retorno al activador. |
| RF-28–RF-29 | T24, T33, T40 | Cierre al seleccionar destino y foco en nueva página. |
| RF-30 | T7, T23, T25, T32 | La apertura compacta no altera la preferencia. |
| RF-31–RF-32 | T3, T4, T14, T15, T34, T41 | Comprobación inicial/posterior sin contenido autenticado visible. |
| RF-33–RF-34 | T19, T39 | Identidad por correo real y fallback probado en presentación. |
| RF-35–RF-37 | T14, T15, T18, T34 | Ausencia de sesión prevalece sobre 404; layout sin login. |
| RF-38–RF-39 | T3, T4, T16, T34, T41 | Errores normalizados, reintento y anuncio accesible. |
| RF-40 | T4, T6, T15, T26, T29, T34 | 401 posterior retira shell e identidad. |
| RF-41–RF-42 | T27, T35 | Acción desde header y petición única al contrato Auth. |
| RF-43–RF-44 | T27, T35, T41 | Indicador pendiente y prevención de activaciones duplicadas. |
| RF-45–RF-46 | T6, T27–T29, T35 | Ausencia tras 204 y conservación solo con sesión vigente. |
| RF-47–RF-48 | T28, T29, T35, T41 | Fallo anunciado y reintento condicionado. |
| RF-49 | T6, T29, T31, T35 | Respuestas antiguas e historial no restauran la sesión cerrada. |
| RF-50–RF-53 | T20–T23, T33, T40 | Salto, teclado, foco visible y estados de expansión. |
| RF-54 | T14, T34, T41 | Anuncios de comprobación/error confirmados con lector. |
| RF-55 | T4, T15, T16, T34 | Recuperación del shell después de verificación exitosa. |
| RF-56–RF-57 | T20, T22, T23, T33, T39 | Compacto a 360; sidebar persistente a 1280 según preferencia. |
| RF-58–RF-59 | T24, T33, T40 | Destino activo cierra, devuelve foco y no recarga. |
| RF-60–RF-62 | T11, T25, T33, T40 | Retirada modal y foco en enlace activo o encabezado alternativo. |
| RF-63–RF-65 | T11, T26, T36, T41 | Sustitución de sesión cierra/desbloquea/enfoca el estado vigente. |

### Requisitos no funcionales

| NFR | Tarea | Evidencia |
| --- | --- | --- |
| NFR-1 | T12, T19, T23, T33, T39 | Anchos 360/768/1280 y ausencia de overflow de página. |
| NFR-2 | T10, T11, T13, T36, T39–T41 | Modalidad, semántica, contraste, teclado y lector de pantalla. |
| NFR-3 | T39 | Zoom real del navegador al 200 % documentado. |
| NFR-4 | T12, T33, T39 | Navegación con movimiento reducido. |
| NFR-5 | T14, T16, T17, T19, T27, T28, T41 | Mensajes españoles, sin errores internos sin traducir. |
| NFR-6 | T1, T2, T12, T20, T38, T39, T42 | Impeccable, tokens, CSS local y lint de fronteras. |
| NFR-7 | T7, T8, T32, T42 | Persistencia limitada a preferencia de UI. |
| NFR-8 | T19, T28, T37, T42 | Identidad pública, errores seguros y bundle sin credenciales de prueba. |
| NFR-9 | T3–T6, T15, T29, T34–T36, T38, T42, T43 | Auth autoritativo, sin copias de sesión y sin resultados obsoletos. |
| NFR-10 | T5, T30, T34, T35, T37, T43, T44 | Suites simuladas sin backend ni cuenta privada. |

T45 comprueba la cobertura completa y los criterios de finalización; no sustituye la evidencia de las tareas de implementación y revisión. Las tareas manuales permanecen pendientes si falta confirmación humana. Los comandos y resultados del cierre solo se registran cuando se ejecuten realmente.
