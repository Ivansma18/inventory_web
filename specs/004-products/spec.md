# Spec 004 — Productos

## Contexto y objetivo

Inventory necesita permitir la administración del catálogo de productos desde la aplicación. Esta fase incorpora consulta, búsqueda, creación, edición y activación o desactivación de productos, utilizando las reglas existentes del backend. El usuario podrá localizar productos, mantener su información y asignarles una categoría activa existente. La gestión de categorías permanece para una fase posterior.

## Usuarios / actores

- Usuario autenticado que consulta el catálogo.
- Usuario autenticado con permisos efectivos para modificar productos.
- Usuario autenticado cuya operación es rechazada por falta de permisos.
- Usuario que navega mediante teclado o tecnologías de asistencia.
- Responsable de calidad que verifica los flujos de productos.

## Historias de usuario

- H1: Como usuario quiero consultar los productos para conocer el catálogo disponible.
- H2: Como usuario quiero buscar, filtrar y ordenar productos para localizar los que necesito.
- H3: Como usuario quiero recuperar mi consulta al volver desde edición, cancelación o errores para continuar mi trabajo.
- H4: Como usuario con permisos quiero crear productos para incorporarlos al catálogo.
- H5: Como usuario con permisos quiero editar productos para mantener su información vigente.
- H6: Como usuario con permisos quiero desactivar o reactivar productos para controlar su disponibilidad sin eliminar su historial.
- H7: Como usuario quiero conocer los errores de una operación para corregirlos sin perder los datos introducidos.
- H8: Como usuario quiero recibir una advertencia antes de descartar cambios sin guardar.

## Requisitos funcionales — criterios de aceptación en EARS

### Acceso y navegación

- RF-1: MIENTRAS exista una sesión autenticada confirmada, EL SISTEMA ofrecerá Productos como destino de la navegación principal.
- RF-2: CUANDO el usuario acceda a Productos, EL SISTEMA mostrará el listado dentro de la estructura de aplicación existente.
- RF-3: EL SISTEMA ofrecerá una página de creación de producto.
- RF-4: EL SISTEMA ofrecerá una página de edición para un producto identificado mediante su identificador público.
- RF-5: CUANDO el usuario acceda directamente a una dirección válida de listado, creación o edición, EL SISTEMA mostrará la página solicitada tras confirmar la sesión.
- RF-6: MIENTRAS la sesión esté pendiente, falle su comprobación o se confirme su ausencia, EL SISTEMA aplicará los estados de acceso establecidos para la aplicación.
- RF-7: EL SISTEMA mantendrá visibles las acciones de creación, edición y cambio de estado sin condicionarlas al rol presentado por el frontend.

### Listado y estados de consulta

- RF-8: EL SISTEMA mostrará por producto su SKU, nombre, precio de compra, precio de venta y estado activo o inactivo.
- RF-9: CUANDO el usuario abra el listado sin criterios de consulta, EL SISTEMA mostrará la primera página de productos activos ordenados por nombre ascendente.
- RF-10: EL SISTEMA utilizará quince productos por página.
- RF-11: EL SISTEMA mostrará el total de productos correspondiente a los criterios aplicados.
- RF-12: CUANDO el usuario seleccione otra página disponible, EL SISTEMA mostrará los productos de esa página.
- RF-13: MIENTRAS una consulta esté pendiente, EL SISTEMA mostrará un estado de carga identificable.
- RF-14: SI una consulta falla, ENTONCES EL SISTEMA mostrará un estado de error con una acción de reintento.
- RF-15: SI una consulta no devuelve productos, ENTONCES EL SISTEMA mostrará un estado vacío.
- RF-16: MIENTRAS exista una búsqueda aplicada sin resultados, EL SISTEMA ofrecerá una acción para limpiar la búsqueda.
- RF-17: SI la página solicitada supera la última página disponible de una consulta con resultados, ENTONCES EL SISTEMA mostrará la última página disponible.
- RF-18: SI una consulta no tiene resultados, ENTONCES EL SISTEMA representará su paginación en la primera página.

### Búsqueda, filtro, orden e historial

