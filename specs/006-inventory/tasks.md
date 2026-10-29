# Tareas - Spec 006 Inventario

Plan aprobado explícitamente por el usuario. Todas las tareas comienzan pendientes. Su numeración define dependencias, no autoriza implementar sin petición explícita. Cada tarea está acotada a aproximadamente 30 minutos de trabajo activo, sin contar ejecución de suites ni esperas externas; si no cabe, detenerse y solicitar su división conservando trazabilidad.

Cada comportamiento incluye escribir o actualizar primero su prueba. Los archivos de evidencia mencionados son destinos propuestos, no pruebas ya implementadas ni resultados de cumplimiento. Usar Impeccable al crear o mejorar vistas, primitivas propias, tokens y CSS co-localizado. No modificar backend, spec o plan por inferencia.

- [x] T1. Incorporar captura OpenAPI y generación reproducible de contratos de Inventario. (RF-5–RF-18, RF-29, RF-36, RF-77; NFR-7)
  Hecho cuando: la prueba contractual contrasta métodos, parámetros y esquemas de `/inventory` y `/inventory/{productUuid}/movements` con la captura real; los scripts reproducibles producen tipos en `shared/api/generated`. El test documenta el orden backend de movimientos por fecha descendente y desempate UUID ascendente. Verificado con `pnpm snapshot:inventory-openapi`, `pnpm generate:inventory-contracts`, la prueba contractual, lint, formato, typecheck y la suite unitaria completa; no se crearon wrappers de escritura.
- [x] T2. Validar íntegramente las respuestas del listado de Inventario. (RF-5–RF-13, RF-66–RF-67, RF-77; NFR-7)
  Hecho cuando: `tests/inventory/inventory-contract.test.ts` acepta respuestas contractuales y rechaza campos obligatorios ausentes, cantidades negativas/fraccionarias/no finitas, paginación inválida y estados desconocidos o incoherentes. `parseInventoryListResponse` rechaza la respuesta completa; no sustituye datos ausentes por cero ni redondea valores. Evidencia: 42 pruebas del contrato y 732 pruebas unitarias pasan; lint, formato, typecheck y build pasan.
- [x] T3. Validar la respuesta mínima del último movimiento por producto. (RF-14–RF-18, RF-68; NFR-7)
  Hecho cuando: `tests/inventory/latest-movement-contract.test.ts` cubre los tres tipos, fecha/cantidad inválidas, producto ajeno, límite incumplido y vacío contradictorio con total positivo. El parser solo devuelve ausencia para una respuesta válida vacía; no transforma errores en «Sin movimientos» ni usa updatedAt de inventario. Evidencia: 35 pruebas del contrato y 767 pruebas unitarias pasan; lint, formato, typecheck y build pasan.
- [x] T4. Definir criterios, parser, serializador y traducción HTTP del listado. (RF-19–RF-20, RF-29–RF-43)
  Hecho cuando: `tests/inventory/inventory-list-url-state.test.ts` verifica página positiva segura, tamaño fijo 15, trim/blancos, actividad separada de stock, tres estados/todos, cinco campos, ambas direcciones, defaults, duplicados e inválidos. La URL canónica y los parámetros HTTP tipados coinciden con el plan; `all` omite el filtro remoto de existencias. Evidencia: 28 pruebas de URL/criterios y 795 pruebas unitarias pasan; lint, formato, typecheck y build pasan.
- [x] T5. Implementar la lectura HTTP del listado detrás de la API de Inventario. (RF-19–RF-24, RF-29–RF-37, RF-56, RF-66–RF-67; NFR-7)
  Hecho cuando: `tests/inventory/inventory-api.test.tsx` verifica GET con parámetros exactos y señal de cancelación, parseo integral y propagación de errores normalizados; no se consulta Productos para completar filas inexistentes ni se agrega una operación de escritura. Evidencia: las 5 pruebas de API y las 800 pruebas unitarias pasan; lint, formato, typecheck, build y `git diff --check` pasan.
- [x] T6. Implementar la lectura HTTP mínima del último movimiento. (RF-14–RF-18, RF-56, RF-68–RF-70; NFR-7)
  Hecho cuando: `tests/inventory/latest-movement-api.test.tsx` verifica únicamente GET por producto con `page=1&limit=1`, sin filtros adicionales ni descarga del historial; pasa signal, valida la respuesta y distingue vacío de red/5xx/contrato/404. Evidencia: las 7 pruebas de API y las 807 pruebas unitarias pasan; lint, formato, typecheck, build y `git diff --check` pasan.
