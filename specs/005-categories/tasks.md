# Tareas - Spec 005 Categorías

Plan aprobado por el usuario. Las tareas comienzan pendientes y solo se marcan completadas con evidencia verificada; su numeración no autoriza implementar una tarea sin petición explícita. Cada unidad está acotada a aproximadamente 30 minutos de trabajo de implementación o verificación, sin contar esperas externas. Si aparece un bloqueo o hace falta dividir una tarea, conservar su identificador y solicitar la actualización correspondiente antes de ampliar alcance.

Cada tarea funcional incluye escribir o actualizar primero la prueba que demuestra su comportamiento. Utilizar Impeccable antes de crear o mejorar vistas, Design System propio y CSS co-localizado. Ejecutar las comprobaciones aplicables al cambio y registrar resultados reales; no marcar como completada una revisión manual pendiente de evidencia humana.

- [x] T1. Verificar los contratos existentes de escritura y los parsers de respuestas de Categorías. (RF-37, RF-40, RF-46, RF-77, RF-93; NFR-7)
  Hecho cuando: pruebas de contrato contrastan POST/PATCH y respuestas con el OpenAPI existente; se rechazan cuerpos inválidos y respuestas de UUID/estado incompatibles; queda explícito que DELETE es eliminación permanente y no se ofrece como desactivación. Si el contrato difiere, se registra el bloqueo sin inventar cambios.
  Evidencia: `tests/categories/categories-openapi-contract.test.ts` y `tests/categories/categories-api.test.tsx`; `pnpm test:run` (55 archivos, 486 pruebas), `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build` pasaron. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T2. Añadir el destino Categorías y su página de listado bajo el App Shell. (RF-1–RF-2, RF-5–RF-6, RF-113)
  Hecho cuando: una prueba de router verifica enlace, acceso directo autenticado a `/categories`, estados de acceso y foco en el encabezado; la página inicial usa el Design System sin introducir lógica de consultas aún.
  Evidencia: `tests/app-shell/router.test.tsx` y `tests/app-shell/categories-route.test.tsx` verifican enlace/URL, foco, sesión pendiente y cerrada, y ausencia de consulta/tabla; smokes de navegación ajustados en `tests/browser/navigation-keyboard.bootstrap-smoke.spec.ts` y `tests/browser/app-layout.bootstrap-smoke.spec.ts`. `pnpm test:run` (56 archivos, 487 pruebas), `pnpm test:e2e` (72 pruebas), lint, typecheck, formato y build pasaron. Capturas revisadas a 1280×720 y 390×844; sin overflow. Detector Impeccable: `[]`. Build conserva aviso no bloqueante de chunk superior a 500 kB.
- [x] T3. Registrar páginas propias de creación y edición con encabezados y acceso protegido. (RF-3–RF-6, RF-113)
  Hecho cuando: pruebas de router abren `/categories/new` y `/categories/:uuid/edit` tras confirmar sesión, presentan los estados de acceso establecidos y enfocan el encabezado de cada nueva página.
- Evidencia: `tests/app-shell/categories-route.test.tsx` prueba ambas URLs directas, sesión pendiente/confirmada/error/ausente, URL preservada y foco en cada encabezado; `tests/app-shell/router.test.tsx` cubre navegación y foco del listado. `pnpm test:run` (56 archivos, 489 pruebas), lint, typecheck, formato y build pasaron. `pnpm test:e2e --workers=1` pasó (72 pruebas). Una ejecución E2E predeterminada con cuatro workers tuvo dos fallos transitorios en smokes existentes de Productos (URL y scroll responsive); ambos pasaron aislados y en la ejecución serial. Revisión visual autenticada a 1280×720 y 390×844, sin overflow y con foco visible; detector Impeccable: `[]`. Build conserva aviso no bloqueante de chunk superior a 500 kB.
- [x] T4. Definir parser, serializador y traducción contractual de criterios del listado. (RF-10–RF-11, RF-20–RF-31)
  Hecho cuando: pruebas unitarias verifican defaults, página positiva, tamaño 15, búsqueda recortada/omitida si vacía, ambos estados, tres campos de orden, ambas direcciones y normalización de criterios inválidos.
- Evidencia: `tests/categories/category-list-url-state.test.ts` cubre defaults, página positiva, trim/omisión de búsqueda, estados, campos/direcciones de orden, duplicados e inválidos; contrasta `buildCategoryListQuery` con tipos OpenAPI y `limit=15`. `pnpm test:run` (57 archivos, 507 pruebas), lint, typecheck, formato y build pasaron. Build conserva aviso no bloqueante de chunk superior a 500 kB.
- [x] T5. Integrar consulta remota de gestión, filas, total y paginación controlada. (RF-8–RF-13)
  Hecho cuando: una prueba MSW verifica nombre, estado, total y quince elementos por página con parámetros predeterminados; otra cambia de página y comprueba la petición y filas remotas sin afectar `useActiveCategories`.
- Evidencia: `tests/app-shell/categories-route.test.tsx` verifica petición predeterminada, 15 filas, nombre, estado, total y cambio a la segunda página con datos remotos; `tests/categories/categories-api.test.tsx` verifica que la consulta administrativa no contamina `useActiveCategories`. `pnpm test:run` (57 archivos, 508 pruebas), `pnpm test:e2e --workers=1` (72 pruebas), lint, typecheck, formato y build pasaron. Detector Impeccable: `[]`. Build conserva aviso no bloqueante de chunk superior a 500 kB.
- [x] T6. Mostrar carga, error con reintento y estados vacíos del listado. (RF-14–RF-17)
  Hecho cuando: pruebas diferidas y fallidas verifican feedback identificable, retry de lectura, vacío general y búsqueda sin resultados con acción de limpieza.
- Evidencia: `tests/app-shell/categories-route.test.tsx` comprueba carga diferida, error accesible, reintento manual sin reenvío automático y vacío general con paginación inicial; `tests/categories/category-list-table.test.tsx` verifica el mensaje para búsqueda sin resultados y la acción `Limpiar búsqueda`. Se preconectó el criterio local sin añadir controles ni estado URL. `pnpm test:run` (58 archivos, 513 pruebas), `pnpm test:e2e --workers=1` (72 pruebas), lint, typecheck, formato y build pasaron. Detector Impeccable: `[]`. Build conserva aviso no bloqueante de chunk superior a 500 kB.
- [x] T7. Corregir páginas fuera de rango sin añadir historial. (RF-18–RF-19, RF-28, RF-30)
  Hecho cuando: pruebas verifican última página con resultados o página 1 si el total es cero; la corrección reemplaza la entrada actual y no produce ciclos de historial.
- Evidencia: `tests/app-shell/categories-route.test.tsx` verifica `page=3` → última página disponible, `page=4` → página 1 con total cero y Atrás/Adelante sin restaurar la página inválida. `pnpm test:run --maxWorkers=1` (58 archivos, 515 pruebas), lint, typecheck, formato y build pasaron. El E2E predeterminado se ejecutó dos veces y ambas ejecuciones tuvieron 71/72 por fallos intermitentes no relacionados en Productos; los dos casos fallidos pasaron al repetirse de forma aislada con Playwright. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T8. Incorporar búsqueda, filtro de estado y ordenación del listado. (RF-20–RF-27)
  Hecho cuando: pruebas de UI verifican parámetros de búsqueda parcial sin distinción de mayúsculas, trim/blancos, búsqueda acumulada con estado, tres campos sort y ambas direcciones; cambiar criterios reinicia página, paginar no.
