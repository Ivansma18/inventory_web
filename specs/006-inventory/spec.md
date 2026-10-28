# Spec 006 — Inventario

## Contexto y objetivo

Inventory necesita una vista que permita consultar las existencias de los productos, identificar situaciones de stock bajo o agotado y conocer el último movimiento registrado. Esta fase incorpora consulta de inventario con búsqueda, filtros, ordenación y paginación, además del acceso a la edición existente del producto. No incorpora operaciones que modifiquen existencias.

## Usuarios / actores

- Usuario autenticado que consulta existencias.
- Usuario con permisos efectivos para editar productos.
- Usuario que navega mediante teclado o tecnologías de asistencia.
- Responsable de calidad que verifica los flujos.

## Historias de usuario

- H1: Como usuario quiero consultar existencias para conocer la disponibilidad de los productos.
- H2: Como usuario quiero identificar productos con stock bajo o agotado para detectar necesidades de reposición.
- H3: Como usuario quiero buscar y filtrar el inventario para localizar productos.
- H4: Como usuario quiero conocer la fecha UTC, el tipo y la cantidad del último movimiento para contextualizar las existencias mostradas.
- H5: Como usuario quiero consultar también productos inactivos para revisar su inventario.
- H6: Como usuario quiero editar un producto y recuperar después mi consulta de inventario.

## Requisitos funcionales — criterios de aceptación en EARS

### Acceso y navegación

- RF-1: MIENTRAS exista una sesión autenticada confirmada, EL SISTEMA ofrecerá Inventario como destino de la navegación principal.
- RF-2: CUANDO el usuario acceda a Inventario, EL SISTEMA mostrará el listado dentro de la estructura de aplicación existente.
- RF-3: CUANDO el usuario abra directamente una dirección válida de Inventario, EL SISTEMA mostrará la consulta solicitada tras confirmar la sesión.
- RF-4: MIENTRAS la sesión esté pendiente, falle su comprobación o se confirme su ausencia, EL SISTEMA aplicará los estados de acceso establecidos para la aplicación.

### Información del listado

- RF-5: EL SISTEMA mostrará el nombre de cada producto.
- RF-6: EL SISTEMA mostrará el SKU de cada producto.
- RF-7: EL SISTEMA mostrará las existencias actuales de cada producto.
- RF-8: EL SISTEMA mostrará las existencias mínimas de cada producto.
- RF-9: EL SISTEMA identificará el estado de existencias de cada producto mediante una etiqueta textual.
- RF-10: EL SISTEMA clasificará como «Sin existencias» una cantidad igual a cero, como «Stock bajo» una cantidad positiva menor o igual al mínimo, y como «Con existencias» una cantidad mayor al mínimo.
- RF-11: EL SISTEMA distinguirá el estado activo o inactivo del producto de su estado de existencias.
- RF-12: EL SISTEMA conservará la precisión de las cantidades recibidas sin aplicar redondeos que alteren su valor.
- RF-13: SI cualquier registro de inventario de la respuesta carece de datos obligatorios o contiene existencias, mínimo o estado inválidos, ENTONCES EL SISTEMA rechazará la respuesta completa y mostrará un error sin presentar resultados parciales ni inventar valores.

### Último movimiento

- RF-14: MIENTRAS exista un último movimiento informado para un producto, EL SISTEMA mostrará su fecha y hora en UTC e identificará explícitamente esa zona horaria.
- RF-15: MIENTRAS exista un último movimiento informado para un producto, EL SISTEMA identificará su tipo mediante una etiqueta en español.
- RF-16: MIENTRAS exista un último movimiento informado para un producto, EL SISTEMA mostrará la cantidad transaccionada para entradas y salidas, y la existencia resultante para ajustes, identificando su significado.
- RF-17: SI la consulta del último movimiento finaliza correctamente y no devuelve movimientos, ENTONCES EL SISTEMA mostrará «Sin movimientos».
- RF-18: EL SISTEMA excluirá cantidades de existencias inventadas a partir de la ausencia de movimientos.

### Paginación y estados de consulta

- RF-19: CUANDO el usuario abra Inventario sin criterios de consulta, EL SISTEMA mostrará la primera página de productos activos, sin búsqueda ni filtro de existencias, ordenados por nombre ascendente.
- RF-20: EL SISTEMA utilizará quince productos por página.
- RF-21: EL SISTEMA mostrará el total correspondiente a los criterios aplicados.
- RF-22: CUANDO el usuario seleccione otra página disponible, EL SISTEMA mostrará los resultados correspondientes.
- RF-23: MIENTRAS una consulta esté pendiente, EL SISTEMA mostrará un estado de carga identificable.
- RF-24: SI una consulta falla por conexión o servidor, ENTONCES EL SISTEMA ofrecerá una acción para reintentarla conservando los criterios aplicados.
- RF-25: SI una consulta no devuelve productos, ENTONCES EL SISTEMA mostrará un estado vacío.
- RF-26: MIENTRAS exista una búsqueda aplicada sin resultados, EL SISTEMA ofrecerá una acción para limpiar la búsqueda.
- RF-27: SI la página solicitada supera la última página disponible con resultados, ENTONCES EL SISTEMA mostrará la última página disponible.
- RF-28: SI una consulta no tiene resultados, ENTONCES EL SISTEMA representará su paginación en la primera página.