- [x] T7. Crear StockStatusBadge con etiquetas de existencias independientes de actividad. (RF-9–RF-11, RF-63; NFR-5–NFR-6)
  Hecho cuando: `tests/inventory/stock-status-badge.test.tsx` verifica «Con existencias», «Stock bajo» y «Sin existencias» mediante Badge propio, sin depender solo del color ni exponer tipos PrimeReact. Cero/mínimo cero, positivo igual al mínimo y superior al mínimo quedan cubiertos por fixtures coherentes con el contrato; estilos locales usan tokens. Evidencia: 3 pruebas focalizadas y 810 pruebas unitarias pasan; lint, formato, typecheck, build, detector Impeccable y `git diff --check` pasan.
- [x] T8. Registrar Inventario y su página inicial bajo el App Shell. (RF-1–RF-4, RF-65; NFR-6)
  Hecho cuando: `tests/app-shell/inventory-route.test.tsx` verifica entrada directa, pending/error/ausencia/confirmación de sesión, conservación de URL y foco en «Inventario»; `tests/app-shell/router.test.tsx` verifica el enlace tras Categorías y la navegación. La página inicial no introduce llamadas de negocio; se ajustan expectativas de enlaces y teclado sin crear funcionalidades de Fase 6. Evidencia: 813 pruebas unitarias, 85 E2E `bootstrap-smoke`, lint, formato, typecheck, build, detector Impeccable y `git diff --check` pasan.
- [x] T9. Incorporar el ámbito de sesión de Inventario y su limpieza focalizada. (RF-4, RF-60; NFR-7)
  Hecho cuando: `InventorySessionScope`, expuesto por la API pública y montado sobre el Outlet, cancela y retira solo claves `inventory` de la sesión abandonada. A→B verifica señal abortada y caché de otras features y de B intacta; logout verifica que otras features se conservan. Ambas pruebas ejecutan bajo StrictMode sin limpiezas prematuras. No copia sesión a Zustand ni crea coordinador de mutaciones. Evidencia: 815 pruebas unitarias y 12 E2E de sesión/logout/inventario pasan; lint, formato, typecheck, build y `git diff --check` pasan.
- [x] T10. Conectar consulta remota, filas y paginación controlada. (RF-5–RF-12, RF-19–RF-22, RF-66–RF-67)
  Hecho cuando: `tests/inventory/inventory-list-page.test.tsx` comprueba GET predeterminado, quince filas, valores exactos sin redondeo, actividad y stock diferenciados, total remoto y segunda página; Auth pendiente/ausente no consulta. La query key incluye sesión y parámetros, usa `retry: false` y solo representa filas devueltas por Inventario, sin inventar existencias para productos sin registro. Evidencia: 818 pruebas unitarias pasan; lint, formato, typecheck, build, detector Impeccable y `git diff --check` pasan.
- [x] T11. Presentar carga, errores recuperables y estados vacíos del listado. (RF-13, RF-23–RF-26, RF-64)
  Hecho cuando: pruebas diferidas/fallidas verifican carga identificable, error por red/5xx con retry manual de GET y criterios conservados, vacío y limpieza de búsqueda aplicada. Un cuerpo inválido muestra error global sin resultados parciales; nunca se presenta el snapshot de otro criterio como vigente. Evidencia: 826 pruebas unitarias pasan; lint, formato, typecheck, build, detector Impeccable y `git diff --check` pasan.
- [x] T12. Corregir páginas fuera de rango mediante replace. (RF-27–RF-28, RF-40, RF-42, RF-74)
  Hecho cuando: `tests/inventory/inventory-list-page.test.tsx` parte de páginas excesivas con total positivo/cero y comprueba última página o 1; la corrección reemplaza la entrada, no entra en bucle y Atrás/Adelante no recupera la página inválida ni borra los demás criterios. Evidencia: 829 pruebas unitarias pasan; lint, formato, typecheck, build, detector Impeccable y `git diff --check` pasan.
- [x] T13. Incorporar búsqueda y filtros acumulados de actividad y existencias. (RF-26, RF-29–RF-35, RF-38–RF-40, RF-62)
  Hecho cuando: pruebas de UI con MSW verifican coincidencias parciales de nombre/SKU insensibles a mayúsculas, trim/blancos, activos/inactivos y tres estados/todos aplicados conjuntamente. El envío deliberado vuelve a página 1; limpiar búsqueda conserva filtros y los controles tienen labels propios. Evidencia: 831 pruebas unitarias pasan; lint, formato, typecheck, build, detector Impeccable y `git diff --check` pasan.
- [x] T14. Incorporar ordenación remota sin reinicios de página indebidos. (RF-36–RF-39)
  Hecho cuando: pruebas recorren los cinco campos y ambas direcciones, verifican parámetros de cada consulta y página 1 al cambiar orden; cambiar solo de página conserva búsqueda/filtros/orden. No se ordenan únicamente las filas locales.
  Evidencia: `tests/inventory/inventory-list-page.test.tsx` comprueba las diez combinaciones campo/dirección desde página 2, los parámetros HTTP exactos, el reinicio a página 1 y la paginación con criterios conservados. Las 832 pruebas unitarias, lint, formato, typecheck, build, detector Impeccable y `git diff --check` pasan.