- Evidencia: `tests/app-shell/categories-route.test.tsx` comprueba búsqueda parcial mixta (`fIC`) con trim y coincidencia insensible a mayúsculas simulada por MSW, búsqueda de blancos omitida, búsqueda acumulada con estado inactivo, campos `name`/`createdAt`/`updatedAt`, direcciones `asc`/`desc`, reinicio a página 1 al cambiar criterios y persistencia de criterios al paginar. `pnpm test:run --maxWorkers=1` (58 archivos, 516 pruebas), lint, typecheck, formato y build pasaron. Inspección Playwright con sesión y API simuladas a 1280×900 y 360×900: sin overflow horizontal. Detector Impeccable: `[]`. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T9. Conectar criterios con URL compartible, recarga e historial. (RF-28–RF-31)
  Hecho cuando: pruebas de router y navegador restauran controles y resultados al abrir URL, recargar y usar Atrás/Adelante; normalizar criterios inválidos no agrega una entrada.
- Evidencia: `tests/app-shell/categories-route.test.tsx` restaura controles y resultados desde una URL completa, verifica los parámetros enviados al backend y conserva el estado al navegar Atrás/Adelante. `tests/browser/category-list-url.bootstrap-smoke.spec.ts` comprueba apertura directa, recarga, cambio de búsqueda, historial Atrás/Adelante y que criterios inválidos se reemplacen sin historial adicional. `pnpm test:e2e --project=bootstrap-smoke tests/browser/category-list-url.bootstrap-smoke.spec.ts` (2 pruebas), `pnpm test:run --maxWorkers=1` (58 archivos, 517 pruebas), lint, typecheck, formato y build pasaron. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T10. Aislar resultados de consultas reemplazadas. (RF-32)
  Hecho cuando: dos respuestas MSW diferidas llegan fuera de orden y solo queda visible el resultado del criterio vigente; no se usa un snapshot de otra clave como resultado actual.
- Evidencia: `tests/app-shell/categories-route.test.tsx` carga primero un resultado, cambia a dos criterios con respuestas MSW diferidas y comprueba que no se muestran filas de otra clave durante la carga; resuelve primero la consulta vigente y después la reemplazada, y solo permanece visible el resultado vigente. La clave administrativa ya incluye sesión y parámetros; la cobertura confirma que no hace falta cambiar la lógica de producción. `pnpm test:run --maxWorkers=1` (58 archivos, 518 pruebas), lint, typecheck, formato y build pasaron. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T11. Construir los campos y esquemas del formulario de Categorías. (RF-33–RF-36, RF-44, RF-133)
  Hecho cuando: pruebas verifican nombre requerido tras trim, descripción opcional y campos con labels; no se inventan límites ni se introducen truncamientos de texto.
- Evidencia: `src/features/categories/schemas/category-form.schema.ts` define el nombre requerido tras trim y descripción de texto opcional, sin límites; `CategoryFormFields` usa labels accesibles y se integra en la página de creación. `tests/categories/category-form.test.tsx` verifica errores para nombre vacío tras trim, descripción vacía válida, texto extenso sin truncar ni `maxLength` y labels visibles. `pnpm test:run --maxWorkers=1` (59 archivos, 522 pruebas), lint, typecheck, formato y build pasaron. Inspección Playwright con sesión simulada a 1280×900 y 360×900: sin overflow horizontal; detector Impeccable: `[]`. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T12. Incorporar la operación de creación tipada y validada. (RF-35, RF-37, RF-92–RF-93)
  Hecho cuando: pruebas MSW verifican POST con nombre/descripción, descripción ausente admitida, respuesta contractual válida y ausencia de reenvío automático tras fallo.
- Evidencia: `createCategory` tipa el payload desde el esquema OpenAPI y valida la respuesta con `parseCategoryDataResponse`; `useCreateCategory` ejecuta POST sin reintentos automáticos e invalida las listas de la sesión solicitante. `tests/categories/categories-api.test.tsx` comprueba cuerpos con descripción y sin ella, categoría creada validada y un único POST ante un fallo 503 aun con retry habilitado por defecto en el cliente de prueba. `pnpm test:run --maxWorkers=1` (59 archivos, 525 pruebas), lint, typecheck, formato y build pasaron. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T13. Conectar creación con espera, bloqueo de duplicados, éxito y retorno. (RF-7, RF-37–RF-39, RF-52–RF-54)
  Hecho cuando: pruebas de UI con respuesta diferida verifican acción visible para distintos roles, campos bloqueados, una sola solicitud y ningún éxito anticipado; confirmada la creación, se vuelve al listado activo/página 1/sin búsqueda/nombre ascendente.
- Implementación y verificación focalizada: `tests/categories/category-create-page.test.tsx` cubre acción visible para ADMIN, MANAGER, OPERATOR y VIEWER; respuesta diferida, bloqueo de campos y envíos duplicados, ausencia de éxito anticipado y retorno con estado predeterminado. `pnpm exec vitest run tests/categories/category-create-page.test.tsx tests/categories/category-form.test.tsx tests/categories/categories-api.test.tsx tests/app-shell/categories-route.test.tsx --maxWorkers=1` (4 archivos, 28 pruebas) pasó. Revisión Playwright simulada a 1280×900 y 360×900 sin overflow; detector Impeccable: `[]`.
- Validación final: el rechazo MSW global se debía a un fixture de Productos que respondía `total: 1` para la página 2, provocando una corrección de página y un GET tardío; al ajustar el total del fixture a 31, `tests/products/product-edit-page.test.tsx` pasó (42/42) y `pnpm test:run --maxWorkers=1` pasó (61 archivos, 537 pruebas). T13 queda completada con esta evidencia.
- [x] T14. Cargar edición y distinguir dirección inválida, inexistencia y fallo recuperable. (RF-40–RF-43, RF-94–RF-96)
  Hecho cuando: pruebas verifican carga inicial no editable, valores recibidos en activos/inactivos, UUID inválido sin petición, 404 con retorno y error de conexión/servidor con retry de consulta.
- Implementación y verificación focalizada: `tests/categories/category-edit-page.test.tsx` cubre detalle pendiente sin campos, datos de categorías activas/inactivas, UUID inválido sin GET, 404 con retorno y reintento manual tras error de red/503. `tests/app-shell/categories-route.test.tsx` incorpora respuesta del detalle para la ruta directa autenticada. `pnpm exec vitest run tests/categories/category-edit-page.test.tsx tests/categories/category-form.test.tsx tests/categories/categories-api.test.tsx tests/app-shell/categories-route.test.tsx --maxWorkers=1` (4 archivos, 30 pruebas) pasó. Lint, typecheck, formato y build pasaron; revisión Playwright simulada a 1280×900 y 360×900 sin overflow; detector Impeccable: `[]`. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- Validación final: `pnpm test:run --maxWorkers=1` pasó (61 archivos, 537 pruebas); `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build` también pasaron. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T15. Construir actualización parcial y retirar descripción sin cambiar el estado. (RF-44–RF-47)
  Hecho cuando: pruebas de esquema/payload comprueban nombre válido, descripción retirada como `null`, campos no modificados omitidos, ausencia de `isActive` y ningún PATCH para un formulario sin cambios.
