# Spec 005 — Categorías

## Contexto y objetivo

Inventory necesita permitir la administración de categorías desde la aplicación para mantener las opciones de clasificación utilizadas por Productos. Esta fase incorpora consulta, búsqueda, creación, edición y activación o desactivación de categorías, respetando las reglas existentes del backend. No incorpora eliminación permanente ni reasignación de productos asociados.

## Usuarios / actores

- Usuario autenticado que consulta categorías.
- Usuario autenticado con permisos efectivos para modificar categorías.
- Usuario cuya operación es rechazada por el backend.
- Usuario que navega mediante teclado o tecnologías de asistencia.
- Responsable de calidad que verifica los flujos.

## Historias de usuario

- H1: Como usuario quiero localizar categorías para consultar su información y estado.
- H2: Como usuario con permisos quiero crear categorías para utilizarlas al clasificar productos.
- H3: Como usuario con permisos quiero editar categorías para mantener su información vigente.
- H4: Como usuario con permisos quiero activar o desactivar categorías sin eliminarlas permanentemente.
- H5: Como usuario quiero conocer por qué una categoría no puede desactivarse.
- H6: Como usuario quiero conservar mi consulta al volver desde edición.
- H7: Como usuario quiero corregir errores sin perder mis cambios.
- H8: Como usuario quiero recibir una advertencia antes de descartar cambios sin guardar.

## Requisitos funcionales — criterios de aceptación en EARS

### Acceso y navegación

- RF-1: MIENTRAS exista una sesión autenticada confirmada, EL SISTEMA ofrecerá Categorías como destino de la navegación principal.
- RF-2: CUANDO el usuario acceda a Categorías, EL SISTEMA mostrará el listado dentro de la estructura de aplicación existente.
- RF-3: EL SISTEMA ofrecerá una página propia para crear categorías.
- RF-4: EL SISTEMA ofrecerá una página propia para editar una categoría identificada mediante su identificador público.
- RF-5: CUANDO el usuario acceda directamente a una dirección válida de Categorías, EL SISTEMA mostrará la página solicitada tras confirmar la sesión.
- RF-6: MIENTRAS la sesión esté pendiente, falle su comprobación o se confirme su ausencia, EL SISTEMA aplicará los estados de acceso establecidos para la aplicación.
- RF-7: EL SISTEMA mantendrá visibles las acciones de creación, edición y cambio de estado sin condicionarlas al rol presentado por el frontend.

### Listado y consulta

El listado inicial mostrará categorías activas, quince elementos por página y orden por nombre ascendente, conforme a los valores predeterminados aprobados.

- RF-8: EL SISTEMA mostrará el nombre de cada categoría.
- RF-9: EL SISTEMA identificará el estado activo o inactivo de cada categoría.
- RF-10: CUANDO el usuario abra el listado sin criterios de consulta, EL SISTEMA mostrará la primera página de categorías activas ordenadas por nombre ascendente.
- RF-11: EL SISTEMA utilizará quince categorías por página.
- RF-12: EL SISTEMA mostrará el total correspondiente a los criterios aplicados.
- RF-13: CUANDO el usuario seleccione otra página disponible, EL SISTEMA mostrará las categorías de esa página.
- RF-14: MIENTRAS una consulta esté pendiente, EL SISTEMA mostrará un estado de carga identificable.
- RF-15: SI una consulta falla, ENTONCES EL SISTEMA ofrecerá una acción para reintentarla.
- RF-16: SI una consulta no devuelve categorías, ENTONCES EL SISTEMA mostrará un estado vacío.
- RF-17: MIENTRAS exista una búsqueda aplicada sin resultados, EL SISTEMA ofrecerá una acción para limpiar la búsqueda.
- RF-18: SI la página solicitada supera la última página disponible con resultados, ENTONCES EL SISTEMA mostrará la última página disponible.
- RF-19: SI una consulta no tiene resultados, ENTONCES EL SISTEMA representará su paginación en la primera página.

### Búsqueda, filtros e historial