### Búsqueda, filtros y ordenación

- RF-29: EL SISTEMA permitirá buscar coincidencias parciales en nombre o SKU sin distinguir mayúsculas y minúsculas.
- RF-30: CUANDO el usuario aplique una búsqueda, EL SISTEMA eliminará los espacios exteriores del texto.
- RF-31: SI una búsqueda queda vacía tras eliminar espacios exteriores, ENTONCES EL SISTEMA la tratará como ausencia de búsqueda.
- RF-32: EL SISTEMA permitirá seleccionar productos activos o inactivos como filtro.
- RF-33: EL SISTEMA permitirá filtrar por cada uno de los tres estados de existencias.
- RF-34: EL SISTEMA permitirá consultar todos los estados de existencias sin aplicar ese filtro.
- RF-35: EL SISTEMA aplicará conjuntamente la búsqueda y los filtros seleccionados.
- RF-36: EL SISTEMA permitirá ordenar por nombre, SKU, existencias actuales, existencias mínimas o fecha de actualización.
- RF-37: EL SISTEMA permitirá seleccionar orden ascendente o descendente.
- RF-38: CUANDO el usuario cambie deliberadamente la búsqueda, un filtro o el orden, EL SISTEMA volverá a la primera página.
- RF-39: CUANDO el usuario cambie únicamente de página, EL SISTEMA conservará los demás criterios aplicados.

### Dirección e historial

- RF-40: EL SISTEMA reflejará los criterios aplicados en la dirección del listado.
- RF-41: CUANDO el usuario recargue o abra una dirección compartida, EL SISTEMA restaurará sus criterios válidos.
- RF-42: CUANDO el usuario utilice Atrás o Adelante, EL SISTEMA mostrará la consulta correspondiente al historial.
- RF-43: SI la dirección contiene un criterio inválido, ENTONCES EL SISTEMA lo sustituirá por su valor predeterminado sin añadir una entrada de historial.
- RF-44: CUANDO una consulta sustituya a otra todavía pendiente, EL SISTEMA impedirá que la respuesta anterior reemplace los resultados vigentes.

### Edición del producto y retorno

- RF-45: EL SISTEMA ofrecerá una acción para abrir la edición existente de cada producto.
- RF-46: EL SISTEMA mantendrá visible la acción de edición sin condicionarla al rol presentado por el frontend.
- RF-47: CUANDO el usuario abra la edición desde Inventario, EL SISTEMA conservará la consulta de origen para el retorno.
- RF-48: CUANDO se confirme la edición de un producto abierta desde Inventario, EL SISTEMA devolverá al usuario a la consulta de inventario de origen.
- RF-49: CUANDO el usuario utilice Cancelar en una edición abierta desde Inventario sin cambios o confirme el descarte solicitado por Cancelar, EL SISTEMA volverá a la consulta de inventario de origen.
- RF-50: CUANDO el usuario recargue una edición abierta desde Inventario, EL SISTEMA conservará la consulta de origen asociada.
- RF-51: SI el identificador de producto es inválido o el producto no existe al abrir o guardar esa edición, ENTONCES EL SISTEMA ofrecerá volver a la consulta de inventario de origen.
- RF-52: CUANDO el usuario vuelva a Inventario desde la edición, EL SISTEMA solicitará información vigente para los criterios de origen.
- RF-53: SI no existe un origen de inventario válido, ENTONCES EL SISTEMA conservará el comportamiento de retorno establecido para Productos.
- RF-54: EL SISTEMA excluirá destinos externos del retorno desde edición.
- RF-55: EL SISTEMA conservará la validación, protección de cambios y tratamiento de errores establecidos para la edición de Productos.

### Autoridad y sesiones

- RF-56: EL SISTEMA excluirá la modificación directa de existencias desde Inventario.
- RF-57: EL SISTEMA excluirá la modificación de existencias al editar la información del producto.
- RF-58: SI una consulta de Inventario o del último movimiento recibe un rechazo por ausencia de sesión, ENTONCES EL SISTEMA solicitará una nueva comprobación de sesión.
- RF-59: SI una consulta de Inventario o del último movimiento es rechazada por falta de permisos, ENTONCES EL SISTEMA mostrará un mensaje de acceso no permitido.
- RF-60: CUANDO se cierre o sustituya la sesión, EL SISTEMA impedirá presentar resultados pendientes de la sesión anterior como vigentes.