- [x] T15. Verificar URL compartible, recarga e historial en navegador. (RF-40–RF-43, RF-74)
  Hecho cuando: `tests/browser/inventory-list-url.bootstrap-smoke.spec.ts` restaura controles y resultados al entrar/recargar una URL completa, recorre Atrás/Adelante y verifica normalización replace de criterios inválidos/duplicados sin reinicio deliberado ni historial adicional.
  Evidencia: los 2 escenarios de URL de Inventario verifican entrada directa, recarga, Atrás/Adelante, parámetros restaurados y normalización `replace` que conserva página válida. Se aplicó esa normalización en `InventoryPage`; 89 pruebas E2E, 832 pruebas unitarias, lint, formato, typecheck, build, detector Impeccable, formato Markdown y `git diff --check` pasan.
- [x] T16. Aislar respuestas de consultas de listado reemplazadas. (RF-44)
  Hecho cuando: dos respuestas MSW diferidas terminan en orden inverso y solo permanecen filas de los criterios vigentes; la prueba comprueba claves distintas y ausencia de filas previas presentadas como resultado actual. Cancelar no produce alerta espuria de red.
  Evidencia: `tests/inventory/inventory-list-page.test.tsx` libera primero la respuesta vigente y después la anterior; verifica dos claves/consultas distintas, ausencia de filas obsoletas y de alerta tras cancelar. Pasan las 833 pruebas unitarias, lint, formato, typecheck, build y `git diff --check`.
- [x] T17. Formatear el último movimiento con semántica de cantidad y UTC explícito. (RF-14–RF-18; NFR-5)
  Hecho cuando: `tests/inventory/format-stock-movement.test.ts` verifica Entrada/Salida/Ajuste, cantidad transaccionada frente a existencia resultante, fecha/hora UTC en español y cruce de día bajo una zona local distinta. No calcula stock a partir del movimiento ni usa updatedAt como sustituto.
  Evidencia: `format-stock-movement.ts` conserva `createdAt` para `<time>`, etiqueta y formatea fecha/hora con zona UTC, y usa `quantity` para entradas/salidas y `newStock` para ajustes. Las 837 pruebas unitarias, lint, formato, typecheck, build y `git diff --check` pasan.
- [x] T18. Conectar celdas autónomas del último movimiento y sus estados pendientes/vacíos. (RF-14–RF-18, RF-78–RF-80)
  Hecho cuando: `tests/inventory/latest-stock-movement.test.tsx` difiere las lecturas, mantiene existencias visibles con carga por celda y solo muestra «Sin movimientos» tras respuesta válida vacía. La query key incluye sesión/producto, usa signal y `retry: false`; las consultas nacen solo de filas validadas, con un máximo inicial de quince GET de movimiento para una página completa y deduplicación de observadores.
  Evidencia: `LatestStockMovementCell` presenta cada consulta de forma independiente y `use-latest-stock-movement.ts` usa clave sesión/producto, `AbortSignal` y `retry: false`. Cuatro pruebas verifican carga diferida, vacío válido, rechazo del listado antes de consultar, límite de quince movimientos y deduplicación. Pasan las 841 pruebas unitarias, lint, formato, typecheck, build y `git diff --check`.
- [x] T19. Recuperar fallos de movimientos sin bloquear Inventario ni repetir otras consultas. (RF-68–RF-70, RF-78–RF-80)
  Hecho cuando: errores de red/5xx/respuesta inválida producen «No se pudo consultar», conservan datos válidos y ofrecen retry exclusivo de la celda. Las pruebas cuentan solicitudes de listado y otras celdas para demostrar que no se repiten; 404 no se convierte en ausencia de movimientos ni stock cero.
  Evidencia: `LatestStockMovementCell` clasifica errores por causa, preserva las existencias, y ofrece reintento contextual únicamente para red, 5xx y contrato inválido. Las pruebas verifican esas tres causas y cuentan solicitudes: retry repite solo el GET afectado; el 404 muestra error sin «Sin movimientos», retry ni alterar stock. Pasan las 845 pruebas unitarias, lint, formato, typecheck, build y `git diff --check`.
- [ ] T20. Descartar movimientos tardíos de filas retiradas o páginas anteriores. (RF-44, RF-69)
  Hecho cuando: pruebas cambian página o criterios con movimientos pendientes y resuelven luego los anteriores; no aparece fecha/tipo/cantidad de otro producto ni se mueve el foco o se anuncia un fallo por una cancelación. No se precargan otras páginas ni el historial de movimientos.