- RF-20: EL SISTEMA permitirá buscar coincidencias parciales en el nombre sin distinguir mayúsculas y minúsculas.
- RF-21: CUANDO el usuario aplique una búsqueda, EL SISTEMA eliminará los espacios exteriores del texto.
- RF-22: SI una búsqueda queda vacía tras eliminar espacios exteriores, ENTONCES EL SISTEMA la tratará como ausencia de búsqueda.
- RF-23: EL SISTEMA permitirá seleccionar categorías activas o inactivas como filtro de estado.
- RF-24: EL SISTEMA aplicará conjuntamente la búsqueda y el filtro de estado.
- RF-25: EL SISTEMA permitirá ordenar por nombre, fecha de creación o fecha de actualización.
- RF-26: EL SISTEMA permitirá seleccionar orden ascendente o descendente.
- RF-27: CUANDO el usuario cambie deliberadamente la búsqueda, el filtro de estado o el orden, EL SISTEMA volverá a la primera página.
- RF-28: EL SISTEMA reflejará los criterios aplicados en la dirección del listado.
- RF-29: CUANDO el usuario recargue o abra una dirección compartida, EL SISTEMA restaurará los criterios válidos representados en ella.
- RF-30: CUANDO el usuario utilice Atrás o Adelante, EL SISTEMA mostrará la consulta correspondiente al historial.
- RF-31: SI la dirección contiene un criterio inválido, ENTONCES EL SISTEMA lo sustituirá por su valor predeterminado sin añadir una entrada de historial.
- RF-32: CUANDO una consulta sustituya a otra todavía pendiente, EL SISTEMA impedirá que la respuesta anterior reemplace los resultados vigentes.

### Creación

- RF-33: EL SISTEMA ofrecerá campos de nombre y descripción para crear una categoría.
- RF-34: EL SISTEMA requerirá un nombre para crear una categoría.
- RF-35: EL SISTEMA permitirá crear una categoría sin descripción.
- RF-36: SI el nombre queda vacío tras eliminar espacios exteriores, ENTONCES EL SISTEMA impedirá el envío.
- RF-37: CUANDO el usuario envíe un formulario válido, EL SISTEMA solicitará la creación.
- RF-38: CUANDO el backend confirme la creación, EL SISTEMA mostrará una confirmación de éxito.
- RF-39: CUANDO el backend confirme la creación, EL SISTEMA llevará al usuario a la primera página de categorías activas sin búsqueda y ordenadas por nombre ascendente.

### Edición

- RF-40: CUANDO el usuario abra la edición, EL SISTEMA consultará la información vigente de la categoría.
- RF-41: MIENTRAS la consulta inicial esté pendiente, EL SISTEMA impedirá editar datos que todavía no hayan sido cargados.
- RF-42: CUANDO termine la carga inicial, EL SISTEMA rellenará el formulario con los valores recibidos.
- RF-43: EL SISTEMA permitirá editar categorías activas e inactivas.
- RF-44: EL SISTEMA aplicará a la edición la validación de nombre requerida para creación.
- RF-45: CUANDO el usuario elimine una descripción existente y guarde, EL SISTEMA solicitará retirar esa descripción.
- RF-46: CUANDO el usuario guarde cambios de información, EL SISTEMA conservará el estado activo o inactivo de la categoría.
- RF-47: MIENTRAS el formulario no contenga cambios, EL SISTEMA impedirá solicitar una actualización vacía.
- RF-48: CUANDO el backend confirme la actualización, EL SISTEMA mostrará una confirmación de éxito.
- RF-49: CUANDO el backend confirme la actualización, EL SISTEMA devolverá al usuario al listado con los criterios de origen.
- RF-50: CUANDO una nueva consulta llegue mientras existan cambios sin guardar, EL SISTEMA conservará los valores locales del formulario.
- RF-51: CUANDO una nueva consulta llegue mientras existan cambios sin guardar, EL SISTEMA conservará la condición de cambios pendientes.

### Guardado y protección de cambios

