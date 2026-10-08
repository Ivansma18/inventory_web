# Tareas - Spec 002 Design System Foundation

Derivadas de la Spec 002 y del plan aprobado. Cada tarea busca una unidad pequeña, aproximadamente de 15–30 minutos, excluidas descargas o esperas externas. En cada tarea de comportamiento se escribe primero la prueba de aceptación y después se incorpora el comportamiento.

## Tareas

### Dirección visual y base común

- [x] T1. Definir y confirmar con Impeccable la dirección visual de la Fase 1. (RF-2, RF-47)
      Hecho cuando: se aprueba una dirección breve para tipografía, escala, tonos, bordes, foco, movimiento reducido y demostración a 360 px/escritorio, sin ampliar a App Shell ni pantallas de negocio.
- [x] T2. Incorporar las escalas visuales compartidas y los estados comunes de foco/movimiento. (RF-2, RF-47)
      Hecho cuando: las escalas aprobadas se aplican desde `shared/ui`, se comprueba el contraste de foco y la tabla puede limitar su overflow a su propio contenedor.

### Icon y controles de acción

- [x] T3. Implementar el contrato propio de Icon, el catálogo acotado y los modos decorativo/informativo. (RF-11, RF-12, RF-13)
      Hecho cuando: pruebas verifican nombres válidos, ocultación AT de iconos decorativos y alternativa textual de los informativos; no se exponen props ni clases PrimeIcons.
- [x] T4. Implementar Button con activación única, teclado, disabled y loading. (RF-3, RF-5, RF-6, RF-7, RF-8, RF-71)
      Hecho cuando: pruebas verifican click, Enter, Espacio, una sola acción, bloqueo durante loading y que Button no envía formularios por defecto.
- [x] T5. Completar las presentaciones y nombres accesibles de Button. (RF-4, RF-9, RF-10)
      Hecho cuando: pruebas cubren texto, texto e Icon e icon-only; el contrato rechaza Button icon-only sin nombre accesible.

### Campos de formulario

- [x] T6. Implementar el valor y los tipos admitidos de Input. (RF-3, RF-14, RF-20, RF-72, RF-93, RF-95)
      Hecho cuando: pruebas verifican valor controlado, default text, readOnly y los seis tipos admitidos; un tipo no admitido produce error explícito y no renderiza Input.
- [x] T7. Asociar etiquetas, ayuda y errores accesibles a Input. (RF-4, RF-16, RF-17, RF-18, RF-19)
      Hecho cuando: pruebas por roles/nombres verifican label, asociación de ayuda/error y `aria-invalid` sin depender de estructura vendor.
- [x] T8. Implementar Textarea controlado y multilínea. (RF-3, RF-15, RF-20, RF-21)
      Hecho cuando: pruebas verifican emisión del valor, saltos de línea y bloqueo de edición en readOnly/disabled.
- [x] T9. Asociar etiquetas, ayuda y errores accesibles a Textarea. (RF-4, RF-16, RF-17, RF-18, RF-19)
      Hecho cuando: pruebas por roles/nombres verifican etiquetas y descripciones asociadas sin filtrar tipos vendor.
- [x] T10. Implementar Select de selección simple, valor vacío y navegación por teclado. (RF-3, RF-4, RF-22, RF-23, RF-24, RF-25, RF-26, RF-27)
      Hecho cuando: pruebas verifican una sola selección, `null`, emisión del valor, recorrido por teclado, opciones disabled y etiqueta accesible.
- [x] T11. Completar errores, limpieza, invalidación y Select sin opciones. (RF-28, RF-29, RF-89, RF-90, RF-91)
      Hecho cuando: opción vacía limpia la selección, una opción eliminada/deshabilitada emite `null`, errores se asocian y la lista vacía deshabilita Select con un mensaje.

### Dialog

- [x] T12. Implementar Dialog modal y mecanismos de cierre controlados. (RF-32, RF-33, RF-83)
      Hecho cuando: pruebas verifican visibilidad controlada, cierre por botón/Escape/clic fuera habilitados por defecto y configuración independiente; el exterior queda inerte para puntero, teclado y AT.