- Evidencia: `buildCategoryUpdatePayload` acepta valores validados por `categoryFormSchema`, compara nombre/descripción con la categoría original, devuelve solo diferencias, codifica la descripción vacía previa no vacía como `null`, excluye `isActive` por tipo y devuelve `null` cuando no hay cambios para impedir un PATCH vacío. `tests/categories/category-update-payload.test.ts` cubre trim/nombre, omisión de valores sin cambio, retirada de descripción, exclusión del estado y ausencia de cambios. Pruebas focalizadas (2 archivos, 8 pruebas) y `pnpm test:run --maxWorkers=1` (62 archivos, 541 pruebas) pasaron; también lint, typecheck, formato y build. Build conserva el aviso no bloqueante de chunk superior a 500 kB. La conexión HTTP queda para T16.
- [x] T16. Conectar guardado de edición con bloqueo de duplicados y confirmación. (RF-7, RF-48–RF-49, RF-52–RF-54, RF-92–RF-93)
  Hecho cuando: pruebas diferidas verifican edición visible para distintos roles, campos bloqueados, una sola solicitud y éxito únicamente ante respuesta válida; el destino de retorno respeta el origen disponible.
- Implementación y verificación focalizada: `tests/categories/category-edit-form.test.tsx` cubre ADMIN, MANAGER, OPERATOR y VIEWER; PATCH diferido con campos bloqueados, una sola solicitud parcial, ausencia de éxito anticipado, confirmación posterior a respuesta válida y retorno con los criterios de origen. También verifica que una respuesta inválida conserva los valores y no navega; `tests/categories/categories-api.test.tsx` comprueba UUID/estado de respuesta y ausencia de reintento automático. `pnpm exec vitest run tests/categories/category-edit-form.test.tsx tests/categories/categories-api.test.tsx tests/categories/category-edit-page.test.tsx --maxWorkers=1` (3 archivos, 25 pruebas) pasó.
- Validación final: `pnpm test:run --maxWorkers=1` pasó (63 archivos, 551 pruebas); `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build` también pasaron. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T17. Preservar valores y dirty state ante reconsultas del detalle. (RF-50–RF-51)
  Hecho cuando: una prueba modifica campos, provoca una nueva respuesta del detalle y comprueba que los valores locales y la condición de cambios pendientes no se reinicializan.
- Evidencia: `tests/categories/category-edit-page.test.tsx` modifica nombre y descripción, invalida la consulta activa del detalle y recibe valores distintos del servidor; comprueba que se conservan ambos valores locales y que Guardar sigue habilitado antes y después de la reconsulta. La forma ya conserva estos estados al mantener `useForm` montado por UUID y no reinicializarlo al cambiar los datos consultados; no requirió cambios de producción. `pnpm exec vitest run tests/categories/category-edit-page.test.tsx --maxWorkers=1` pasó (1 archivo, 8 pruebas).
- Validación final: `pnpm test:run --maxWorkers=1` pasó (63 archivos, 552 pruebas); `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build` también pasaron. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T18. Presentar nombres duplicados según las reglas del backend. (RF-87, RF-115–RF-116)
  Hecho cuando: pruebas de creación/edición sitúan el conflicto junto al nombre; fixtures cubren diferencias de mayúsculas/espacios exteriores y duplicados con categorías inactivas sin afirmar cuál es el estado del registro que lo ocupa.
- Evidencia: `isDuplicateCategoryNameError` reconoce únicamente HTTP 409 con `CATEGORY_NAME_ALREADY_EXISTS`; creación y edición asocian el conflicto al campo Nombre con un mensaje accionable, ignoran el texto privado del backend y retiran el error al editar el campo. Las pruebas cubren variaciones de mayúsculas y espacios exteriores, incluyendo un conflicto cuyo detalle privado indica un nombre reservado por una categoría inactiva sin exponer ni afirmar el estado del registro. `pnpm exec vitest run tests/categories/category-api-errors.test.ts tests/categories/category-create-page.test.tsx tests/categories/category-edit-form.test.tsx --maxWorkers=1` pasó (3 archivos, 20 pruebas).
- Validación final: `pnpm test:run --maxWorkers=1` pasó (64 archivos, 560 pruebas); `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build` también pasaron. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T19. Recuperar formularios ante rechazos y errores ordinarios de guardado. (RF-57–RF-58, RF-88–RF-93, RF-131–RF-132; NFR-8)
  Hecho cuando: pruebas de creación/edición verifican 403, validación identificable/general, red/5xx y respuesta inválida; conservan valores y permiten corregir solo en la misma sesión vigente, no muestran éxito ni texto interno y no reenvían automáticamente; 401 solicita reconsulta de Auth.
- Evidencia: `category-api-errors.ts` distingue permisos (403), sesión (401), nombre inválido (`INVALID_CATEGORY_DATA`, 400), validación general (`VALIDATION_ERROR`, 400), respuesta exitosa inválida y resultado incierto (red/5xx). Creación y edición presentan errores identificables junto al campo o errores generales en el formulario, no muestran mensajes/detalles privados, conservan valores y liberan los campos al fallar; editar campos retira errores recuperables. Los formularios muestran confirmación solo tras respuesta válida y sesión solicitante vigente; ante 401 reconsultan Auth sin repetir la escritura, y pruebas de sustitución de sesión comprueban que no se presentan ni conservan valores/resultados de la sesión anterior. `pnpm exec vitest run tests/categories/category-api-errors.test.ts tests/categories/category-create-page.test.tsx tests/categories/category-edit-form.test.tsx --maxWorkers=1` pasó (3 archivos, 35 pruebas).
- Validación final: `pnpm test:run --maxWorkers=1` pasó (64 archivos, 575 pruebas); también pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check` y `pnpm build`. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T20. Proteger navegación interna con cambios y permitir continuar o descartar. (RF-60–RF-62, RF-125)
  Hecho cuando: pruebas de router cubren salida por enlace e historial, continuar conservando valores y descartar continuando al destino solicitado; tras descarte no reaparece la advertencia de esos cambios.
- Evidencia: `useCategoryFormNavigationGuard` bloquea salidas internas de formularios sucios; el diálogo permite continuar o seguir el destino intentado. Pruebas de creación y edición cubren enlace, Atrás/Adelante, conservación de nombre y descripción, descarte al destino solicitado y navegación posterior sin volver a mostrar el diálogo. `pnpm exec vitest run tests/categories/category-create-page.test.tsx tests/categories/category-edit-form.test.tsx --maxWorkers=1` pasó (2 archivos, 33 pruebas).
- Validación final: `pnpm test:run --maxWorkers=1` pasó (64 archivos, 577 pruebas); también pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check`. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T21. Incorporar advertencia nativa y retirar protección tras guardado confirmado. (RF-63, RF-124; NFR-5)
  Hecho cuando: Playwright recibe `beforeunload` al intentar recargar con cambios; después de guardar correctamente no vuelve a advertir por los cambios guardados y la aplicación no proporciona texto al aviso nativo.