- RF-19: EL SISTEMA permitirá buscar coincidencias parciales en SKU y nombre sin distinguir mayúsculas y minúsculas.
- RF-20: CUANDO el usuario aplique una búsqueda, EL SISTEMA eliminará los espacios exteriores del texto.
- RF-21: SI una búsqueda queda vacía después de eliminar espacios exteriores, ENTONCES EL SISTEMA la tratará como ausencia de búsqueda.
- RF-22: EL SISTEMA permitirá seleccionar productos activos o productos inactivos como filtro de estado.
- RF-23: EL SISTEMA aplicará conjuntamente la búsqueda y el filtro de estado.
- RF-24: EL SISTEMA permitirá ordenar por nombre, SKU, precio de compra, precio de venta, fecha de creación o fecha de actualización.
- RF-25: EL SISTEMA permitirá seleccionar orden ascendente o descendente.
- RF-26: CUANDO el usuario cambie la búsqueda, el filtro de estado o el orden, EL SISTEMA volverá a la primera página.
- RF-27: EL SISTEMA reflejará la página, búsqueda, filtro de estado y orden aplicados en la dirección del listado.
- RF-28: CUANDO el usuario recargue o abra una dirección compartida del listado, EL SISTEMA restaurará los criterios válidos representados en esa dirección.
- RF-29: CUANDO el usuario utilice Atrás o Adelante, EL SISTEMA mostrará la consulta correspondiente al historial.
- RF-30: SI la dirección contiene un criterio de listado inválido, ENTONCES EL SISTEMA sustituirá ese criterio por su valor predeterminado.
- RF-31: CUANDO una consulta más reciente sustituya a otra todavía pendiente, EL SISTEMA impedirá que la respuesta anterior reemplace sus resultados.

### Creación y validación

- RF-32: EL SISTEMA ofrecerá campos de SKU, nombre, descripción, precio de compra, precio de venta y categoría en el formulario de creación.
- RF-33: EL SISTEMA requerirá SKU, nombre, precio de compra, precio de venta y categoría para crear un producto.
- RF-34: EL SISTEMA permitirá crear un producto sin descripción.
- RF-35: SI el SKU o el nombre quedan vacíos después de eliminar espacios exteriores, ENTONCES EL SISTEMA impedirá el envío e identificará el campo inválido.
- RF-36: SI un precio está vacío, no es numérico, es negativo o tiene más de dos decimales, ENTONCES EL SISTEMA impedirá el envío e identificará el campo inválido.
- RF-37: EL SISTEMA aceptará precios iguales a cero.
- RF-38: EL SISTEMA permitirá introducir precios decimales mediante coma o punto.
- RF-39: EL SISTEMA aceptará un precio de venta inferior al precio de compra.
- RF-40: CUANDO el usuario envíe un formulario de creación válido, EL SISTEMA solicitará la creación del producto.
- RF-41: MIENTRAS la creación esté pendiente, EL SISTEMA mostrará un indicador de operación en curso.
- RF-42: MIENTRAS la creación esté pendiente, EL SISTEMA impedirá envíos duplicados.
- RF-43: CUANDO el backend confirme la creación, EL SISTEMA mostrará una confirmación de éxito.
- RF-44: CUANDO el backend confirme la creación, EL SISTEMA llevará al usuario a la primera página del listado de productos activos sin búsqueda y ordenados por nombre ascendente.
- RF-45: SI la creación falla, ENTONCES EL SISTEMA conservará los valores introducidos mientras permanezca en el formulario.

### Selección de categoría

- RF-46: EL SISTEMA permitirá seleccionar categorías activas existentes mediante su nombre.
- RF-47: EL SISTEMA permitirá localizar categorías activas que no estén incluidas en la primera página de resultados disponibles.
- RF-48: MIENTRAS se consulten categorías, EL SISTEMA mostrará un estado de carga identificable.
- RF-49: SI la consulta de categorías falla, ENTONCES EL SISTEMA ofrecerá una acción de reintento.
- RF-50: SI no existen categorías activas, ENTONCES EL SISTEMA informará que no puede crearse un producto hasta que exista una.
- RF-51: SI no existe una categoría válida seleccionada, ENTONCES EL SISTEMA impedirá la creación del producto.
- RF-52: EL SISTEMA excluirá la creación, edición y cambio de estado de categorías de los formularios de productos.
- RF-53: SI el backend rechaza una categoría porque dejó de existir o de estar activa, ENTONCES EL SISTEMA identificará el problema en el campo de categoría.
- RF-54: CUANDO el backend rechace una asignación de categoría, EL SISTEMA permitirá actualizar las opciones disponibles sin perder los demás valores del formulario.

### Edición