- [x] T13. Implementar foco inicial, título accesible y contención de foco de Dialog. (RF-30, RF-31, RF-36, RF-82)
      Hecho cuando: Chromium verifica foco interno, ciclo Tab/Mayús+Tab, foco del título cuando no hay controles y nombre accesible.
- [x] T14. Implementar retorno de foco y destino alternativo de la página. (RF-35, RF-96)
      Hecho cuando: pruebas Chromium recorren activador, encabezado, región principal, primer interactivo y destino alternativo; la página conserva el destino alternativo disponible y enfocable durante el cierre.
- [x] T15. Bloquear solo el cierre durante una operación pendiente. (RF-34, RF-84)
      Hecho cuando: las solicitudes de cierre se ignoran mientras están bloqueadas y el contenido del Dialog sigue siendo interactuable.
- [x] T16. Limitar Dialog al viewport con desplazamiento interno. (RF-85)
      Hecho cuando: pruebas a alturas pequeñas permiten recorrer todo el contenido vertical sin desplazar el documento exterior.

### DataTable

- [x] T17. Implementar filas, columnas y claves estables con contratos propios. (RF-37)
      Hecho cuando: pruebas con filas tipadas verifican encabezados y celdas; las columnas no aceptan instancias ni eventos PrimeReact.
- [x] T18. Implementar estados de carga, vacío y error con snapshots anteriores. (RF-38, RF-39, RF-40)
      Hecho cuando: pruebas cubren carga inicial, vacío solo tras éxito vacío, error inicial y error de actualización conservando filas anteriores.
- [x] T19. Implementar paginación controlada y tamaño fijo. (RF-41, RF-42, RF-43, RF-78)
      Hecho cuando: pruebas verifican solicitud de página, límites inicial/final, página visible y ausencia de selector de tamaño.
- [x] T20. Gestionar la reducción de páginas, la transición de filas y el total cero. (RF-79, RF-80, RF-81, RF-94)
      Hecho cuando: con páginas restantes se solicita una corrección acotada y se conservan filas mientras el consumidor actualiza; con éxito vacío se muestra 0 de 0 y se limpian las filas anteriores.
- [ ] T21. Implementar el ciclo de ordenación de una columna. (RF-44, RF-45, RF-73, RF-74, RF-75, RF-76, RF-77)
      Hecho cuando: pruebas verifican ascendente → descendente → sin orden, cambio de columna a ascendente y una sola columna activa; el consumidor aplica la ordenación.
- [ ] T22. Verificar teclado y overflow local de DataTable. (RF-46, RF-47)
      Hecho cuando: Chromium recorre paginación/ordenación por teclado y una tabla ancha se desplaza sin desbordar horizontalmente la página.

### Badge, Toast, Tooltip y Skeleton

- [ ] T23. Implementar Badge textual con tono semántico. (RF-48, RF-49)
      Hecho cuando: pruebas verifican label visible y que distintos significados no dependan únicamente del color.
- [ ] T24. Implementar los tipos, presentación y cierre individual de Toast. (RF-50, RF-52, RF-53, RF-55)
      Hecho cuando: pruebas verifican cuatro tipos, cierre manual, persistencia de warning/error y retirada independiente de avisos simultáneos.
- [ ] T25. Implementar temporizadores pausables de Toast. (RF-51)
      Hecho cuando: fake timers comprueban cinco segundos acumulados y pausa/reanudación por hover y foco solapados.
- [ ] T26. Implementar el anuncio accesible de Toast sin mover el foco. (RF-4, RF-54)
      Hecho cuando: el árbol accesible y una prueba manual confirman el anuncio sin robo de foco ni doble lectura.
- [ ] T27. Implementar visibilidad y descripción accesible de Tooltip. (RF-56, RF-57, RF-59, RF-60, RF-86, RF-87)
      Hecho cuando: pruebas verifican pointer/foco, tránsito al contenido, descripción sin reemplazar otras y ocultación al salir.