- Evidencia: el guard añade `beforeunload` mientras el formulario esté sucio, cancela la salida con `preventDefault()` y asigna `returnValue = ""`; la referencia de descarte desactiva la advertencia tras éxito. `tests/browser/category-unsaved-changes.bootstrap-smoke.spec.ts` verifica en creación y edición el diálogo nativo al recargar, la ausencia de texto propio, la conservación del formulario si se cancela y la ausencia de advertencia tras guardar correctamente.
- Validación final: `pnpm test:e2e` pasó (76 pruebas); `pnpm test:run --maxWorkers=1` pasó (64 archivos, 577 pruebas); también pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check`. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T22. Bloquear salida durante guardado sin encolar navegación. (RF-55–RF-56, RF-59, RF-64)
  Hecho cuando: pruebas diferidas de creación y edición verifican aviso de espera, ausencia de descarte durante pending, bloqueo de enlace/Atrás/Adelante y fallo posterior sin salida automática; un estado de sesión sustituye el formulario con prioridad.
- Evidencia: `useCategoryFormNavigationGuard` bloquea y reinicia inmediatamente intentos internos durante escritura, muestra el aviso de espera solo mientras sigue pendiente y oculta el diálogo de descarte. Creación prueba salida por enlace y fallo sin navegación encolada; edición prueba Atrás/Adelante, fallo sin salida y necesidad de un nuevo intento; otra prueba verifica que la comprobación de sesión sustituye el formulario y el aviso mientras el guardado sigue pendiente. `pnpm exec vitest run tests/categories/category-create-page.test.tsx tests/categories/category-edit-form.test.tsx --maxWorkers=1` pasó (2 archivos, 36 pruebas).
- Validación final: `pnpm test:run --maxWorkers=1` pasó (64 archivos, 580 pruebas); también pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check`. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T23. Completar origen seguro para Cancelar, errores y recarga. (RF-49, RF-65–RF-69)
  Hecho cuando: pruebas verifican Cancelar con/sin descarte, retorno desde dirección inválida/404, recarga de formularios, origen ausente/malformado/externo y fallback predeterminado; ningún destino externo es aceptado.
- Evidencia: ambos formularios ofrecen Cancelar y usan el guard para confirmar descarte solo cuando hay cambios; los retornos se resuelven mediante `resolveCategoryFormReturnTo`, que permite únicamente `/categories` con criterios válidos, rechaza rutas externas, malformadas y parámetros `returnTo` duplicados, y aplica el listado predeterminado. Pruebas de integración cubren Cancelar limpio/sucio en creación y edición, continuidad del borrador, retornos desde UUID inválido y 404, y fallback por origen ausente, externo, malformado o duplicado. `tests/browser/category-unsaved-changes.bootstrap-smoke.spec.ts` verifica que recargar conserva la URL de origen en ambos formularios y que la edición vuelve a esa consulta tras el guardado. `pnpm exec vitest run tests/categories/category-form-return-to.test.ts tests/categories/category-create-page.test.tsx tests/categories/category-edit-form.test.tsx tests/categories/category-edit-page.test.tsx --maxWorkers=1` pasó (4 archivos, 67 pruebas); el smoke E2E pasó (2 pruebas).
- Validación final: `pnpm test:run --maxWorkers=1` pasó (65 archivos, 603 pruebas); también pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check`. El build conserva el aviso no bloqueante de chunk superior a 500 kB. Detector Impeccable: `[]`.
- [x] T24. Conservar edición rechazada por categoría inexistente en solo lectura. (RF-97–RF-99, RF-126)
  Hecho cuando: un PATCH 404 deja valores visibles readonly sin retry de escritura, mantiene confirmación al abandonarlos y actualiza el listado al volver al origen.
- Evidencia: la edición reconoce una categoría inexistente tras PATCH, conserva nombre y descripción en solo lectura, elimina la acción Guardar y bloquea reenvíos incluso ante submit directo. El guard mantiene el diálogo de descarte al salir; al confirmar, vuelve al origen validado e invalida las consultas administrativas de la sesión, provocando la lectura vigente. Prueba de integración verifica valores retenidos, continuidad del borrador, un único PATCH, descarte confirmado, filtros/página de origen y una única consulta nueva al listado.
- Validación final: `pnpm test:run --maxWorkers=1` pasó (65 archivos, 609 pruebas); también pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check`. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T25. Incorporar el coordinador de operaciones de Categorías en el ámbito autenticado. (RF-76, RF-84–RF-86, RF-103; NFR-9)
  Hecho cuando: una prueba del provider público, integrado por encima del Outlet, mantiene identificador/sesión/UUID/fase de operación al cambiar de página sin duplicar catálogos ni persistir sesión en Zustand; el harness verifica un único registro por operación bajo StrictMode.
- Evidencia: `CategoryOperationsProvider` y `useCategoryOperations` se exponen por la API pública de Categorías. `AppLayout` monta el provider bajo `SessionBoundary` y por encima de `Outlet`; su estado React local registra únicamente metadata de operación (ID, sesión, UUID, estado previo/solicitado y fase), se elimina al cambiar el ámbito de sesión y verifica la vigencia mediante Auth. La prueba pública navega entre rutas bajo `StrictMode`, confirma que el efecto se ejecuta dos veces pero queda un solo registro, actualiza la fase y conserva todos los metadatos sin duplicar el catálogo.
- Validación final: `pnpm exec vitest run tests/categories/category-operations-provider.test.tsx --maxWorkers=1` pasó (1 archivo, 1 prueba); `pnpm test:run --maxWorkers=1` pasó (66 archivos, 610 pruebas); `pnpm test:e2e --workers=1` pasó (76 pruebas). También pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check`. El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T26. Añadir acciones de estado y confirmación con identidad. (RF-7, RF-70–RF-74, RF-112)
  Hecho cuando: pruebas muestran Activar o Desactivar según estado para distintos roles, identifican la categoría, explican la conservación del registro y comprueban que cancelar no envía solicitudes ni cambia el estado.
- Evidencia: `category-list-table` ofrece la acción correspondiente en cada fila y presenta un diálogo con el nombre de la categoría; al desactivar explica que el registro se conserva y no se elimina. `tests/categories/category-status-actions.test.tsx` verifica ambos estados para ADMIN, MANAGER, OPERATOR y VIEWER, y Cancelar en activación/desactivación sin PATCH/DELETE ni cambio del estado visible.
- Validación final: pruebas focalizadas (2 archivos, 8 pruebas) y `pnpm test:run --maxWorkers=1` (67 archivos, 616 pruebas) pasaron; también `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check`. Una primera ejecución completa registró un rechazo MSW sin handler en una prueba existente de creación de Productos; la prueba aislada y junto a la nueva suite pasó, y la ejecución completa repetida pasó. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T27. Implementar PATCH de estado autoritativo y bloqueos por categoría. (RF-75–RF-79, RF-92–RF-93, RF-130; NFR-7)
  Hecho cuando: pruebas verifican `PATCH { isActive }` en ambos sentidos, sin DELETE, indicador pending, ausencia de optimistic update, duplicados y apertura de edición bloqueados para esa categoría; solo respuesta válida confirma y actualiza la consulta aplicada.
- Evidencia: `changeCategoryStatus` envía únicamente `{ isActive }` por PATCH y valida que la respuesta confirme UUID y estado solicitados; `useChangeCategoryStatus` desactiva reintentos automáticos e invalida la lista administrativa de la sesión (refetch de los criterios aplicados), opciones activas y detalle solo tras respuesta contractual válida. El coordinador por sesión bloquea operaciones duplicadas por UUID; el listado conserva el badge hasta respuesta, muestra pending y deshabilita Activar/Desactivar y Editar para esa categoría. `tests/categories/categories-api.test.tsx` verifica PATCH true/false, sin DELETE, respuesta inválida y ausencia de retry; `tests/categories/category-status-actions.test.tsx` cubre pending, estado no optimista, duplicados, edición bloqueada, retorno de edición a la URL de criterios, actualización del listado aplicado y ausencia de éxito/invalidación ante respuesta incompatible.
- Validación final: pruebas focalizadas (5 archivos, 38 pruebas), `pnpm test:run --maxWorkers=1` (67 archivos, 623 pruebas) y `pnpm test:e2e --workers=1` (76 pruebas) pasaron. También `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, `git diff --check` y Prettier de `tasks.md`; detector Impeccable: `[]`. Los harnesses de App Shell se actualizaron para envolver `AppLayout` con un QueryClient aislado, igual que la composición real de la aplicación. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T28. Tratar desactivación rechazada por productos asociados y permisos. (RF-80–RF-82, RF-88–RF-89, RF-118)
  Hecho cuando: pruebas 409 cubren productos asociados activos/inactivos y muestran motivo conservando categoría activa, sin reasignación ni retry directo; 403 presenta operación no permitida sin éxito ni retry directo.