- RF-55: CUANDO el usuario abra la edición de un producto, EL SISTEMA consultará su información vigente.
- RF-56: MIENTRAS la consulta del producto esté pendiente, EL SISTEMA impedirá editar datos que todavía no hayan sido cargados.
- RF-57: CUANDO se complete la carga inicial del producto, EL SISTEMA rellenará el formulario con sus valores actuales.
- RF-58: EL SISTEMA permitirá editar productos activos e inactivos.
- RF-59: EL SISTEMA aplicará a la edición las reglas de SKU, nombre y precios establecidas para la creación.
- RF-60: CUANDO el usuario elimine el contenido de una descripción existente y guarde, EL SISTEMA solicitará retirar esa descripción.
- RF-61: CUANDO el usuario guarde sin cambiar la categoría, EL SISTEMA conservará la categoría existente.
- RF-62: EL SISTEMA permitirá sustituir la categoría existente por otra categoría activa.
- RF-63: SI un producto existente no tiene categoría, ENTONCES EL SISTEMA lo identificará como «Sin categoría».
- RF-64: MIENTRAS el backend admita productos existentes sin categoría, EL SISTEMA permitirá guardar cambios en sus demás campos sin exigir una asignación nueva.
- RF-65: EL SISTEMA impedirá retirar una categoría existente mediante una selección vacía.
- RF-66: CUANDO el usuario guarde cambios de información, EL SISTEMA conservará el estado activo o inactivo del producto.
- RF-67: MIENTRAS el formulario no contenga cambios, EL SISTEMA impedirá una actualización vacía.
- RF-68: MIENTRAS una actualización esté pendiente, EL SISTEMA mostrará un indicador de operación en curso.
- RF-69: MIENTRAS una actualización esté pendiente, EL SISTEMA impedirá envíos duplicados.
- RF-70: CUANDO el backend confirme la actualización, EL SISTEMA mostrará una confirmación de éxito.
- RF-71: CUANDO el backend confirme la actualización, EL SISTEMA devolverá al usuario al listado con los criterios de su consulta de origen.
- RF-72: SI el usuario accedió directamente a edición sin una consulta de origen, ENTONCES EL SISTEMA utilizará los criterios predeterminados al volver al listado.
- RF-73: SI la actualización falla, ENTONCES EL SISTEMA conservará los cambios introducidos mientras permanezca en el formulario.
- RF-74: SI el producto solicitado no existe, ENTONCES EL SISTEMA mostrará un estado de producto no encontrado con retorno al listado.
- RF-75: SI el identificador de la dirección de edición es inválido, ENTONCES EL SISTEMA mostrará un estado de dirección de producto inválida con retorno al listado.
- RF-76: SI la consulta del producto falla por conexión o servidor, ENTONCES EL SISTEMA ofrecerá una acción para reintentar la carga.

### Activación y desactivación

- RF-77: MIENTRAS un producto esté activo, EL SISTEMA ofrecerá una acción para desactivarlo desde el listado.
- RF-78: MIENTRAS un producto esté inactivo, EL SISTEMA ofrecerá una acción para activarlo desde el listado.
- RF-79: CUANDO el usuario solicite activar o desactivar un producto, EL SISTEMA pedirá confirmación identificando el producto afectado.
- RF-80: MIENTRAS se solicite confirmar una desactivación, EL SISTEMA explicará que el producto se conservará.
- RF-81: CUANDO el usuario cancele la confirmación, EL SISTEMA conservará el estado del producto.
- RF-82: MIENTRAS un cambio de estado esté pendiente, EL SISTEMA mostrará un indicador de operación en curso.
- RF-83: MIENTRAS un cambio de estado esté pendiente, EL SISTEMA impedirá solicitudes duplicadas sobre ese producto.
- RF-84: EL SISTEMA conservará el estado presentado hasta recibir la confirmación del backend.
- RF-85: CUANDO el backend confirme el cambio de estado, EL SISTEMA mostrará una confirmación de éxito.
- RF-86: CUANDO el backend confirme el cambio de estado, EL SISTEMA actualizará el listado respetando la consulta aplicada.
- RF-87: SI el cambio deja la página actual fuera del rango disponible, ENTONCES EL SISTEMA mostrará la última página disponible.
- RF-88: SI el cambio de estado falla por una causa distinta de producto no encontrado, ENTONCES EL SISTEMA mostrará un error con posibilidad de reintento mientras el producto siga disponible para esa operación.
- RF-89: CUANDO el usuario solicite desactivar un producto, EL SISTEMA excluirá cualquier eliminación permanente.