- RF-52: MIENTRAS una creación o actualización esté pendiente, EL SISTEMA mostrará un indicador de operación en curso.
- RF-53: MIENTRAS una creación o actualización esté pendiente, EL SISTEMA impedirá envíos duplicados.
- RF-54: MIENTRAS una creación o actualización esté pendiente, EL SISTEMA impedirá modificar los campos.
- RF-55: MIENTRAS una creación o actualización esté pendiente, EL SISTEMA bloqueará la navegación interna de salida, incluidos Atrás y Adelante.
- RF-56: CUANDO el usuario intente salir durante un guardado pendiente, EL SISTEMA informará que debe esperar el resultado.
- RF-57: SI un guardado falla por una causa distinta de categoría no encontrada mientras el formulario siga disponible en la misma sesión vigente, ENTONCES EL SISTEMA conservará los valores introducidos.
- RF-58: SI un guardado falla por una causa distinta de categoría no encontrada mientras el formulario siga disponible en la misma sesión vigente, ENTONCES EL SISTEMA volverá a permitir la edición.
- RF-59: CUANDO falle un guardado después de un intento de salida bloqueado, EL SISTEMA mantendrá el formulario sin ejecutar automáticamente esa salida.
- RF-60: CUANDO el usuario intente abandonar mediante navegación interna un formulario con cambios sin guardar y sin guardado pendiente, EL SISTEMA solicitará confirmación de descarte.
- RF-61: CUANDO el usuario elija continuar editando, EL SISTEMA conservará el formulario.
- RF-62: CUANDO el usuario confirme el descarte al navegar, EL SISTEMA continuará hacia el destino solicitado.
- RF-63: CUANDO el usuario intente recargar o cerrar una página con cambios sin guardar, EL SISTEMA solicitará la advertencia disponible en el navegador.
- RF-64: CUANDO un estado de sesión sustituya el formulario, EL SISTEMA dará prioridad a ese estado sobre la protección de navegación.

### Retorno al listado

- RF-65: CUANDO el usuario cancele un formulario sin cambios o confirme el descarte solicitado por Cancelar, EL SISTEMA volverá al listado de origen.
- RF-66: CUANDO el usuario vuelva desde un estado de categoría no encontrada o dirección inválida, EL SISTEMA restaurará los criterios de origen.
- RF-67: CUANDO el usuario recargue una página de formulario, EL SISTEMA conservará la consulta de origen asociada.
- RF-68: SI no existe una consulta de origen válida, ENTONCES EL SISTEMA utilizará los criterios predeterminados al volver al listado.
- RF-69: EL SISTEMA excluirá destinos externos del retorno al listado.

### Activación y desactivación

- RF-70: MIENTRAS una categoría esté activa, EL SISTEMA ofrecerá una acción para desactivarla.
- RF-71: MIENTRAS una categoría esté inactiva, EL SISTEMA ofrecerá una acción para activarla.
- RF-72: CUANDO el usuario solicite cambiar el estado, EL SISTEMA pedirá confirmación identificando la categoría.
- RF-73: MIENTRAS se solicite confirmar una desactivación, EL SISTEMA explicará que no elimina permanentemente la categoría.
- RF-74: CUANDO el usuario cancele la confirmación, EL SISTEMA conservará el estado existente.
- RF-75: MIENTRAS un cambio de estado esté pendiente, EL SISTEMA mostrará un indicador de operación en curso.
- RF-76: MIENTRAS un cambio de estado esté pendiente, EL SISTEMA impedirá solicitudes duplicadas sobre esa categoría.
- RF-77: EL SISTEMA conservará el estado presentado hasta recibir confirmación del backend.
- RF-78: CUANDO el backend confirme el cambio de estado, EL SISTEMA mostrará una confirmación de éxito.
- RF-79: CUANDO el backend confirme el cambio de estado, EL SISTEMA actualizará el listado respetando la consulta aplicada.
- RF-80: SI el backend rechaza la desactivación por productos asociados, ENTONCES EL SISTEMA explicará ese motivo.
- RF-81: SI el backend rechaza la desactivación por productos asociados, ENTONCES EL SISTEMA conservará la categoría activa.
- RF-82: SI el backend rechaza la desactivación por productos asociados, ENTONCES EL SISTEMA excluirá la reasignación de productos de ese flujo.
- RF-83: SI un cambio de estado es rechazado con HTTP 429 (Too Many Requests), ENTONCES EL SISTEMA ofrecerá un reintento manual, sin reenvío automático, mientras la categoría siga disponible para la operación.
- RF-84: MIENTRAS un cambio de estado esté pendiente, EL SISTEMA permitirá navegar fuera del listado.
- RF-85: CUANDO llegue una respuesta de cambio de estado después de abandonar el listado, EL SISTEMA conservará la página actual.
- RF-86: CUANDO llegue una respuesta de cambio de estado después de abandonar el listado, EL SISTEMA conservará el foco actual.