- Evidencia: `isCategoryHasAssociatedProductsError` reconoce únicamente HTTP 409 con código `CATEGORY_HAS_ASSOCIATED_PRODUCTS`. El diálogo explica que los productos asociados impiden desactivar, mantiene la categoría activa, aclara que no reasigna productos y reemplaza la confirmación por Cerrar; para HTTP 403 muestra que la operación no está permitida y también excluye reenvío directo. Ambos casos ocultan los mensajes internos del backend y no invalidan ni presentan éxito. `tests/categories/category-status-actions.test.tsx` cubre asociaciones con productos activos e inactivos y rechazo 403, contando un solo PATCH, ningún DELETE/refetch/reintento y estado Activa; `tests/categories/category-api-errors.test.ts` verifica clasificación exacta del 409.
- Validación final: `pnpm test:run --maxWorkers=1` pasó (67 archivos, 630 pruebas); pruebas focalizadas de errores y estado (2 archivos, 26 pruebas) pasaron. También `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, `git diff --check` y detector Impeccable (`[]`) pasaron. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T29. Permitir reintento manual solo de fallos recuperables de estado. (RF-83, RF-118)
  Hecho cuando: HTTP 429 muestra un botón explícito Reintentar mientras la categoría siga disponible; una confirmación manual envía una única nueva solicitud y una espera no repite el PATCH. 403, 404, productos asociados y resultados inciertos no ofrecen reintento.
- Evidencia: `isCategoryRateLimitedError` clasifica exclusivamente HTTP 429; el diálogo presenta el motivo y permite repetir la acción con Reintentar. La repetición vuelve a pasar por la mutación normal del coordinador y conserva `retry: false`; el indicador pending impide solicitudes manuales duplicadas. 403, 404, 409 de productos asociados, red, 5xx y respuesta 2xx inválida no ofrecen retry directo. Las pruebas verifican el único PATCH inicial durante la espera, un PATCH adicional tras activación manual y luego éxito/refresco, además del estado Activa si el reintento no fue confirmado.
- Validación final: pruebas focalizadas (3 archivos, 49 pruebas), `pnpm test:run --maxWorkers=1` (67 archivos, 639 pruebas), `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` y `git diff --check` pasaron; detector Impeccable: `[]`. El contrato OpenAPI actual no anuncia HTTP 429; el frontend lo verifica con MSW conforme a RF-83 aprobado. Build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T30. Invalidar confirmaciones desactualizadas con información conocida. (RF-127–RF-129)
  Hecho cuando: pruebas actualizan datos recibidos de UUID/estado antes de confirmar y verifican que no se envía PATCH, se informa del cambio y se reconsulta; no se exige detectar cambios de otro cliente aún no recibidos.
- Evidencia: antes de enviar el cambio, `CategoryListTable` contrasta UUID y `isActive` de la confirmación con la última respuesta lista del listado aplicado. Si ya no aparece o su estado difiere, bloquea ese envío, informa que cambió la disponibilidad y solicita refetch con los mismos criterios mediante `onRetry`; no infiere cambios aún no recibidos. `tests/categories/category-status-actions.test.tsx` fuerza ambas respuestas antes de confirmar y verifica el mensaje, la consulta conservada, el refetch y cero PATCH/éxito.
- Validación final: pruebas focalizadas (3 archivos, 36 pruebas) y `pnpm test:run --maxWorkers=1` (67 archivos, 641 pruebas) pasaron; también `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, `git diff --check` y detector Impeccable (`[]`). El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T31. Resolver cambios de estado después de abandonar el listado sin navegar ni enfocar. (RF-84–RF-86, RF-102–RF-103)
  Hecho cuando: pruebas diferidas de éxito y error completan tras navegar a Inicio, conservan ruta/foco, anuncian el resultado pertinente y provocan lectura vigente al regresar; los callbacks no dependen del montaje de la fila.