- [ ] T28. Implementar Escape y reactivación de Tooltip por puntero. (RF-58, RF-88)
      Hecho cuando: después de Escape, ciclos de foco por sí solos no reabren Tooltip; salida y reentrada del puntero en el elemento asociado sí.
- [ ] T29. Implementar Skeleton decorativo con anuncio único de carga. (RF-61, RF-62, RF-63, RF-92)
      Hecho cuando: pruebas verifican formas no enfocables/no anunciadas, un único estado accesible de carga y movimiento reducido sin animación no esencial.

### API pública y demostración

- [ ] T30. Completar y probar la API pública de las once primitivas. (RF-1)
      Hecho cuando: `shared/ui` exporta las once, un consumidor importa solo el barrel y TypeScript no filtra tipos vendor.
- [ ] T31. Servir la demostración solo en desarrollo y seleccionarla explícitamente en Playwright. (RF-64, RF-69)
      Hecho cuando: ruta/plugin se habilita únicamente en dev por selección explícita, no llama al backend y Playwright la abre sin credenciales.
- [ ] T32. Crear la estructura de demo y ejemplos de las once primitivas. (RF-64, RF-65, RF-69)
      Hecho cuando: la página muestra las once secciones con datos ficticios y estados aplicables, sin formularios ni flujos de negocio.
- [ ] T33. Añadir interacciones de demo para Button, Icon, Input, Textarea, Select y Badge. (RF-65)
      Hecho cuando: Chromium permite activar acciones, editar campos y probar selección/errores mediante la API pública.
- [ ] T34. Añadir interacciones de demo para Dialog y DataTable. (RF-65, RF-66, RF-67)
      Hecho cuando: la demo prueba cierres configurables, bloqueo pendiente, navegación, ordenación y estados sin backend.
- [ ] T35. Añadir interacciones de demo para Toast, Tooltip y Skeleton. (RF-65, RF-68)
      Hecho cuando: la demo permite observar los cuatro Toast, sus tiempos, Tooltip y anuncios/animación de Skeleton.
- [ ] T36. Comprobar que producción no distribuye ni sirve la demostración. (RF-70)
      Hecho cuando: build/preview no permiten acceder a la demo y los artefactos emitidos no contienen su código, datos de ejemplo ni recursos exclusivos.

### Verificación transversal y cierre

- [ ] T37. Revisar accesibilidad, contraste, escalas visuales y responsive de las primitivas. (RF-2, RF-47)
      Hecho cuando: revisión Impeccable y pruebas manuales acreditan escalas compartidas, umbrales de contraste, foco, movimiento reducido y uso a 360 px/escritorio.
- [ ] T38. Revisar manualmente accesibilidad de formularios, Icon, Select, Badge y DataTable. (RF-10, RF-12, RF-13, RF-16, RF-17, RF-19, RF-25, RF-27, RF-29, RF-46, RF-49)
      Hecho cuando: con teclado y tecnología de asistencia se verifican nombres, descripciones, opciones, tabla y significados no dependientes del color; incidencias se registran.
- [ ] T39. Revisar manualmente Dialog, Toast, Tooltip y Skeleton con tecnología de asistencia. (RF-31, RF-35, RF-36, RF-54, RF-60, RF-62, RF-63, RF-83, RF-92, RF-96)
      Hecho cuando: modal/foco/restauración, anuncios y ocultación de formas decorativas se comprueban en Chromium y una tecnología de asistencia disponible.
- [ ] T40. Documentar el comando de demo y su separación del flujo E2E habitual. (RF-64, RF-69, RF-70)
      Hecho cuando: `pnpm test:e2e --project=design-system` pasa sin backend ni credenciales; después README y AGENTS documentan el comando y su selección explícita, y la demo no se habilita en producción.
- [ ] T41. Ejecutar el cierre automatizado de la fase y conservar resultados. (RF-1 a RF-96)
      Hecho cuando: pasan `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:run`, `pnpm build`, `pnpm test:e2e`, `pnpm test:e2e --project=design-system` y `pnpm test:e2e --project=preview-smoke`; no queda listener inesperado en `5174`.