### Errores y autoridad del backend

- RF-90: SI el backend rechaza un SKU duplicado, ENTONCES EL SISTEMA identificará el conflicto junto al campo SKU.
- RF-91: SI el backend rechaza un SKU duplicado, ENTONCES EL SISTEMA explicará que desactivar un producto no libera su SKU sin afirmar el estado del producto que provoca el conflicto.
- RF-92: SI el backend rechaza una operación por falta de permisos, ENTONCES EL SISTEMA mostrará un mensaje de operación no permitida.
- RF-93: SI el backend rechaza una operación por falta de permisos, ENTONCES EL SISTEMA impedirá presentar la operación como completada.
- RF-94: SI una operación recibe un rechazo por ausencia de sesión, ENTONCES EL SISTEMA solicitará una nueva comprobación de la sesión.
- RF-95: MIENTRAS se recompruebe la sesión, EL SISTEMA aplicará el comportamiento de acceso existente.
- RF-96: SI una modificación falla por conexión o servidor, ENTONCES EL SISTEMA informará que no pudo confirmarse su resultado.
- RF-97: EL SISTEMA excluirá los reenvíos automáticos de operaciones de creación, edición y cambio de estado.
- RF-98: SI una respuesta no permite determinar un resultado válido, ENTONCES EL SISTEMA mostrará un error distinguible de una operación exitosa.
- RF-99: CUANDO una operación se confirme pero falle la actualización posterior del listado, EL SISTEMA conservará la confirmación de la operación.
- RF-100: SI falla la actualización del listado después de una operación confirmada, ENTONCES EL SISTEMA ofrecerá reintentar la consulta.

### Cambios sin guardar y accesibilidad

- RF-101: CUANDO el usuario intente abandonar mediante navegación interna un formulario con cambios sin guardar y sin un guardado pendiente, EL SISTEMA solicitará confirmación antes de descartarlos.
- RF-102: CUANDO el usuario elija continuar editando, EL SISTEMA conservará el formulario.
- RF-103: CUANDO el usuario confirme el descarte, EL SISTEMA continuará hacia el destino solicitado.
- RF-104: CUANDO el usuario intente cerrar o recargar una página con cambios sin guardar, EL SISTEMA solicitará la advertencia de abandono disponible en el navegador.
- RF-105: CUANDO el usuario guarde correctamente o confirme el descarte, EL SISTEMA dejará de advertir sobre esos cambios.
- RF-106: CUANDO la presentación de sesión sustituya el formulario, EL SISTEMA dará prioridad al estado de acceso sobre la confirmación de abandono.
- RF-107: EL SISTEMA permitirá operar filtros, paginación, ordenación, formularios y confirmaciones mediante teclado.
- RF-108: EL SISTEMA asociará los errores de validación con sus campos.
- RF-109: CUANDO un envío sea rechazado por validación de cliente, EL SISTEMA trasladará el foco al primer campo inválido.
- RF-110: EL SISTEMA anunciará los resultados de las operaciones sin depender únicamente del color.
- RF-111: CUANDO una navegación muestre una página de Productos distinta, EL SISTEMA trasladará el foco a su encabezado principal.
- RF-112: CUANDO se cierre una confirmación sin cambiar de página, EL SISTEMA devolverá el foco a un control disponible relacionado con la operación.

### Comportamientos aclarados tras la revisión

#### Guardado pendiente

- RF-113: MIENTRAS una creación o actualización esté pendiente, EL SISTEMA impedirá modificar los campos del formulario.
- RF-114: SI una creación o actualización falla por una causa distinta de producto no encontrado mientras el formulario siga disponible, ENTONCES EL SISTEMA volverá a permitir la edición de los valores conservados.
- RF-115: MIENTRAS una creación o actualización esté pendiente, EL SISTEMA impedirá abandonar el formulario mediante navegación interna, incluidos Atrás y Adelante.
- RF-116: CUANDO el usuario intente abandonar el formulario mediante navegación interna durante un guardado pendiente, EL SISTEMA informará que debe esperar el resultado de la operación.
- RF-117: CUANDO un estado de sesión sustituya el formulario durante un guardado pendiente, EL SISTEMA dará prioridad a ese estado sobre el bloqueo de navegación.

La advertencia nativa de cierre o recarga de RF-104 se conserva; el bloqueo anterior se limita a navegación interna.