### Accesibilidad

- RF-61: EL SISTEMA permitirá operar búsqueda, filtros, ordenación, paginación y acceso a edición mediante teclado.
- RF-62: EL SISTEMA proporcionará nombres accesibles a los controles de consulta.
- RF-63: EL SISTEMA identificará los estados de existencias sin depender únicamente del color.
- RF-64: EL SISTEMA anunciará los estados de carga, error y resultado de las consultas mediante información accesible.
- RF-65: CUANDO una navegación muestre la página de Inventario, EL SISTEMA trasladará el foco a su encabezado principal.

### Integridad de datos y recuperación

- RF-66: EL SISTEMA incluirá en el listado únicamente productos que tengan un registro de inventario existente.
- RF-67: EL SISTEMA no interpretará la ausencia de un registro de inventario como existencias iguales a cero.
- RF-68: SI la consulta del último movimiento de un producto falla por una causa distinta de los rechazos 401 y 403, incluyendo una respuesta inválida, ENTONCES EL SISTEMA mostrará «No se pudo consultar».
- RF-69: SI falla la consulta del último movimiento de un producto y la sesión solicitante sigue vigente, ENTONCES EL SISTEMA conservará visibles los datos válidos de inventario de ese producto.
- RF-70: SI la consulta del último movimiento de un producto falla por conexión o servidor, o devuelve una respuesta inválida distinta de un rechazo 401 o 403, ENTONCES EL SISTEMA ofrecerá reintentar únicamente esa consulta.
- RF-71: CUANDO el usuario confirme el descarte al intentar navegar hacia otro destino desde una edición, EL SISTEMA continuará hacia el destino solicitado.
- RF-72: SI falla la consulta de Inventario posterior a una edición confirmada y la sesión solicitante sigue vigente, ENTONCES EL SISTEMA conservará la confirmación de éxito de la edición.
- RF-73: SI falla la consulta de Inventario posterior a una edición confirmada, ENTONCES EL SISTEMA ofrecerá reintentar únicamente esa consulta de acuerdo con RF-75 y RF-76.
- RF-74: CUANDO el sistema corrija una página solicitada fuera de rango, EL SISTEMA reemplazará la entrada actual del historial.
- RF-75: MIENTRAS se compruebe la sesión tras un rechazo por ausencia de sesión de Inventario o del último movimiento, EL SISTEMA excluirá el reintento directo de la consulta que recibió el rechazo.
- RF-76: SI una consulta de Inventario o del último movimiento es rechazada por falta de permisos, ENTONCES EL SISTEMA excluirá el reintento directo de esa consulta.
- RF-77: EL SISTEMA considerará válidas las cantidades actuales y mínimas únicamente cuando sean enteros no negativos.
- RF-78: MIENTRAS la consulta del último movimiento de un producto esté pendiente, EL SISTEMA mostrará un indicador de carga específico para ese dato.
- RF-79: MIENTRAS la consulta del último movimiento de un producto esté pendiente, EL SISTEMA conservará visibles las existencias válidas disponibles de ese producto.
- RF-80: MIENTRAS la consulta del último movimiento de un producto esté pendiente, EL SISTEMA no mostrará «Sin movimientos».

## Requisitos no funcionales

- **NFR-1 — Responsive:** las vistas serán utilizables a 360, 768 y 1280 píxeles sin desbordamiento horizontal del documento; la tabla podrá desplazarse dentro de su propia región.
- **NFR-2 — Accesibilidad:** los elementos incluidos cumplirán los criterios aplicables de WCAG 2.2 nivel AA.
- **NFR-3 — Ampliación:** las acciones principales seguirán disponibles con zoom nativo al 200 %.
- **NFR-4 — Movimiento reducido:** la interfaz respetará la preferencia de movimiento reducido.
- **NFR-5 — Idioma:** las etiquetas, estados y mensajes de aplicación estarán en español.
- **NFR-6 — Consistencia:** la vista mantendrá los patrones visuales compartidos de la aplicación.
- **NFR-7 — Autoridad:** el backend será autoritativo para cantidades, estados de existencias y permisos efectivos.
- **NFR-8 — Privacidad:** los mensajes no mostrarán secretos ni detalles internos del servidor.
- **NFR-9 — Verificabilidad:** los flujos podrán comprobarse mediante escenarios simulados sin credenciales privadas.
- **NFR-10 — Compatibilidad:** los accesos a edición desde Productos conservarán su comportamiento previo.

## Casos límite