### Errores y autoridad del backend

- RF-87: SI el backend rechaza un nombre duplicado, ENTONCES EL SISTEMA identificará el conflicto junto al campo nombre.
- RF-88: SI una operación es rechazada por falta de permisos, ENTONCES EL SISTEMA mostrará un mensaje de operación no permitida.
- RF-89: SI una operación es rechazada, ENTONCES EL SISTEMA impedirá presentarla como completada.
- RF-90: SI una operación recibe un rechazo por ausencia de sesión, ENTONCES EL SISTEMA solicitará una nueva comprobación de sesión.
- RF-91: SI una modificación falla sin certeza sobre su resultado, ENTONCES EL SISTEMA informará que no pudo confirmarse.
- RF-92: EL SISTEMA excluirá reenvíos automáticos de modificaciones.
- RF-93: SI una respuesta no permite determinar un resultado válido, ENTONCES EL SISTEMA mostrará un error distinguible de un éxito.
- RF-94: SI el identificador de edición es inválido, ENTONCES EL SISTEMA mostrará un estado de dirección inválida sin consultar una categoría con ese identificador.
- RF-95: SI la categoría solicitada no existe, ENTONCES EL SISTEMA mostrará un estado de categoría no encontrada con retorno al listado.
- RF-96: SI falla la consulta de edición por conexión o servidor, ENTONCES EL SISTEMA ofrecerá reintentar la carga.
- RF-97: SI el backend informa que la categoría no existe al guardar, ENTONCES EL SISTEMA conservará los valores introducidos en modo de solo lectura.
- RF-98: MIENTRAS se muestre categoría no encontrada tras una modificación, EL SISTEMA excluirá el reintento de esa modificación.
- RF-99: CUANDO el usuario regrese al listado desde una categoría no encontrada tras una modificación, EL SISTEMA solicitará actualizar el listado.
- RF-100: SI falla la consulta posterior a una modificación confirmada, ENTONCES EL SISTEMA conservará la confirmación de la modificación.
- RF-101: SI falla la consulta posterior a una modificación confirmada, ENTONCES EL SISTEMA ofrecerá reintentar únicamente la consulta.
- RF-102: SI llega un fallo de cambio de estado después de abandonar el listado mientras siga vigente la sesión solicitante, ENTONCES EL SISTEMA mostrará un aviso accesible.
- RF-103: CUANDO el usuario vuelva al listado después de una respuesta tardía de modificación, EL SISTEMA solicitará actualizar la consulta.

### Integración con Productos

- RF-104: EL SISTEMA mantendrá la gestión de categorías exclusivamente en la sección Categorías.
- RF-105: EL SISTEMA mantendrá en los formularios de Productos únicamente la selección de categorías existentes.
- RF-106: EL SISTEMA excluirá categorías inactivas de las nuevas asignaciones a productos.
- RF-107: CUANDO el usuario vuelva a un formulario de Productos después de una modificación confirmada de categorías, EL SISTEMA solicitará actualizar las opciones disponibles.
- RF-108: EL SISTEMA conservará el comportamiento de edición de productos con categoría original inactiva o sin categoría establecido en la Spec 004.

### Accesibilidad

- RF-109: EL SISTEMA permitirá operar consultas, formularios y confirmaciones mediante teclado.
- RF-110: EL SISTEMA asociará los errores de validación con sus campos.
- RF-111: CUANDO un envío sea rechazado por validación de cliente, EL SISTEMA trasladará el foco al primer campo inválido.
- RF-112: EL SISTEMA anunciará los resultados de operaciones sin depender únicamente del color.
- RF-113: CUANDO una navegación muestre una página distinta de Categorías, EL SISTEMA trasladará el foco a su encabezado principal.
- RF-114: CUANDO se cierre una confirmación sin cambiar de página, EL SISTEMA devolverá el foco a un control disponible relacionado con la operación.