- [ ] T21. Tratar rechazos 403 de listado y movimientos sin retry directo. (RF-59, RF-69, RF-76; NFR-7)
  Hecho cuando: las pruebas simulan ambas lecturas denegadas, muestran acceso no permitido y excluyen retry directo; un 403 de celda no oculta las existencias válidas disponibles ni utiliza «Sin movimientos» o mensajes privados del servidor.
- [ ] T22. Revalidar Auth ante 401 de lectura sin bucles ni tormentas. (RF-4, RF-58, RF-75)
  Hecho cuando: pruebas de listado/celdas simulan 401 simultáneos, comparten una comprobación pendiente por sesión y bloquean el retry directo de las consultas rechazadas; Auth determina el estado mostrado, no se reenvían GET en bucle y una respuesta de sesión antigua no solicita revalidar la nueva.
- [ ] T23. Probar aislamiento de sesión durante lecturas diferidas de Inventario. (RF-4, RF-60, RF-69; NFR-7)
  Hecho cuando: listado y movimientos pendientes resuelven después de A→B o logout; `tests/inventory/inventory-query-session-scope.test.tsx` verifica cancelación/retirada de claves A y que no aparecen filas, celdas, avisos ni cambios de foco de A en B. Las pruebas restauran el estado global de Auth al terminar.
- [ ] T24. Definir y exponer la validación estricta del retorno a Inventario. (RF-47, RF-50, RF-53–RF-54)
  Hecho cuando: `tests/inventory/inventory-return-to.test.ts` acepta solo `/inventory` con criterios válidos/únicos y devuelve URL canónica. Rechaza externos, `//`, barras inversas, controles, fragmentos, claves desconocidas, rutas codificadas evasivas, criterios inválidos y returnTo duplicado; la API pública expone solo lo necesario para la composición.
- [ ] T25. Ampliar la API pública de edición de Productos con integración opcional de navegación. (RF-45, RF-47–RF-55; NFR-10)
  Hecho cuando: pruebas del constructor público de enlaces y del contrato opcional prueban el destino validado y que montar `ProductEditPage` sin integración conserva resolver/defaults previos. No se duplica el formulario ni se importa Inventario desde Productos; no se aceptan destinos internos arbitrarios.
- [ ] T26. Componer las rutas y el enlace Editar desde Inventario. (RF-45–RF-47, RF-53–RF-54)
  Hecho cuando: `product-edit-route.tsx` integra APIs públicas y suministra la política de retorno; Inventario recibe el constructor por props. Una prueba abre edición desde fila para ADMIN/MANAGER/OPERATOR/VIEWER sin ocultar la acción por rol; no hay imports de internos ni dependencia circular.
- [ ] T27. Conectar guardado, Cancelar y descarte con el origen de Inventario. (RF-48–RF-50, RF-55, RF-71)
  Hecho cuando: pruebas de edición desde Inventario cubren éxito confirmado, Cancelar limpio/sucio y reload conservando origen. Cancelar vuelve al inventario; descartar tras enlace/Atrás/Adelante continúa al destino intentado. No se implementa Cancelar con `navigate(-1)` ni se omiten los bloqueos pendientes del formulario existente.
- [ ] T28. Conservar el origen en errores de dirección y producto inexistente. (RF-51, RF-53–RF-55)
  Hecho cuando: pruebas cubren UUID inválido sin GET, GET 404 y PATCH 404 con retorno a los criterios de Inventario. El PATCH 404 conserva valores readonly, excluye reenvío y mantiene el guard previo; origen ausente o inválido conserva fallback de Productos.
- [ ] T29. Reconsultar Inventario y movimientos al regresar incluso con caché fresh. (RF-27–RF-28, RF-52, RF-74)
  Hecho cuando: pruebas precargan caché fresca y vuelven desde edición, reciben GET actuales de listado/movimientos y no insertan manualmente una fila renombrada o que dejó de coincidir. La desaparición de la última fila corrige página con replace y conserva filtros/orden.
- [ ] T30. Transportar y presentar confirmación de edición ligada a sesión y destino. (RF-48, RF-60, RF-72)
  Hecho cuando: el éxito contractual de PATCH emite solo metadata de confirmación en location.state; Inventario muestra «Producto actualizado correctamente.» solo para sesión/destino válidos. Pruebas verifican su conservación en correcciones replace de la misma consulta y que marcadores antiguos/ajenos no producen éxito ni otro PATCH; Productos conserva su feedback previo.
- [ ] T31. Separar guardado confirmado del fallo de lectura posterior y sus permisos. (RF-72–RF-73, RF-75–RF-76)
  Hecho cuando: pruebas fuerzan GET 503/401/403 tras un PATCH válido; el éxito persiste solo en la sesión vigente, el retry permitido repite únicamente GET y nunca PATCH, 401 da prioridad a Auth y 403 excluye retry. Contadores y navegación demuestran la separación de escritura y lectura.