- Inventario vacío o búsqueda sin coincidencias.
- Búsqueda formada solo por espacios.
- Criterios inválidos o página fuera de rango.
- Respuestas que llegan fuera de orden.
- Producto inactivo con existencias.
- Producto sin movimientos registrados.
- Existencias iguales al mínimo.
- Existencias y mínimo iguales a cero.
- Existencias actuales o mínimas negativas o fraccionarias recibidas como datos inválidos que obligan a rechazar la respuesta completa.
- Último movimiento de tipo ajuste.
- Respuesta sin información suficiente para mostrar inventario válido.
- Producto sin registro de inventario.
- Registro de inventario con cantidades o estado inválidos.
- Fallo al consultar el último movimiento cuando el inventario del producto sí es válido.
- Respuesta inválida de la consulta del último movimiento cuando el inventario del producto sí es válido.
- Consulta del último movimiento pendiente mientras las existencias válidas ya están disponibles.
- Consulta correcta del último movimiento sin resultados.
- Reintento del último movimiento sin repetir la consulta de inventario.
- Rechazo 401 de la consulta del último movimiento durante la comprobación de sesión.
- Rechazo 403 de la consulta del último movimiento.
- Producto que cambia de nombre, SKU o estado durante la consulta.
- Producto editado que deja de coincidir con los filtros de origen.
- Producto inexistente al abrir o guardar la edición.
- Identificador de producto inválido en la dirección de edición.
- Fallo de consulta al regresar desde edición.
- Edición confirmada seguida de fallo al consultar el inventario de origen.
- Corrección de página fuera de rango seguida de navegación Atrás.
- Recarga de la edición con origen de inventario.
- Pérdida o sustitución de sesión durante una consulta.
- Retorno ausente, inválido o externo.
- Descarte solicitado al navegar a un destino distinto de Inventario.
- Rechazo 401 durante la consulta con revalidación de sesión pendiente.
- Rechazo 403 de la consulta.

## Fuera de alcance

- Entradas, salidas y ajustes de existencias.
- Edición directa de stock actual.
- Modificación del stock mínimo.
- Historial completo de movimientos o detalle de un movimiento.
- Creación de productos desde Inventario.
- Acciones de activación o desactivación dentro del listado de Inventario.
- Alertas automáticas y notificaciones de reposición.
- Reservas, almacenes múltiples, lotes y números de serie.
- Valoración económica del inventario.
- Exportación, importación y operaciones masivas.
- Actualización en tiempo real.
- Ocultación de acciones según rol.
- Cambios en reglas de negocio del backend.

## Criterios de finalización

- Todos los RF cuentan con evidencia verificable.
- Los NFR tienen pruebas o revisión manual documentada.
- Se verifica la consulta inicial con productos activos, quince elementos y nombre ascendente.
- Se verifica la combinación de búsqueda, estado del producto y estado de existencias.
- Se verifican paginación, recarga e historial.
- Se comprueban los tres estados de existencias y sus límites.
- Se rechaza la respuesta completa si contiene un registro de inventario inválido.
- Solo se muestran productos con registro de inventario; su ausencia no se convierte en stock cero.
- Se verifica la representación del último movimiento y su ausencia.
- Se verifican fecha UTC, tipo y semántica de cantidad para cada tipo de movimiento.
- Se verifica que una consulta pendiente del último movimiento muestra su carga, conserva las existencias y no muestra «Sin movimientos».
- Se comprueba que un error o respuesta inválida del último movimiento conserva el inventario y permite reintentar solo esa consulta cuando RF-75 y RF-76 no lo excluyan.
- Se verifica edición → retorno con criterios de origen y datos actualizados.
- Se comprueban los retornos desde identificadores inválidos y productos inexistentes.
- Se comprueba que un fallo de consulta tras edición confirmada no repite el guardado, que su reintento respeta RF-75 y RF-76 y que el éxito se conserva mientras la sesión solicitante siga vigente.
- Se verifica que corregir una página fuera de rango reemplaza la entrada del historial.
- Se comprueba que Cancelar vuelve al origen y que descartar hacia otro destino continúa hacia ese destino.
- Se verifican los comportamientos diferenciados de 401, 403 y fallos de conexión o servidor para Inventario y último movimiento.
- Se comprueba que editar información del producto no modifica existencias.
- Se comprueba la compatibilidad de los flujos previos de Productos.
- Se verifican errores, permisos y sustitución de sesión.
- Se revisan teclado, foco, lector de pantalla, contraste y responsive.
- Se comprueban las acciones con zoom nativo al 200 %.
- Se revisa la experiencia visual con Impeccable.
- Las comprobaciones aplicables de calidad, tipos, pruebas y compilación finalizan sin errores.

## Dudas abiertas

Ninguna pendiente tras contrastar las reglas de inventario y movimientos con el backend vigente y resolver los casos de navegación, errores e historial con el usuario.