### Precisiones de búsqueda, recuperación e integración

- RF-115: EL SISTEMA tratará como duplicados los nombres que solo difieran en mayúsculas o espacios exteriores.
- RF-116: EL SISTEMA considerará reservado el nombre de una categoría inactiva.
- RF-117: SI una modificación de estado tiene un resultado incierto, ENTONCES EL SISTEMA exigirá comprobar el estado vigente antes de permitir otra modificación de estado sobre esa categoría.
- RF-118: SI el backend rechaza un cambio de estado por permisos insuficientes, categoría inexistente o productos asociados, ENTONCES EL SISTEMA excluirá el reintento directo de esa modificación.
- RF-119: CUANDO el usuario solicite actualizar las opciones de categoría desde Productos, EL SISTEMA consultará las opciones vigentes.
- RF-120: SI la información recibida confirma que una nueva categoría seleccionada no existe o está inactiva, ENTONCES EL SISTEMA invalidará esa nueva selección.
- RF-121: CUANDO se invalide una nueva selección de categoría en Productos, EL SISTEMA conservará los demás valores introducidos.
- RF-122: SI el backend informa que la categoría no existe durante un cambio de estado mientras el usuario permanezca en el listado, ENTONCES EL SISTEMA mostrará un estado de categoría no encontrada.
- RF-123: MIENTRAS se muestre categoría no encontrada tras un cambio de estado, EL SISTEMA ofrecerá un retorno al listado actualizado.
- RF-124: CUANDO un guardado se confirme correctamente, EL SISTEMA dejará de advertir sobre los cambios guardados.
- RF-125: CUANDO el usuario confirme el descarte, EL SISTEMA dejará de advertir sobre los cambios descartados.
- RF-126: MIENTRAS se conserven valores en solo lectura tras un guardado rechazado por categoría inexistente, EL SISTEMA mantendrá la confirmación de descarte al intentar abandonarlos mediante navegación interna.
- RF-127: SI la información recibida por la aplicación confirma que la categoría desapareció o cambió de estado antes de confirmar una modificación de estado, ENTONCES EL SISTEMA impedirá enviar esa confirmación desactualizada.
- RF-128: CUANDO se detecte una confirmación desactualizada, EL SISTEMA informará del cambio de disponibilidad.
- RF-129: CUANDO se detecte una confirmación desactualizada, EL SISTEMA solicitará actualizar el listado.
- RF-130: MIENTRAS un cambio de estado esté pendiente, EL SISTEMA impedirá abrir la edición de esa categoría desde el listado.
- RF-131: SI el backend rechaza datos de un campo identificable, ENTONCES EL SISTEMA asociará el error con ese campo.
- RF-132: SI el backend rechaza datos sin identificar un campo, ENTONCES EL SISTEMA mostrará un error general del formulario.
- RF-133: EL SISTEMA excluirá límites de longitud de nombre o descripción que no estén establecidos por las reglas vigentes del backend.

### Comprobaciones tras resultados inciertos y selecciones ausentes

- RF-134: SI falla la comprobación del estado vigente después de una modificación de estado con resultado incierto, ENTONCES EL SISTEMA mantendrá bloqueada otra modificación de estado sobre esa categoría.
- RF-135: SI falla la comprobación del estado vigente después de una modificación de estado con resultado incierto, ENTONCES EL SISTEMA ofrecerá reintentar únicamente la consulta de comprobación.
- RF-136: SI la comprobación posterior a una modificación de estado con resultado incierto muestra el estado solicitado, ENTONCES EL SISTEMA mostrará ese estado como vigente.
- RF-137: SI la comprobación posterior a una modificación de estado con resultado incierto muestra el estado solicitado, ENTONCES EL SISTEMA excluirá atribuir ese estado al éxito de la modificación anterior.
- RF-138: SI la comprobación posterior a una modificación de estado con resultado incierto muestra el estado anterior, ENTONCES EL SISTEMA permitirá iniciar una nueva operación mediante una nueva confirmación explícita.
- RF-139: SI una categoría seleccionada no aparece en una página o búsqueda de opciones sin confirmación de inexistencia o inactividad, ENTONCES EL SISTEMA conservará esa selección.
- RF-140: SI falla la comprobación de existencia o actividad de una nueva categoría seleccionada, ENTONCES EL SISTEMA conservará esa selección sin considerarla inválida por ese fallo.