#### Cambio de estado pendiente

- RF-118: MIENTRAS una activación o desactivación esté pendiente, EL SISTEMA permitirá navegar fuera del listado.
- RF-119: CUANDO una respuesta de cambio de estado llegue después de abandonar el listado, EL SISTEMA conservará la página actual del usuario.
- RF-120: CUANDO una respuesta de cambio de estado llegue después de abandonar el listado, EL SISTEMA conservará el foco de la página actual.

#### Consulta de origen

- RF-121: CUANDO el usuario active Cancelar en un formulario sin cambios o confirme el descarte solicitado por esa acción, EL SISTEMA volverá al listado con los criterios de su consulta de origen.
- RF-122: CUANDO el usuario active el retorno al listado desde un estado de producto no encontrado o dirección de producto inválida, EL SISTEMA restaurará los criterios de su consulta de origen.
- RF-123: CUANDO el usuario recargue una página de creación o edición, EL SISTEMA conservará la consulta de origen asociada a esa página.
- RF-124: SI un retorno al listado no dispone de una consulta de origen válida, ENTONCES EL SISTEMA utilizará los criterios predeterminados.

Estos retornos respetan las reglas de corrección de página de RF-17 y RF-18. El retorno tras creación exitosa sigue la excepción explícita de RF-44.

RF-103 se conserva: si el descarte se solicita al intentar navegar a Inicio u otro destino, se continúa hacia ese destino, no hacia el listado.

#### Precios

- RF-125: SI un precio contiene separadores de miles, ENTONCES EL SISTEMA impedirá el envío e identificará el campo inválido.
- RF-126: SI un precio contiene simultáneamente coma y punto, ENTONCES EL SISTEMA impedirá el envío e identificará el campo inválido.

La coma o el punto se interpretan únicamente como separador decimal. Por tanto, `1.234` y `1,234` se rechazan por tener tres decimales conforme a RF-36; `1.234,56` se rechaza por mezclar separadores.

#### Categorías

- RF-127: CUANDO el backend rechace la categoría seleccionada porque no existe o está inactiva, EL SISTEMA dejará de considerarla una selección válida para guardar.
- RF-128: MIENTRAS una asignación de categoría rechazada no haya sido sustituida por una selección activa validada de nuevo, EL SISTEMA impedirá reenviar esa asignación.
- RF-129: SI falla la consulta de categorías durante la edición de un producto cargado, ENTONCES EL SISTEMA permitirá guardar cambios que conserven su categoría original.
- RF-130: SI falla la consulta de categorías durante la edición de un producto originalmente sin categoría, ENTONCES EL SISTEMA permitirá guardar cambios en sus demás campos mientras el backend admita esa condición.

RF-61 sigue aplicándose cuando la categoría original no se modifica: conservarla no implica volver a asignarla. La creación y cualquier nueva asignación requieren una selección activa válida.

#### Producto desaparecido

- RF-131: SI el backend informa que el producto no existe al guardar o cambiar su estado mientras el usuario permanezca en la página desde la que solicitó la operación, ENTONCES EL SISTEMA mostrará un estado de producto no encontrado con retorno al listado.
- RF-132: MIENTRAS se muestre producto no encontrado tras una modificación rechazada, EL SISTEMA excluirá el reintento de esa modificación.
- RF-133: SI el backend informa que el producto no existe al guardar una edición, ENTONCES EL SISTEMA conservará los valores introducidos visibles en modo de solo lectura hasta que el usuario abandone esa página.
- RF-134: CUANDO el usuario vuelva al listado desde un producto no encontrado tras una modificación rechazada, EL SISTEMA solicitará actualizar la consulta del listado.

El retorno desde edición conserva la protección de cambios sin guardar ya definida en RF-101–RF-103.

#### Reconsultas con cambios locales

- RF-135: CUANDO llegue una nueva respuesta de consulta del producto mientras el formulario tenga cambios sin guardar, EL SISTEMA conservará los valores locales del formulario.
- RF-136: CUANDO llegue una nueva respuesta de consulta del producto mientras el formulario tenga cambios sin guardar, EL SISTEMA conservará su condición de cambios pendientes.

Esto no incorpora detección de conflictos ni evita sobrescrituras concurrentes en el backend.

#### Respuesta tardía de producto no encontrado