- [ ] T32. Descartar efectos de edición tardíos tras cerrar o sustituir sesión. (RF-55, RF-60, RF-69, RF-72)
  Hecho cuando: pruebas difieren PATCH exitoso/rechazado y retorno, cambian A→B o logout y verifican que A no navega, enfoca, restaura formulario/guard, invalida caché vigente ni presenta confirmación/errores en B. Los marcadores de historial tampoco restauran éxito ajeno.
- [ ] T33. Verificar la compatibilidad completa de edición de Productos y Categorías. (RF-53, RF-55, RF-71; NFR-10)
  Hecho cuando: regresiones de Productos prueban origen desde Productos y entrada directa además del nuevo origen; siguen pasando validación de SKU/precios/categorías, PATCH parcial, categoría original inactiva/ausente, dirty guard, bloqueo de envíos/campos/salida y modos de error. Solo se corrigen regresiones causadas por la integración, sin ampliar la funcionalidad.
- [ ] T34. Comprobar la ausencia de escrituras de stock y la integridad de payloads de producto. (RF-56–RF-57; NFR-7)
  Hecho cuando: pruebas de integración inspeccionan solicitudes de consulta/edición, verifican exclusivamente GET para inventario/movimientos y PATCH de producto sin quantity/minimumStock; no hay DELETE ni llamadas de entradas/salidas/ajustes/mínimos. La UI no ofrece controles de stock ni historial completo.
- [ ] T35. Verificar teclado, labels, anuncios y foco en el workflow de Inventario. (RF-61–RF-65, RF-78–RF-80; NFR-2)
  Hecho cuando: `tests/browser/inventory-accessibility.bootstrap-smoke.spec.ts` opera búsqueda/filtros/orden/página/Editar/retry sin puntero, identifica producto en el nombre accesible de retry y confirma foco en encabezado al navegar. Las respuestas tardías de celdas no roban foco ni generan una avalancha de anuncios repetidos; stock se entiende sin color.
- [ ] T36. Verificar y corregir responsive de Inventario. (RF-5–RF-18, RF-45, RF-70; NFR-1)
  Hecho cuando: Playwright a 360/768/1280 px comprueba documento sin overflow horizontal, scroll local de tabla y controles/Editar/retry alcanzables; datos extensos no se pierden ni se esconden campos requeridos. Cualquier corrección focalizada usa CSS local y se repite la comprobación afectada.
- [ ] T37. Verificar acciones con zoom nativo al 200 %. (RF-45, RF-61, RF-70; NFR-3)
  Hecho cuando: se amplía `native-zoom` para Inventario, con Chromium visible y preferencia nativa real, comprobando filtros, Editar y retry de celda disponibles tras scroll. Se documentan métricas, revisión manual y entorno; sin escritorio gráfico se registra bloqueo, no equivalencia de viewport.
- [ ] T38. Verificar movimiento reducido e idioma de los estados. (RF-14–RF-17, RF-23–RF-26, RF-59, RF-68–RF-70, RF-78–RF-80; NFR-4–NFR-5)
  Hecho cuando: pruebas emulan movimiento reducido y recorren consulta/edición/retry sin movimiento obligatorio; labels, errores, estados y cantidades del movimiento se presentan en español con UTC explícito y no solo enums técnicos. Se conserva el comportamiento nativo de los avisos heredados de edición.
- [ ] T39. Completar revisión humana de accesibilidad del workflow. (RF-61–RF-65; NFR-2)
  Hecho cuando: una persona recorre listado/filtros, edición/retorno y carga/error/retry del último movimiento con Narrator y teclado, revisa contraste contextual y foco y registra responsable, entorno/versiones, resultado y barreras. Las barreras se corrigen y se repite su escenario; assertions ARIA no sustituyen esta revisión.
- [ ] T40. Auditar consistencia visual y fronteras de UI con Impeccable. (RF-5–RF-18, RF-61–RF-65; NFR-6)
  Hecho cuando: revisión Impeccable y detector sobre la UI terminada documentan tokens, CSS local, primitivas propias y coherencia con Productos/Categorías, sin imports PrimeReact externos. Se realiza una pasada desktop/mobile agrupada, una corrección focalizada de hallazgos y como máximo una confirmación adicional, sin rediseñar App Shell ni optimizar el bundle global fuera de alcance.
- [ ] T41. Verificar privacidad de errores y metadata de retorno. (RF-13, RF-58–RF-59, RF-68–RF-73; NFR-8)
  Hecho cuando: fixtures con centinelas sensibles de mensajes/campos/stack en listado, movimientos y lectura tras edición no aparecen en UI ni console de aplicación; location.state no contiene datos de producto, respuestas crudas ni credenciales. El texto se deriva de errores normalizados y no de mensajes privados.