RF-92 excluye el reenvío automático tras la comprobación de un resultado incierto. HTTP 429 es el único rechazo de cambio de estado habilitado para reintento manual en RF-83; 403, 404, el conflicto de productos asociados y los resultados inciertos no permiten reintento directo. Si la comprobación informa que la categoría no existe, se aplican RF-95 y RF-98. RF-127 no garantiza detectar cambios concurrentes aún desconocidos por la aplicación; el backend conserva la autoridad sobre la modificación. RF-120 y RF-139–RF-140 no sustituyen la autorización del backend al guardar una asignación ni modifican el tratamiento de la categoría original definido en RF-108.

## Requisitos no funcionales

- **NFR-1 — Responsive:** las vistas serán utilizables a 360, 768 y 1280 píxeles sin desbordamiento horizontal del documento; la tabla podrá desplazarse dentro de su propia región.
- **NFR-2 — Accesibilidad:** los elementos incluidos cumplirán los criterios aplicables de WCAG 2.2 nivel AA.
- **NFR-3 — Ampliación:** las acciones principales seguirán disponibles con zoom nativo del navegador al 200 %.
- **NFR-4 — Movimiento reducido:** la interfaz respetará la preferencia de movimiento reducido.
- **NFR-5 — Idioma:** etiquetas, validaciones y mensajes de aplicación estarán en español; las advertencias nativas utilizarán el idioma del navegador.
- **NFR-6 — Consistencia:** las vistas mantendrán los patrones visuales compartidos de la aplicación.
- **NFR-7 — Autoridad:** el backend será autoritativo para reglas de negocio y permisos efectivos.
- **NFR-8 — Privacidad:** los mensajes no mostrarán secretos ni detalles internos del servidor.
- **NFR-9 — Sesiones:** los resultados pendientes de una sesión anterior no se presentarán como vigentes tras cerrar o sustituir la sesión.
- **NFR-10 — Verificabilidad:** los flujos y errores podrán comprobarse mediante escenarios simulados sin credenciales privadas.
- **NFR-11 — Integridad:** la interfaz no truncará silenciosamente nombres ni descripciones antes de enviarlos.

## Casos límite

- Catálogo vacío o búsqueda sin coincidencias.
- Búsqueda formada solo por espacios.
- Criterios inválidos o página fuera de rango.
- Consultas que responden fuera de orden.
- Nombre vacío o duplicado.
- Nombre ocupado por una categoría inactiva.
- Descripción ausente o retirada durante edición.
- Nombres y descripciones extensos.
- Categoría inactiva abierta para edición.
- Categoría inexistente al cargar o guardar.
- Desactivación rechazada por productos asociados.
- Envíos repetidos durante una operación pendiente.
- Rechazo por permisos o pérdida de sesión.
- Fallo de red con resultado incierto.
- Modificación confirmada seguida de fallo de consulta.
- Navegación, historial, recarga o cierre con cambios pendientes.
- Cambio de sesión durante un guardado.
- Respuesta de modificación después de abandonar el listado.
- Reconsulta durante una edición con cambios locales.
- Categorías modificadas mientras se utilizan desde Productos.
- Nueva selección de categoría en Productos que deja de estar activa al actualizar opciones.
- Categoría que desaparece o cambia de estado antes de confirmar una modificación.
- Intento de editar una categoría mientras su cambio de estado está pendiente.
- Nuevo intento de modificación de estado después de un resultado incierto sin comprobar el estado vigente.
- Salida desde una edición en solo lectura tras un rechazo por categoría inexistente.
- Rechazo de validación del backend con campo identificable o sin él.
- Comprobación posterior a un resultado incierto que falla, muestra el estado solicitado, muestra el estado anterior o informa categoría inexistente.
- Cambio concurrente de categoría todavía desconocido por la aplicación al confirmar una modificación.
- Nueva categoría seleccionada cuya inexistencia se confirma.
- Categoría seleccionada ausente de una página o búsqueda de opciones sin confirmación de inexistencia o inactividad.
- Fallo al comprobar la existencia o actividad de una nueva categoría seleccionada.