- RF-137: SI una respuesta de activación o desactivación informa que el producto no existe después de abandonar el listado mientras siga vigente la sesión que solicitó la operación, ENTONCES EL SISTEMA mostrará un aviso accesible del fallo.
- RF-138: CUANDO el usuario vuelva al listado después de recibir un aviso tardío de producto no encontrado, EL SISTEMA solicitará actualizar la consulta del listado.

RF-119 y RF-120 conservan la página y el foco actuales. NFR-10 sigue excluyendo presentar resultados pendientes de una sesión anterior como vigentes.

RF-115 y RF-116 siguen aplicándose durante el guardado: navegación interna bloqueada y aviso de espera. Si falla, un nuevo intento de salida aplica RF-101. Los estados de sesión conservan su prioridad.

## Requisitos no funcionales

- **NFR-1 — Responsive:** las vistas serán utilizables a 360, 768 y 1280 píxeles sin desbordamiento horizontal de la página; el listado podrá desplazarse dentro de su propia región.
- **NFR-2 — Accesibilidad:** los elementos incluidos cumplirán los criterios aplicables de WCAG 2.2 nivel AA.
- **NFR-3 — Ampliación:** las acciones principales seguirán disponibles con zoom nativo del navegador al 200 %.
- **NFR-4 — Movimiento reducido:** la interfaz respetará la preferencia de movimiento reducido.
- **NFR-5 — Idioma:** etiquetas, validaciones y mensajes de aplicación estarán en español; las advertencias nativas utilizarán el idioma del navegador.
- **NFR-6 — Consistencia visual:** las vistas utilizarán los patrones y tokens compartidos de la aplicación.
- **NFR-7 — Precios:** los precios se mostrarán con dos decimales y sin atribuirles una moneda no definida por el negocio.
- **NFR-8 — Seguridad:** el backend será la autoridad sobre validación de negocio y permisos efectivos.
- **NFR-9 — Privacidad:** los mensajes no mostrarán secretos, cookies ni detalles internos del servidor.
- **NFR-10 — Separación de sesiones:** el cierre o sustitución de la sesión impedirá presentar como vigentes resultados pendientes de la sesión anterior.
- **NFR-11 — Verificabilidad:** los flujos y errores podrán verificarse mediante escenarios simulados sin credenciales privadas.
- **NFR-12 — Integridad de datos:** la interfaz no truncará silenciosamente SKU, nombres, descripciones ni precios antes de enviarlos.

## Casos límite

- Catálogo vacío y búsquedas sin coincidencias.
- Productos activos e inactivos con el mismo criterio de búsqueda.
- Búsqueda formada solo por espacios.
- Respuestas de búsquedas anteriores que llegan después de una consulta nueva.
- Dirección del listado con parámetros inválidos.
- Página fuera de rango tras desactivar el último producto visible.
- SKU que solo difiere por mayúsculas o espacios exteriores.
- SKU ocupado por un producto inactivo.
- SKU o nombre formados solo por espacios.
- Precios iguales a cero, negativos, vacíos o con más de dos decimales.
- Precio de venta inferior al de compra.
- Descripción ausente y eliminación de una descripción existente.
- Producto inactivo abierto directamente para edición.
- Producto existente sin categoría durante la clasificación temporal.
- Catálogo de categorías con más de una página.
- Ausencia de categorías activas.
- Error al consultar categorías.
- Categoría eliminada o desactivada mientras se completa el formulario.
- Producto inexistente o identificador inválido.
- Envíos repetidos durante una operación pendiente.
- Operación rechazada por falta de permisos.
- Sesión expirada durante una modificación.
- Fallo de red sin certeza sobre el resultado de una modificación.
- Operación confirmada seguida de un fallo al refrescar el listado.
- Salida por enlace, Atrás, recarga o cierre con cambios sin guardar.
- Retirada del formulario por un cambio de sesión.
- Nombres, SKU y descripciones largos.
- Cambio de estado que retira la fila donde estaba el foco.
- Ediciones concurrentes sin garantía de detección de conflictos en el contrato actual.
- Intento de modificar campos durante un guardado pendiente.
- Intento de navegación interna o historial durante un guardado pendiente.
- Sustitución del formulario por un estado de sesión durante el guardado.
- Respuesta de cambio de estado después de abandonar el listado.
- Retorno a la consulta de origen después de recargar el formulario.
- Precios con ambos separadores o con separadores de miles.
- Reenvío de una asignación de categoría previamente rechazada.
- Fallo de categorías al editar sin cambiar la categoría original.
- Producto no encontrado al guardar o cambiar su estado.
- Reconsulta del producto mientras existen cambios locales.
- Cancelar el formulario frente a descartar cambios al navegar a otro destino.
- Producto desaparecido tras guardar, con valores conservados en solo lectura.
- Intento de salida durante un guardado pendiente sin ofrecer descarte.
- Nuevo intento de salida después de un guardado fallido.
- Error tardío de producto no encontrado comunicado sin sustituir página ni mover foco.