- Evidencia: el éxito tardío mantiene la notificación accesible existente; si el listado ya se desmontó y llega un rechazo, `CategoryListPage` muestra un aviso global seguro solo mientras la sesión solicitante siga vigente e invalida la consulta administrativa sin refetch mientras se está fuera. Al regresar, la consulta marcada como obsoleta obtiene datos vigentes. `tests/categories/category-status-actions.test.tsx` usa PATCH diferido para éxito 200 y error 503, cierra el diálogo pendiente, navega a Inicio, conserva ruta y foco tras la respuesta, verifica el anuncio de estado/alerta y comprueba el GET actualizado al volver a Categorías con un solo PATCH.
- Validación final: pruebas focalizadas (2 archivos, 23 pruebas) y `pnpm test:run --maxWorkers=1` (67 archivos, 643 pruebas) pasaron; también `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, `git diff --check` y detector Impeccable (`[]`). El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [x] T32. Detectar incertidumbre y exigir una lectura nueva antes de otra modificación de estado. (RF-91–RF-93, RF-117)
  Hecho cuando: pruebas de red/5xx o respuesta no confirmable muestran incertidumbre y bloquean otro PATCH hasta obtener una nueva comprobación de detalle, sin resolverla usando solo una fila cacheada.
- Evidencia: `CategoryOperationsProvider` conserva y bloquea la operación si el PATCH falla por red/5xx o su respuesta 2xx no valida el UUID/estado. Inicia un GET nuevo de detalle con `staleTime: 0`, cancela una lectura previa del mismo detalle, y mantiene el bloqueo mientras consulta y actualiza el listado vigente; no reenvía el PATCH ni muestra éxito. Si falla el GET, conserva las fases `check-failed`/`not-found` y el bloqueo para las recuperaciones de tareas posteriores. `tests/categories/category-status-actions.test.tsx` cubre red, 503 y respuesta 2xx incompatible, precarga deliberadamente el detalle antiguo, verifica que se solicita el GET real, bloquea otra acción/PATCH mientras la respuesta está pendiente y solo libera tras la lectura y el refetch del listado.
- Validación final: pruebas focalizadas (3 archivos, 28 pruebas) y `pnpm test:run --maxWorkers=1` (67 archivos, 646 pruebas) pasaron. También pasaron `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build`, `git diff --check` y detector Impeccable (`[]`). El build conserva el aviso no bloqueante de chunk superior a 500 kB.
- [ ] T33. Recuperar consultas fallidas de comprobación sin repetir la modificación. (RF-134–RF-135)
  Hecho cuando: pruebas hacen fallar el GET de comprobación, mantienen el bloqueo y verifican que Reintentar solo envía GET; el bloqueo se conserva al abandonar y volver al listado dentro de la sesión.
- [ ] T34. Mostrar el estado solicitado observado sin atribuir éxito a una escritura incierta. (RF-136–RF-137)
  Hecho cuando: el GET posterior devuelve el estado solicitado y la UI lo presenta como vigente sin anunciar que se confirmó la operación anterior ni reenviar PATCH.
- [ ] T35. Exigir nueva confirmación cuando la comprobación observa el estado anterior. (RF-138)
  Hecho cuando: el GET posterior devuelve el estado previo, no se reenvía la modificación y solo una nueva confirmación explícita permite otro PATCH.
- [ ] T36. Tratar categoría inexistente durante comprobación posterior a incertidumbre. (RF-95, RF-98, RF-117)
  Hecho cuando: pruebas del GET 404 muestran categoría no encontrada con retorno y excluyen reintento de escritura; no queda habilitada una modificación por haber terminado la consulta.
- [ ] T37. Mostrar categoría no encontrada en un cambio de estado rechazado desde el listado. (RF-98–RF-99, RF-122–RF-123)
  Hecho cuando: un PATCH 404 con el listado montado muestra el estado específico sin retry, ofrece retorno al listado actualizado y respeta el origen de consulta.
- [ ] T38. Separar confirmación de escritura del fallo de lectura posterior. (RF-100–RF-101)
  Hecho cuando: pruebas de creación, edición y estado confirman la escritura y fuerzan un fallo al actualizar el listado; el éxito permanece y retry repite únicamente la lectura.
- [ ] T39. Aislar consultas de Categorías por sesión confirmada. (RF-6, RF-32; NFR-9)
  Hecho cuando: pruebas de listado/detalle/opciones cambian o pierden sesión durante consultas diferidas, verifican claves con sesión, cancelación/retirada y ausencia de datos anteriores presentados como vigentes.
- [ ] T40. Descartar efectos tardíos de mutaciones y comprobaciones de otra sesión. (RF-6, RF-64, RF-90, RF-102–RF-103; NFR-9)
  Hecho cuando: pruebas sustituyen la sesión durante crear/editar/cambiar estado/comprobar incertidumbre y verifican que las respuestas anteriores no restauran formulario, caché, navegación, foco, avisos ni bloqueos en la nueva sesión.
- [ ] T41. Extraer el selector público de Categorías preservando opciones y selección. (RF-104–RF-106, RF-139)
  Hecho cuando: pruebas del componente propio verifican búsqueda/paginación, categorías activas, selección retenida fuera de página y ausencia de gestión inline; se expone un contrato sin tipos de PrimeReact ni dependencia pública de React Hook Form.
- [ ] T42. Integrar el selector público en creación de Productos. (RF-104–RF-106, RF-121, RF-139)
  Hecho cuando: pruebas existentes y nuevas de creación conservan valores/dirty state, selección entre páginas, validación y recuperación de asignación rechazada; no se añaden acciones de gestión de categorías.
- [ ] T43. Integrar el selector público en edición de Productos conservando su categoría original. (RF-104–RF-106, RF-108, RF-121, RF-139)
  Hecho cuando: regresiones verifican categoría original activa/inactiva, producto sin categoría, fallo de opciones, asignación rechazada y PATCH sin reasignación cuando no cambia la categoría; los demás valores y guard permanecen intactos.
- [ ] T44. Invalidar consultas de gestión, opciones y detalle tras escrituras confirmadas. (RF-79, RF-107; NFR-9)
  Hecho cuando: pruebas de create/update/status verifican invalidación de variantes afectadas solo en la sesión vigente, incluidas claves públicas existentes de opciones/detalle; no se depende exclusivamente del listado administrativo.
- [ ] T45. Reconsultar opciones al regresar a Productos o solicitar su actualización. (RF-107, RF-119)
  Hecho cuando: pruebas vuelven a formularios después de crear/renombrar/activar/desactivar categorías y reciben opciones actuales incluso con caché fresh; actualización explícita consulta de nuevo sin reinicializar el producto.
- [ ] T46. Invalidar nuevas selecciones confirmadas como inactivas o inexistentes. (RF-106, RF-120–RF-121)
  Hecho cuando: pruebas de detalle inactivo/404 invalidan solo la nueva asignación y conservan los demás campos; ni la ausencia en opciones ni el refresco borran indebidamente la categoría original de edición.
- [ ] T47. Conservar selección ante ausencia de opciones o fallo de comprobación. (RF-139–RF-140)
  Hecho cuando: pruebas paginan/buscan sin la opción seleccionada y hacen fallar su comprobación; el valor permanece sin declararse inválido por ese fallo, el backend sigue autorizando al guardar y no se rehabilita una asignación ya rechazada en la Spec 004.
- [ ] T48. Completar validación accesible, foco de errores y navegación por teclado de formularios. (RF-109–RF-111)
  Hecho cuando: pruebas de creación/edición verifican labels, errores asociados y foco en el primer campo inválido después de renderizar errores; los formularios se operan sin puntero.
- [ ] T49. Verificar teclado, anuncios y retorno de foco en listado y confirmaciones. (RF-109, RF-112–RF-114)
  Hecho cuando: pruebas de navegador operan filtros/paginación/orden/diálogos, verifican resultados anunciados y foco al encabezado o control relacionado disponible tras cerrar, incluida desaparición de fila sin robar foco en respuestas tardías.
- [ ] T50. Verificar y ajustar responsive del listado y formularios. (RF-8–RF-9, RF-33, RF-40; NFR-1)
  Hecho cuando: Playwright a 360/768/1280 px verifica ausencia de overflow horizontal del documento, scroll local de la tabla y disponibilidad de acciones en listado, creación y edición; se corrigen barreras detectadas y se repite la prueba afectada.
- [ ] T51. Verificar acciones con zoom nativo al 200 %. (RF-70–RF-72, RF-109; NFR-3)
  Hecho cuando: el proyecto optativo `native-zoom` abre Chromium con zoom real y comprueba acciones de listado/crear/editar dentro del viewport; se registra revisión manual y entorno, sin sustituir la evidencia por un viewport equivalente.
- [ ] T52. Revisar movimiento reducido, idioma y consistencia visual. (RF-14–RF-16, RF-52, RF-75, RF-112; NFR-4–NFR-6)
  Hecho cuando: pruebas verifican uso con movimiento reducido y mensajes españoles, y revisión Impeccable documenta tokens, CSS local, patrones y correcciones; la advertencia nativa conserva el idioma del navegador.
- [ ] T53. Completar revisión manual de accesibilidad de los workflows. (RF-109–RF-114; NFR-2)
  Hecho cuando: queda evidencia humana con lector de pantalla y teclado, contraste contextual, foco y formularios/confirmaciones; cualquier barrera se corrige y se repite su comprobación, sin declarar revisión manual a partir de ARIA automatizado.
- [ ] T54. Verificar integridad de nombres/descripciones largos y privacidad de errores. (RF-131–RF-133; NFR-8, NFR-11)
  Hecho cuando: pruebas comparan valores y payload exactos en creación/edición, incluidos errores/reintentos, sin truncamiento ni límites inventados; centinelas sensibles del backend no aparecen en UI ni registros de aplicación.
- [ ] T55. Incorporar el workflow E2E de Categorías con MSW y Auth simulados. (RF-5, RF-20–RF-30, RF-37–RF-39, RF-48–RF-49, RF-70–RF-82, RF-104–RF-108; NFR-10)
  Hecho cuando: Playwright predeterminado recorre listado/criterios, creación, edición con retorno, estado y rechazo por asociados; el harness es solo de prueba, no requiere credenciales/backend personal y se comprueba que ningún flujo envía DELETE.
- [ ] T56. Extender preview-smoke para Categorías sin recursos de desarrollo. (RF-2, RF-5, RF-8–RF-9; NFR-10)
  Hecho cuando: el bundle servido por preview muestra Categorías con Auth/API simuladas y no contiene ni sirve demo/harnesses/worker; no realiza llamadas de negocio al backend real.
- [ ] T57. Actualizar regresiones de navegación, App Shell y Auth para el nuevo destino. (RF-1–RF-7, RF-113; NFR-9)
  Hecho cuando: pruebas compactas/persistentes reflejan Inicio/Productos/Categorías sin orden de foco obsoleto, y pasan los flujos afectados de navegación, historial, logout y sustitución de sesión sin añadir permisos por rol.
- [ ] T58. Ejecutar verificación global y consolidar evidencia de cierre. (RF-1–RF-140; NFR-1–NFR-11)
  Hecho cuando: se registran resultados reales de lint, formato, typecheck, Vitest, build y E2E del plan, ejecutando proyectos de navegador secuencialmente; una matriz final enlaza evidencia RF/NFR, revisiones manuales y bloqueos. No se declara cumplida la spec con pruebas fallidas o evidencia pendiente.

## Orden y dependencias

El orden numérico respeta dependencias, pero no obliga a ejecutar ramas independientes en paralelo. Los proyectos E2E comparten el puerto 5174 y deben correr secuencialmente. Las tareas T50–T54 incluyen correcciones focalizadas de hallazgos, nunca una ampliación funcional de alcance.

| Tarea | Depende de | Motivo |
| --- | --- | --- |
| T1 | Ninguna | Confirma contratos antes de nuevas operaciones. |
| T2 | Ninguna | Establece entrada y layout del listado. |
| T3 | T2 | Añade páginas hermanas al destino registrado. |
| T4 | T1 | Fija traducción de criterios al contrato. |
| T5 | T2, T4 | Conecta página y consulta tipada. |
| T6 | T5 | Presenta estados de la consulta existente. |
| T7 | T4–T6 | Ajusta URL/página usando total remoto. |
| T8 | T4–T6 | Añade controles a la consulta. |
| T9 | T7–T8 | Verifica navegación de criterios completa. |
| T10 | T8–T9 | Requiere consultas sucesivas diferenciadas. |
| T11 | T3 | Construye formulario en páginas existentes. |
| T12 | T1, T11 | Contrato y entradas de creación definidos. |
| T13 | T5, T11–T12 | Conecta creación al destino posterior. |
| T14 | T1, T3 | Carga detalle desde la ruta de edición. |
| T15 | T11, T14 | Compara campos con snapshot inicial. |
| T16 | T5, T14–T15 | Conecta PATCH al listado de origen disponible. |
| T17 | T16 | Preserva edición ante consultas posteriores. |
| T18 | T13, T16 | Prueba conflictos en ambos formularios. |
| T19 | T13, T16, T18 | Completa fallos de guardado y errores seguros. |
| T20 | T13, T16 | Protege formularios editables con dirty state. |
| T21 | T20 | Extiende protección al navegador y éxito. |
| T22 | T19–T21 | Diferencia guardado pendiente de descarte. |
| T23 | T4, T9, T14, T20 | Completa retorno validado en cada salida. |
| T24 | T16, T20, T23 | Añade 404 readonly y descarte al retornar. |
| T25 | T1, T2 | Define ámbito duradero para mutaciones de estado. |
| T26 | T5, T25 | Requiere categoría vigente y coordinador. |
| T27 | T1, T25–T26 | Ejecuta confirmación con contrato no destructivo. |
| T28 | T27 | Trata rechazos autoritativos de estado. |
| T29 | T28 | Separa causas con/sin retry. |
| T30 | T26–T29 | Invalida confirmaciones antes de enviar. |
| T31 | T25, T27–T29 | Verifica lifecycle fuera del listado. |
| T32 | T25, T27, T29 | Introduce incertidumbre sin retry de escritura. |
| T33 | T32 | Recupera lectura de comprobación fallida. |
| T34 | T32–T33 | Resuelve estado solicitado observado. |
| T35 | T32–T33 | Resuelve estado anterior observado. |
| T36 | T32–T33 | Resuelve inexistencia en comprobación. |
| T37 | T23, T27, T36 | Completa 404 inmediato de mutación y retorno. |
| T38 | T13, T16, T27 | Distingue escritura de refresco posterior. |
| T39 | T5, T14 | Refuerza aislamiento de lecturas existentes. |
| T40 | T19, T22, T25, T31–T39 | Cubre efectos pendientes y sustitución de sesión. |
| T41 | T1 | Extrae lectura/selección detrás de API pública. |
| T42 | T41 | Integra creación sin cambios de negocio. |
| T43 | T41 | Integra edición preservando categoría original. |
| T44 | T13, T16, T27, T39–T40 | Invalida variantes solo para sesión vigente. |
| T45 | T42–T44 | Verifica opciones actuales al volver/actualizar. |
| T46 | T42–T45 | Añade invalidación confirmada de nueva selección. |
| T47 | T46 | Comprueba conservación ante falta de evidencia. |
| T48 | T19–T24 | Valida acceso y foco en formularios terminados. |
| T49 | T26–T38, T48 | Verifica listado, diálogos y feedback tardío. |
| T50 | T23–T24, T37, T49 | Revisa las tres vistas funcionales. |
| T51 | T50 | Distingue zoom nativo de responsive equivalente. |
| T52 | T49–T50 | Revisa las vistas y sus estados completos. |
| T53 | T48–T52 | Documenta accesibilidad sobre workflow final. |
| T54 | T19, T24, T47 | Verifica datos extensos y errores en flujos completos. |
| T55 | T9, T24, T28, T38, T47 | Compone workflow MSW sin backend real. |
| T56 | T55 | Verifica workflow/ruta y exclusiones en producción. |
| T57 | T2–T3, T40, T49 | Ajusta expectativas de navegación y acceso. |
| T58 | T1–T57 | Consolida evidencia y regresión de todo el alcance. |

## Cobertura de requisitos

La tabla vincula implementación y evidencia principal. T58 consolida resultados, pero no sustituye las pruebas específicas de cada tarea. Los rangos comprenden todos sus identificadores.

| RF | Tarea | Evidencia |
| --- | --- | --- |
| RF-1–RF-6 | T2–T3, T39–T40, T55–T57 | Router, sesiones simuladas y navegación directa en browser/preview. |
| RF-7 | T13, T16, T26, T57 | Acciones visibles para varios roles sin autorización visual. |
| RF-8–RF-13 | T4–T5 | Contratos MSW, filas, defaults, total y cambio remoto de página. |
| RF-14–RF-17 | T6, T8 | Consultas diferidas/fallidas, vacíos y limpieza de búsqueda. |
| RF-18–RF-19 | T7 | Corrección de página con/sin resultados y reemplazo histórico. |
| RF-20–RF-27 | T4, T8 | Tabla de parámetros y pruebas de controles/búsqueda simulada. |
| RF-28–RF-31 | T4, T7, T9 | URL compartida, reload, historial y normalización. |
| RF-32 | T10, T39 | Respuestas fuera de orden y separación por sesión. |
| RF-33–RF-36 | T11–T13 | Campos, esquemas y envío con descripción opcional. |
| RF-37–RF-39 | T12–T13, T55 | POST diferido, éxito autoritativo y destino predeterminado. |
| RF-40–RF-43 | T14 | Carga, bloqueo inicial y edición activa/inactiva. |
| RF-44–RF-47 | T11, T15 | Validación, PATCH parcial, `null`, estado conservado y ausencia de PATCH vacío. |
| RF-48–RF-49 | T16, T23, T55 | Guardado confirmado y retorno a consulta de origen. |
| RF-50–RF-51 | T17 | Reconsulta sin reset de campos ni dirty state. |
| RF-52–RF-54 | T13, T16 | Respuestas diferidas y contador de escrituras/edición bloqueada. |
| RF-55–RF-56 | T22 | Enlace y Atrás/Adelante bloqueados con aviso de espera. |
| RF-57–RF-58 | T19, T40 | Valores recuperables solo en formulario y sesión vigentes. |
| RF-59 | T22 | Fallo de escritura sin navegación encolada. |
| RF-60–RF-62 | T20, T23 | Continuar/descartar y destino de navegación. |
| RF-63 | T21 | Evento nativo `beforeunload` en browser. |
| RF-64 | T22, T40 | Sesión prevalece durante guard y guardado. |
| RF-65–RF-69 | T23 | Cancelar, error, recarga y origen validado seguro. |
| RF-70–RF-74 | T26 | Estado de acciones, identidad, aviso de conservación y cancelar sin solicitud. |
| RF-75–RF-79 | T25, T27, T44 | Coordinación, PATCH autoritativo, bloqueos y refresco. |
| RF-80–RF-82 | T28, T55 | 409 por productos asociados sin desactivar/reasignar. |
| RF-83 | T29 | Retry manual solo en causas permitidas. |
| RF-84–RF-86 | T25, T31 | Resolución tardía sin cambiar ruta ni foco. |
| RF-87 | T18 | Conflicto de nombre accesible en creación/edición. |
| RF-88–RF-89 | T19, T28 | 403 y otros rechazos sin falso éxito. |
| RF-90 | T19, T40 | 401 solicita Auth y descarta efectos de sesión anterior. |
| RF-91–RF-93 | T1, T12, T16, T19, T27, T32 | Red/5xx, contrato inválido y contadores sin reenvío automático. |
| RF-94–RF-96 | T14, T36 | UUID sin petición, 404 y retry de lectura. |
| RF-97–RF-99 | T24, T36–T37 | Solo lectura sin retry de modificación y retorno actualizado. |
| RF-100–RF-101 | T38 | Escritura válida seguida de lectura fallida; retry solo GET. |
| RF-102–RF-103 | T31, T40 | Aviso tardío/refetch solo para sesión vigente. |
| RF-104–RF-106 | T41–T43, T46, T55 | Selector público de solo lectura y asignaciones activas. |
| RF-107 | T44–T45 | Invalidación y reconsulta al regresar aun con caché fresh. |
| RF-108 | T43 | Regresión Spec 004 de categoría original y ausencia temporal. |
| RF-109–RF-111 | T48–T49, T53 | Teclado, labels, errores asociados y primer inválido. |
| RF-112–RF-114 | T2–T3, T26, T49, T53 | Anuncios y foco en navegación/diálogo sin interferir en respuesta tardía. |
| RF-115–RF-116 | T18 | Comparación normalizada y nombre reservado por categoría inactiva. |
| RF-117–RF-118 | T28–T29, T32, T36 | Bloqueo de nueva escritura hasta lectura y ausencia de retry directo excluido. |
| RF-119–RF-121 | T42–T46 | Actualización explícita, invalidación autoritativa y demás campos intactos. |
| RF-122–RF-123 | T37 | Estado no encontrada tras PATCH y retorno actualizado. |
| RF-124–RF-126 | T20–T21, T24 | Protección retirada tras éxito/descarte y conservada ante 404 readonly. |
| RF-127–RF-129 | T30 | Cambio conocido invalida confirmación, informa y reconsulta sin PATCH. |
| RF-130 | T27 | Apertura de edición bloqueada en fila con operación pending. |
| RF-131–RF-133 | T11, T19, T54 | Validación campo/general, textos íntegros y sin límites inventados. |
| RF-134–RF-135 | T33 | Fallo de comprobación bloquea modificar y retry solo GET. |
| RF-136–RF-137 | T34 | Estado vigente observado sin atribuir éxito ni reenviar. |
| RF-138 | T35 | Estado anterior requiere nueva confirmación para otro PATCH. |
| RF-139–RF-140 | T41–T43, T47 | Selección fuera de página o detalle fallido conservada. |

### Cobertura no funcional

| NFR | Tarea | Evidencia |
| --- | --- | --- |
| NFR-1 | T50 | Medición de overflow, scroll local y acciones a 360/768/1280 px. |
| NFR-2 | T48–T49, T53 | Pruebas de accesibilidad y revisión humana con lector/teclado/contraste/foco. |
| NFR-3 | T51 | Chromium visible al 200 % nativo y revisión manual documentada. |
| NFR-4 | T52 | Workflow con preferencia de movimiento reducido. |
| NFR-5 | T21, T52 | Mensajes españoles y advertencia del navegador sin texto aportado por la app. |
| NFR-6 | T2–T3, T11, T41, T52, T58 | Impeccable, Design System, CSS local y fronteras verificadas por lint. |
| NFR-7 | T1, T19, T27–T28 | Contratos y rechazos autoritativos; ningún DELETE de desactivación. |
| NFR-8 | T19, T54 | Centinelas sensibles ausentes de UI y registros. |
| NFR-9 | T25, T39–T40, T44, T57 | Cancelación de lecturas y descarte de efectos/metadatos anteriores. |
| NFR-10 | T55–T56, T58 | MSW y browser/preview sin backend personal ni credenciales. |
| NFR-11 | T54 | Campos/payload completos con textos extensos en éxito y error. |

## Verificación y registro

- Ejecutar por tarea lint, typecheck y pruebas focalizadas correspondientes; build cuando afecte bundling/rutas/harnesses o contratos públicos. Probar contratos de wrappers si fuera necesario cambiar su comportamiento.
- En T58 ejecutar los comandos globales y proyectos E2E del plan de forma secuencial, además del formato focalizado de `spec.md`, `plan.md` y `tasks.md`.
- Registrar archivo/prueba/comando, resultado y entorno de evidencia manual al cerrar cada tarea. La referencia a un requisito o una casilla marcada no sustituye su evidencia.
- Si no hay escritorio gráfico, lector de pantalla u otra condición necesaria, registrar bloqueo; no sustituir zoom nativo por viewport equivalente ni revisión humana por pruebas automáticas.
- No modificar reglas del backend, scope aprobado ni contratos de Productos por inferencia. Toda discrepancia vuelve a `change-manager`.

T1–T12 están completadas; T13 está implementada, pero pendiente de cerrar por el error MSW global descrito arriba. T14 no se ha iniciado.