## Fuera de alcance

- Eliminación permanente de categorías.
- Reasignación individual o masiva de productos desde Categorías.
- Gestión de productos asociados dentro de esta sección.
- Creación o edición de categorías desde formularios de Productos.
- Categorías jerárquicas o subcategorías.
- Importación, exportación y operaciones masivas.
- Ocultación de acciones según rol.
- Administración de permisos.
- Detección o resolución de conflictos de edición concurrente; la invalidación de confirmaciones solo comprende cambios conocidos mediante información recibida por la aplicación.
- Recuperación automática de formularios después de recarga o pérdida de sesión.
- Cambios en las reglas del backend.
- Inventario, movimientos de stock, compras y ventas.

## Criterios de finalización

- Todos los RF cuentan con evidencia verificable.
- Los NFR aplicables tienen pruebas o revisión manual documentada.
- Se verifica consulta → búsqueda/filtro/orden → edición → retorno al origen.
- Se verifica creación con confirmación del backend.
- Se verifican activación y desactivación con confirmación.
- Se verifica el rechazo por productos asociados sin cambiar el estado.
- Se verifican nombres duplicados, permisos y pérdida de sesión.
- Se verifica la protección de cambios y el bloqueo durante guardado.
- Se verifica la conservación de datos ante errores y reconsultas.
- Se verifica la integración con Productos sin regresiones.
- Se verifican búsqueda parcial sin distinción de mayúsculas y duplicados ignorando mayúsculas y espacios exteriores.
- Se verifica que una categoría inactiva conserva reservado su nombre.
- Se verifica que paginación e historial no provocan el reinicio de página reservado a cambios deliberados de búsqueda, filtro u orden.
- Se verifica la prioridad de la sesión sobre la recuperación editable después de un fallo.
- Se verifican los reintentos permitidos y la comprobación de estado vigente tras un resultado incierto.
- Se verifican el bloqueo y el reintento exclusivo de consulta cuando falla la comprobación posterior a un resultado incierto.
- Se verifica que observar el estado solicitado no atribuye éxito a la modificación incierta ni provoca su reenvío automático.
- Se verifica que observar el estado anterior permite una nueva operación solo mediante confirmación explícita.
- Se verifica categoría no encontrada durante un cambio de estado, tanto en el listado como después de abandonarlo.
- Se verifica el cese de la advertencia tras guardar o descartar y su conservación al salir de una edición en solo lectura tras categoría inexistente.
- Se verifica la invalidación de confirmaciones desactualizadas ante cambios conocidos por la aplicación sin enviar la modificación.
- Se verifica el bloqueo de edición de una categoría mientras su cambio de estado está pendiente.
- Se verifica la actualización de opciones de Productos al regresar o solicitarla expresamente.
- Se verifica la invalidación de nuevas selecciones confirmadas como inexistentes o inactivas conservando los demás campos y el comportamiento de la categoría original.
- Se verifica que la ausencia en una página o búsqueda de opciones no invalida por sí sola la selección.
- Se verifica que un fallo de comprobación conserva la selección sin sustituir la autoridad del backend al guardar.
- Se verifican rechazos de validación del backend asociados al campo o al formulario, sin truncamiento silencioso ni límites de longitud inventados.
- Se revisan teclado, foco, lector de pantalla, contraste y responsive.
- Se comprueban las acciones con zoom nativo al 200 %.
- Se revisa la experiencia visual con Impeccable.
- Las comprobaciones aplicables de calidad, tipos, pruebas y compilación finalizan sin errores.
- Se documentan evidencias y bloqueos antes de declarar la spec cumplida.

## Dudas abiertas

Ninguna pendiente tras las decisiones aprobadas de esta revisión. Las reglas de búsqueda y duplicados se contrastaron con el backend vigente: búsqueda parcial sin distinción de mayúsculas, comparación de nombres ignorando mayúsculas y espacios exteriores, y reserva de nombre también para categorías inactivas.