## Orden y dependencias

| Tarea | Depende de            | Motivo                                                                                 |
| ----- | --------------------- | -------------------------------------------------------------------------------------- |
| T1    | Ninguna               | Confirma dirección visual antes de editar componentes.                                 |
| T2    | T1                    | Las primitivas necesitan escalas, foco y movimiento compartidos.                       |
| T3    | T1, T2                | Icon utiliza el catálogo y la escala aprobados.                                        |
| T4    | T2, T3                | Button utiliza estilos y contrato de Icon.                                             |
| T5    | T2                    | El contrato de valores de Input depende de las escalas comunes.                        |
| T6    | T5                    | Las asociaciones accesibles completan Input.                                           |
| T7    | T2                    | Textarea utiliza las escalas comunes.                                                  |
| T8    | T7                    | Las asociaciones accesibles completan Textarea.                                        |
| T9    | T2                    | Select utiliza la base común de controles.                                             |
| T10   | T9                    | Error, invalidación y vacío extienden Select.                                          |
| T11   | T2, T3                | Dialog necesita estilos modales e Icon de cierre.                                      |
| T12   | T11                   | El foco inicial y el trap se prueban sobre Dialog funcional.                           |
| T13   | T12                   | La restauración depende de los destinos y el ciclo de foco.                            |
| T14   | T11                   | El bloqueo de cierre mantiene el modal abierto.                                        |
| T15   | T11, T2               | El scroll interno necesita estructura y escalas.                                       |
| T16   | T2                    | DataTable necesita la base visual común.                                               |
| T17   | T16                   | Los estados se montan sobre la tabla base.                                             |
| T18   | T16                   | La paginación necesita filas/columnas controladas.                                     |
| T19   | T17, T18              | La reducción de páginas combina snapshots y paginación.                                |
| T20   | T16                   | La ordenación utiliza el contrato de columnas.                                         |
| T21   | T18, T20, T2          | El teclado y overflow recorren ambos controles.                                        |
| T22   | T2                    | Badge utiliza tonos y texto semánticos comunes.                                        |
| T23   | T2, T3                | Toast necesita presentación e iconos semánticos.                                       |
| T24   | T23                   | Los temporizadores extienden la cola de avisos.                                        |
| T25   | T23                   | Los anuncios dependen de los mensajes de Toast.                                        |
| T26   | T2, T3                | Tooltip necesita referencia y descripciones accesibles.                                |
| T27   | T26                   | Escape altera la visibilidad del Tooltip.                                              |
| T28   | T2                    | Skeleton utiliza las escalas y el movimiento común.                                    |
| T29   | T3–T28                | El barrel reúne las primitivas implementadas.                                          |
| T30   | T29                   | El proyecto de demo importa la API pública completa.                                   |
| T31   | T29, T30              | La página requiere componentes exportados y ruta dev-only.                             |
| T32   | T31, T4–T10, T22      | Los ejemplos necesitan página, controles y Badge.                                      |
| T33   | T31, T11–T21          | Los workflows necesitan Dialog y DataTable completos.                                  |
| T34   | T31, T23–T29          | Los ejemplos de feedback necesitan los avisos/overlays.                                |
| T35   | T32–T34               | Revisión visual cubre demo y estados integrados.                                       |
| T36   | T31, T35              | El build de exclusión se verifica tras integrar la demo.                               |
| T37   | T2–T36                | La revisión transversal requiere superficies integradas.                               |
| T38   | T4–T10, T16–T22, T37  | La revisión AT necesita controles y tabla listos.                                      |
| T39   | T11–T15, T23–T29, T37 | La revisión AT necesita overlays y Skeleton listos.                                    |
| T40   | T31, T35, T36         | Verifica el comando de demo antes de documentarlo y comprueba exclusión en producción. |
| T41   | T29–T40               | El cierre depende de componentes, demo y revisiones.                                   |

## Cobertura de requisitos