- [ ] T42. Preparar fixture MSW y montaje de Inventario exclusivamente de pruebas. (RF-19, RF-47, RF-56; NFR-9)
  Hecho cuando: un harness probado atiende Auth, inventario, movimientos y detalle/PATCH de Productos con datos ficticios y registro de solicitudes; incluye catch-all que impide tráfico real y solo se sirve al habilitar el mecanismo de pruebas de desarrollo. Conserva los workflows existentes y no requiere cuenta/backend personal.
- [ ] T43. Incorporar workflow E2E simulado de Inventario y edición con retorno. (RF-14–RF-17, RF-19–RF-22, RF-29–RF-42, RF-45–RF-52, RF-56–RF-57, RF-68–RF-73, RF-78–RF-80; NFR-9)
  Hecho cuando: Playwright predeterminado recorre criterios acumulados, último movimiento válido/vacío/error con retry independiente y edición guardada con retorno al origen. Inspecciona parámetros/métodos/payloads y ausencia de escritura de stock; un GET posterior fallido no repite PATCH. Respuestas diferidas demuestran existencias visibles antes de terminar movimientos.
- [ ] T44. Extender preview-smoke sin recursos de desarrollo. (RF-2–RF-3, RF-14–RF-17, RF-45–RF-52; NFR-9–NFR-10)
  Hecho cuando: el bundle de producción muestra Inventario y el retorno desde edición con Auth/GET/PATCH simulados; las pruebas comprueban exclusión de demo/harnesses/worker en bundle/servidor y ninguna llamada de negocio al backend real. Las comprobaciones existentes de Productos/Categorías siguen pasando.
- [ ] T45. Consolidar regresiones del nuevo destino en App Shell y Auth. (RF-1–RF-4, RF-60–RF-65; NFR-10)
  Hecho cuando: pruebas compactas/persistentes recorren Inicio/Productos/Categorías/Inventario por teclado, con tooltips colapsados y orden de foco actualizado; pasan historial/logout/session boundary y sustitución de sesión. No se deducen permisos del rol ni se cambia el flujo real de Auth.
- [ ] T46. Ejecutar verificación global y consolidar evidencia RF/NFR. (RF-1–RF-80; NFR-1–NFR-10)
  Hecho cuando: se registran resultados reales de lint, formato, typecheck, Vitest, build y todos los proyectos E2E del plan en secuencia, junto con revisiones humanas y una matriz final de archivo/prueba/resultado por RF/NFR. No se cierra con pruebas fallidas, revisiones pendientes o bloqueos ocultos; una casilla marcada no sustituye evidencia.

## Orden y dependencias

El orden numérico es compatible con las dependencias, pero no exige ejecutar ramas independientes en paralelo. Los proyectos Playwright deben correr secuencialmente porque comparten 5174. Cada tarea de UI incluye su prueba y revisión focalizada; T35–T41 completan verificaciones transversales, no posponen la cobertura básica.