## Fuera de alcance

- Creación, edición, activación, desactivación o eliminación de categorías.
- Filtro de productos por categoría.
- Vista combinada de productos activos e inactivos.
- Pantalla de detalle independiente del formulario de edición.
- Eliminación permanente de productos.
- Operaciones masivas, importación y exportación.
- Existencias, mínimos y movimientos de stock.
- Compras, ventas, impuestos, descuentos y múltiples monedas.
- Imágenes, códigos de barras y variantes.
- Login, registro y recuperación de acceso.
- Ocultación de acciones según rol y administración de permisos.
- Organizaciones y aislamiento multi-tenant.
- Detección o resolución de ediciones concurrentes no soportada por el backend.
- Recuperación automática de formularios tras recarga, cierre de pestaña o pérdida de sesión.
- Cambios en las reglas o contratos del backend.

## Criterios de finalización

- Todos los RF cuentan con evidencia verificable.
- Los NFR aplicables tienen evidencia automatizada o revisión manual documentada.
- Se verifica listado → búsqueda/filtro/orden → edición → retorno a la consulta de origen.
- Se verifica creación con categoría activa y confirmación del backend.
- Se verifican SKU duplicado, validaciones de precios y errores de categoría.
- Se verifican activación y desactivación con confirmación, fallo y reintento.
- Se verifica la corrección de página tras cambios en el conjunto de resultados.
- Se verifican carga, error, vacío y recuperación de consultas.
- Se verifican rechazos por permisos y pérdida de sesión.
- Se verifica la protección frente a respuestas de consultas obsoletas.
- Se verifica la advertencia de cambios sin guardar.
- Se revisan teclado, foco, lector de pantalla, responsive y zoom al 200 %.
- Se revisa la experiencia con Impeccable.
- Las comprobaciones de calidad, tipos, pruebas y compilación aplicables finalizan sin errores.
- Las regresiones de App Shell y autenticación continúan pasando.
- Se conservan las evidencias y los bloqueos que impidan el cierre.
- Se verifica el bloqueo de campos y navegación interna durante un guardado pendiente.
- Se verifica que los estados de sesión prevalecen sobre ese bloqueo.
- Se verifica que una respuesta tardía de cambio de estado no altera página ni foco.
- Se verifica el retorno a la consulta de origen tras cancelación, errores y recarga.
- Se verifican las entradas de precios ambiguas o no admitidas.
- Se verifica la invalidación de una selección de categoría rechazada.
- Se verifica la edición sin reasignación ante un fallo de consulta de categorías.
- Se verifica producto no encontrado durante una modificación sin ofrecer reintento.
- Se verifica que una reconsulta no sobrescribe cambios locales ni los marca como guardados.
- Se verifica que Cancelar vuelve al listado de origen y que descartar al navegar continúa hacia el destino solicitado.
- Se verifica que producto no encontrado tras guardar conserva los valores en solo lectura.
- Se verifica la prioridad del aviso de espera durante el guardado y la recuperación del descarte tras un fallo.
- Se verifica el aviso accesible de producto no encontrado después de abandonar el listado.
- Se verifica la actualización del listado al regresar después de ese aviso.

## Dudas abiertas

- Los nueve hallazgos de la revisión de spec-reviewer quedaron aclarados mediante las decisiones aprobadas con change-manager y recogidas en los requisitos existentes ajustados y RF-113–RF-136.
- Los cuatro hallazgos de la segunda revisión de spec-reviewer quedaron aclarados mediante las decisiones aprobadas con change-manager y recogidas en RF-101, RF-114, RF-121, RF-131, RF-133 y RF-137–RF-138.
- La composición visual de las vistas y la interacción concreta del selector de categorías se definirán durante el diseño, respetando los comportamientos de esta spec.
- El contrato actual no ofrece una garantía de detección de ediciones concurrentes; esta fase no promete impedir que una edición posterior sobrescriba otra.