| RF    | Tarea                   | Evidencia                                                 |
| ----- | ----------------------- | --------------------------------------------------------- |
| RF-1  | T30                     | Consumidor importa once componentes desde la API pública. |
| RF-2  | T1, T2, T37             | Foco y tokens visuales contrastados.                      |
| RF-3  | T4–T5, T7, T9, T11, T16 | Controles deshabilitados no ejecutan acciones.            |
| RF-4  | T4–T6, T8–T11, T25–T27  | Nombres accesibles en controles/avisos.                   |
| RF-5  | T4                      | Acción única ante activación.                             |
| RF-6  | T4                      | Enter y Espacio activan Button.                           |
| RF-7  | T4                      | Estado de carga visible.                                  |
| RF-8  | T4                      | Loading bloquea activaciones sucesivas.                   |
| RF-9  | T4                      | Presentaciones de Button con texto/Icon.                  |
| RF-10 | T4, T38                 | Icon-only requiere nombre.                                |
| RF-11 | T3                      | Icon soporta modo decorativo e informativo.               |
| RF-12 | T3, T38                 | Icon decorativo excluido de AT.                           |
| RF-13 | T3, T38                 | Icon informativo dispone de alternativa.                  |
| RF-14 | T5                      | Input emite el valor controlado.                          |
| RF-15 | T7                      | Textarea emite el valor controlado.                       |
| RF-16 | T6, T8, T9, T38         | Labels asociadas a campos y Select.                       |
| RF-17 | T6, T8                  | Ayuda asociada a Input/Textarea.                          |
| RF-18 | T6, T8                  | Campo inválido identificable.                             |
| RF-19 | T6, T8, T38             | Mensaje de error asociado.                                |
| RF-20 | T5, T7                  | ReadOnly impide cambios.                                  |
| RF-21 | T7                      | Textarea conserva multilínea.                             |
| RF-22 | T9                      | Selección simple.                                         |
| RF-23 | T9                      | Callback de valor elegido.                                |
| RF-24 | T9                      | Valor vacío representable.                                |
| RF-25 | T9, T38                 | Select operable por teclado.                              |
| RF-26 | T9                      | Opción deshabilitada no seleccionable.                    |
| RF-27 | T9, T38                 | Select con label accesible.                               |
| RF-28 | T10                     | Error de Select visible.                                  |
| RF-29 | T10, T38                | Error asociado a Select.                                  |
| RF-30 | T12                     | Foco inicial dentro de Dialog.                            |
| RF-31 | T12, T39                | Tab/Mayús+Tab contenidos.                                 |
| RF-32 | T11                     | Cierres default y flags independientes.                   |
| RF-33 | T11                     | Callback al solicitar cierre habilitado.                  |
| RF-34 | T14                     | Cierre bloqueado en operación pendiente.                  |
| RF-35 | T13, T39                | Restauración por cadena de destinos.                      |
| RF-36 | T12, T39                | Dialog identificado por título accesible.                 |
| RF-37 | T16                     | Filas y columnas propias renderizadas.                    |
| RF-38 | T17                     | Estado de carga.                                          |
| RF-39 | T17                     | Vacío solo tras respuesta exitosa.                        |
| RF-40 | T17                     | Error conserva snapshot previo.                           |
| RF-41 | T18                     | Solicitud de página comunicada.                           |
| RF-42 | T18                     | Límites de paginación.                                    |
| RF-43 | T18                     | Página actual identificada.                               |
| RF-44 | T20                     | Columna/dirección solicitada.                             |
| RF-45 | T20                     | Orden activo identificable.                               |
| RF-46 | T21, T38                | Tabla usable por teclado/AT.                              |
| RF-47 | T2, T21, T37            | Overflow local y layout adaptable.                        |
| RF-48 | T22                     | Badge textual.                                            |
| RF-49 | T22, T38                | Significado independiente de color.                       |
| RF-50 | T23                     | Cuatro tipos de Toast.                                    |
| RF-51 | T24                     | Timer acumulado con pausa.                                |
| RF-52 | T23                     | Warning/error persistente.                                |
| RF-53 | T23                     | Cierre manual.                                            |
| RF-54 | T25, T38, T39           | Anuncio sin cambiar foco.                                 |
| RF-55 | T23                     | Cierre independiente simultáneo.                          |
| RF-56 | T26                     | Activación por pointer.                                   |
| RF-57 | T26                     | Activación por foco.                                      |
| RF-58 | T27                     | Escape oculta.                                            |
| RF-59 | T26                     | Tránsito pointer al contenido.                            |
| RF-60 | T26, T38                | Descripción asociada sin sobrescritura.                   |
| RF-61 | T29                     | Forma Skeleton muestra espacio pendiente.                 |
| RF-62 | T29                     | Skeleton no entra en tab order.                           |
| RF-63 | T29, T39                | Formas decorativas no se anuncian.                        |
| RF-64 | T31, T32                | Página demo contiene once primitivas.                     |
| RF-65 | T32–T35                 | Estados aplicables en ejemplos.                           |
| RF-66 | T33                     | Cierre configurable en demo.                              |
| RF-67 | T33                     | Paginación y ordenación en demo.                          |
| RF-68 | T34                     | Cuatro tipos de Toast en demo.                            |
| RF-69 | T31, T32, T35           | Demo sin backend ni credenciales.                         |
| RF-70 | T36                     | Bundle/preview sin código ni acceso demo.                 |
| RF-71 | T4                      | Button no envía form por defecto.                         |
| RF-72 | T5                      | Seis tipos válidos.                                       |
| RF-73 | T20                     | Ordenación de una columna.                                |
| RF-74 | T20                     | Primera ordenación ascendente.                            |
| RF-75 | T20                     | Ascendente cambia a descendente.                          |
| RF-76 | T20                     | Descendente limpia orden.                                 |
| RF-77 | T20                     | Nueva columna sustituye y empieza ascendente.             |
| RF-78 | T18                     | Tamaño fijo sin selector usuario.                         |
| RF-79 | T19                     | Ajuste a última página si queda disponible.               |
| RF-80 | T19                     | Vacío representa 0/0 y navegación deshabilitada.          |
| RF-81 | T19                     | Filas anteriores durante loading.                         |
| RF-82 | T12                     | Título recibe foco sin controles.                         |
| RF-83 | T11                     | Fondo no interactuable ni anunciado mientras modal.       |
| RF-84 | T14                     | Dialog sigue operable con cierre bloqueado.               |
| RF-85 | T16                     | Límite de alto y scroll interno.                          |
| RF-86 | T27                     | Pointer/foco mantienen visible.                           |
| RF-87 | T27                     | Se oculta al salir de interacción.                        |
| RF-88 | T28                     | Solo reentrada del pointer reactiva tras Escape.          |
| RF-89 | T11                     | Remoción/deshabilitación limpia valor.                    |
| RF-90 | T11                     | Opción vacía limpia selección.                            |
| RF-91 | T11                     | Sin opciones, Select disabled con mensaje.                |
| RF-92 | T29, T39                | Un anuncio de carga accesible.                            |
| RF-93 | T5                      | Default Input text.                                       |
| RF-94 | T20                     | Snapshot visible durante corrección válida.               |
| RF-95 | T5                      | Tipo inválido produce error y no monta control.           |
| RF-96 | T13, T39                | Fallback alternativo disponible hasta cierre.             |

## Requisitos no funcionales

- T1, T2 y T37: dirección y escalas visuales compartidas, foco, contraste, 360 px/escritorio y reduced motion.
- T29, T38 y T39: APIs propias, accesibilidad con teclado y AT, sin tipos PrimeReact en consumidores.
- T16–T21: server state y peticiones permanecen en consumidores; ningún cache/estado de negocio dentro de primitivas.
- T31–T36: demo local con fixtures ficticias; nunca se empaqueta código/datos/recursos exclusivos.
- T41: evidencia de comandos/test/build y regresión de bootstrap.

Solicitar aprobación de estas tareas antes de implementar T1.