| Tarea | Depende de | Motivo |
| --- | --- | --- |
| T1 | Ninguna | Establece contratos antes de consumir datos. |
| T2 | T1 | Valida el listado a partir del contrato generado. |
| T3 | T1 | Valida el movimiento mínimo sin inventar datos. |
| T4 | T1 | Usa campos/filtros contractuales en URL y HTTP. |
| T5 | T2, T4 | Conecta parámetros y parser del listado. |
| T6 | T3 | Conecta lectura y parser de movimientos. |
| T7 | T2 | Representa estados válidos mediante UI propia. |
| T8 | Ninguna | Registra página y acceso antes de consultas. |
| T9 | T8 | Añade lifecycle al ámbito autenticado existente. |
| T10 | T4–T5, T7–T9 | Conecta listado con datos, sesión y tabla. |
| T11 | T10 | Completa estados de la lectura integrada. |
| T12 | T10–T11 | Corrige páginas utilizando total y URL. |
| T13 | T4, T10–T12 | Integra criterios y sus estados vacíos. |
| T14 | T13 | Añade orden conservando el ciclo de criterios. |
| T15 | T12–T14 | Prueba criterios completos en navegador. |
| T16 | T13–T14 | Verifica aislamiento entre consultas reales. |
| T17 | T3 | Formatea datos válidos con semántica contractual. |
| T18 | T6, T9–T10, T17 | Monta queries y celdas sobre filas válidas. |
| T19 | T18 | Separa error/retry del movimiento. |
| T20 | T16, T18–T19 | Cubre reemplazo de página y celdas pendientes. |
| T21 | T11, T19 | Cubre permisos en ambas superficies de error. |
| T22 | T9, T11, T19, T21 | Coordina Auth y exclusiones de retry. |
| T23 | T9, T16, T20–T22 | Prueba lifecycle de todas las lecturas. |
| T24 | T4 | Valida origen usando criterios completos. |
| T25 | T24 | Introduce integración opcional sin cambiar defaults. |
| T26 | T8, T10, T24–T25 | Une rutas/enlaces por APIs públicas. |
| T27 | T26 | Completa retorno del workflow editable. |
| T28 | T27 | Extiende retorno a estados de error heredados. |
| T29 | T12, T18, T27–T28 | Reconsulta listado/celdas al volver de edición. |
| T30 | T23, T27 | Transporta éxito ligado a sesión y destino. |
| T31 | T21–T22, T29–T30 | Diferencia escritura válida de lectura fallida. |
| T32 | T23, T28, T30–T31 | Descarta efectos tardíos de edición/confirmación. |
| T33 | T25–T32 | Verifica compatibilidad del workflow integrado. |
| T34 | T29–T33 | Inspecciona métodos y payloads finales. |
| T35 | T15, T19–T22, T27–T31 | Recorre controles, retry y navegación finales. |
| T36 | T35 | Revisa disponibilidad de datos y acciones por ancho. |
| T37 | T35–T36 | Distingue zoom real de viewport equivalente. |
| T38 | T19, T27, T35 | Verifica idioma/movimiento de estados completos. |
| T39 | T35–T38 | Revisión humana del workflow terminado. |
| T40 | T36–T39 | Auditoría final tras completar accesibilidad. |
| T41 | T21–T23, T30–T32 | Revisa errores y metadata ya integrados. |
| T42 | T15, T26–T31 | Simula el workflow contractual completo. |
| T43 | T34, T42 | Ejecuta el workflow con inspección de solicitudes. |
| T44 | T43 | Comprueba experiencia y exclusiones en producción. |
| T45 | T8, T23, T32, T35 | Consolida App Shell, teclado y Auth. |
| T46 | T1–T45 | Consolida toda la evidencia y regresión. |

## Cobertura de requisitos

Los rangos incluyen todos los identificadores intermedios. Esta matriz asigna evidencia planificada; al ejecutar cada tarea se añadirán archivos, pruebas, comandos y resultados reales sin sustituirlos por referencias a RF.

| RF | Tarea | Evidencia |
| --- | --- | --- |
| RF-1–RF-4 | T8–T10, T22–T23, T45 | Router, sesión confirmada y ausencia de consultas antes de Auth; navegación principal. |
| RF-5–RF-8 | T1–T2, T10 | Contratos y filas con nombre/SKU/cantidad/mínimo exactos. |
| RF-9–RF-12 | T2, T7, T10 | Tres estados, límites, actividad diferenciada y valores sin redondear. |
| RF-13 | T2, T11 | Un registro inválido rechaza el listado entero sin filas parciales. |
| RF-14–RF-16 | T1, T3, T6, T17–T18, T43 | Último movimiento mínimo, tipos/cantidades y fecha UTC. |
| RF-17–RF-18 | T3, T6, T18–T19 | Vacío solo tras respuesta válida, sin inferir existencias. |
| RF-19–RF-22 | T4–T5, T10, T43 | Parámetros predeterminados, total y paginación remota. |
| RF-23–RF-26 | T11, T13 | Carga, error/retry, vacío y limpiar búsqueda aplicada. |
| RF-27–RF-28 | T12, T29 | Corrección por total y regreso tras cambios del producto. |
| RF-29–RF-35 | T4–T5, T13, T43 | Búsqueda parcial/trim y filtros acumulados con parámetros exactos. |
| RF-36–RF-39 | T4, T14 | Cinco campos/dos órdenes y distinción entre criterio y paginar. |
| RF-40–RF-43 | T4, T12–T15 | URL compartida, reload, historial y normalización replace. |
| RF-44 | T16, T20 | Respuestas fuera de orden y movimientos de filas anteriores. |
| RF-45–RF-46 | T25–T26, T43 | Acción Editar visible para todos los roles contractuales, enlace público. |
| RF-47–RF-50 | T24–T27, T43–T44 | Origen seguro, guardado/Cancelar y persistencia tras reload. |
| RF-51 | T28 | UUID inválido y 404 de carga/guardado con retorno y guard previos. |
| RF-52 | T29, T43–T44 | GET actuales al regresar aunque haya caché fresh. |
| RF-53–RF-54 | T24–T26, T28, T33 | Rechazo de destinos no válidos y fallback de Productos. |
| RF-55 | T25, T27–T28, T32–T33 | Regresión de formulario, selección de categoría, readonly, pending y guards. |
| RF-56–RF-57 | T5–T6, T34, T43 | Solo lecturas de inventario/movimientos; PATCH de producto sin stock. |
| RF-58 | T22 | 401 revalida Auth sin duplicados ni bucles. |
| RF-59 | T21 | 403 de listado/movimiento con mensaje seguro de acceso. |
| RF-60 | T9, T23, T30, T32, T45 | Lecturas, efectos de edición y metadata aislados por sesión. |
| RF-61–RF-62 | T13, T35, T39 | Teclado y controles etiquetados, incluido retry por producto. |
| RF-63 | T7, T35, T39 | Estados comprensibles sin depender solo del color. |
| RF-64–RF-65 | T8, T11, T35, T39 | Anuncios y foco de página sin robos por celdas tardías. |
| RF-66–RF-67 | T2, T5, T10 | Registros existentes; no unión con catálogo ni stock cero inventado. |
| RF-68–RF-70 | T3, T6, T19–T23, T43 | Error independiente y retry solo de la celda, sujeto a sesión/acceso. |
| RF-71 | T27, T33 | Cancelar frente a descarte hacia destino de enlace/historial. |
| RF-72–RF-73 | T30–T32 | Éxito vigente preservado, retry solo GET y exclusiones de acceso. |
| RF-74 | T12, T15, T29 | Corrección replace sin restaurar página fuera de rango. |
| RF-75–RF-76 | T21–T22, T31 | Sin retry directo durante comprobación o tras 403, también después del guardado. |
| RF-77 | T1–T2 | Enteros no negativos, incluidos cero y límites, sin coerción de negativos/fracciones. |
| RF-78–RF-80 | T18–T19, T35, T43 | Carga por celda, existencias visibles y ausencia de falso vacío. |

### Cobertura no funcional

| NFR | Tarea | Evidencia |
| --- | --- | --- |
| NFR-1 | T36 | Overflow del documento, scroll local y acciones a 360/768/1280 px. |
| NFR-2 | T35, T39 | Pruebas de teclado/anuncios/foco y revisión humana con lector/contraste. |
| NFR-3 | T37 | Chromium visible al 200 % nativo, métricas y revisión manual. |
| NFR-4 | T38 | Workflow completo con movimiento reducido. |
| NFR-5 | T7, T17, T38 | Español, UTC y etiquetas semánticas de movimientos. |
| NFR-6 | T7–T8, T40 | Impeccable, tokens/CSS local y primitivas públicas. |
| NFR-7 | T1–T6, T9, T21, T23, T34 | OpenAPI, rechazos, estado por sesión y ausencia de escrituras de stock. |
| NFR-8 | T41 | Centinelas sensibles ausentes de UI/console y metadata mínima. |
| NFR-9 | T42–T44, T46 | MSW, catch-all y browser/preview sin credenciales privadas ni backend personal. |
| NFR-10 | T25, T33, T44–T45 | Flujos previos de Productos/Categorías y App Shell conservados. |

## Verificación y registro

- Ejecutar por tarea lint, typecheck y pruebas focalizadas configuradas; formato de archivos afectados y build cuando cambien rutas, contratos públicos, bundling o harnesses. Probar wrappers si se modifica su comportamiento. No usar imports internos de PrimeReact como contrato de pruebas de features.
- En T46 ejecutar `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test:run` y `pnpm build`. Después ejecutar `pnpm test:e2e --workers=1` y los proyectos `design-system`, `preview-smoke`, `auth-harness` y `native-zoom`, con `--workers=1` y en ese orden secuencial; el predeterminado incluye `proxy-contract`.
- Comprobar Markdown con `pnpm exec prettier --check specs/006-inventory/spec.md specs/006-inventory/plan.md specs/006-inventory/tasks.md` y revisar `git diff --check`. Registrar comandos y resultados reales, incluidos avisos de bundle o harnesses, sin convertir advertencias en éxitos no comprobados.
- Completar en cada tarea su evidencia y en T46 una matriz final RF/NFR que enlace archivos/pruebas/revisiones, resultados y bloqueos. No declarar cumplimiento de la spec solo porque todas las tareas estén marcadas.
- Los nombres de scripts de snapshot/generación propuestos no son operativos hasta T1. No inventar un contrato si falta la fuente OpenAPI. La autorización efectiva del backend no se sustituye con permisos deducidos del rol.
- No marcar revisión manual como completada sin evidencia humana. Si falta escritorio, lector u otra condición, registrar bloqueo; un viewport equivalente no sustituye zoom nativo y ARIA automático no sustituye lector de pantalla.
- Si una tarea revela ambigüedad, discrepancia contractual o cambio de alcance, detener su parte afectada y usar `change-manager`. No modificar stock, mínimos, backend, spec ni plan como efecto lateral.

T1–T46 están pendientes de aprobación de las tareas e implementación explícitamente solicitada, una tarea por petición.
