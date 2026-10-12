# Spec 002 — Design System Foundation

## Contexto y objetivo

Inventory necesita un conjunto inicial de componentes de interfaz con comportamientos consistentes y verificables antes de construir las pantallas de aplicación y negocio. Esta fase establece once primitivas reutilizables: Button, Icon, Input, Textarea, Select, Dialog, DataTable, Badge, Toast, Tooltip y Skeleton. Una página de demostración exclusiva de desarrollo permitirá revisar sus estados, accesibilidad e interacciones.

## Usuarios / actores

- Desarrollador que incorpora componentes a futuras pantallas.
- Responsable de diseño que revisa consistencia visual y estados.
- Usuario que interactúa con los componentes mediante ratón, teclado o tecnologías de asistencia.
- Responsable de calidad que verifica los contratos de interacción.

## Historias de usuario

- H1: Como desarrollador quiero disponer de componentes con comportamientos definidos para construir pantallas sin repetir soluciones de interacción.
- H2: Como usuario quiero identificar las acciones disponibles y sus estados para saber cuándo puedo interactuar.
- H3: Como usuario quiero introducir y seleccionar valores con ayuda accesible para reconocer y corregir errores.
- H4: Como usuario quiero interactuar con diálogos mediante teclado para completar una acción sin perder el contexto.
- H5: Como usuario quiero recorrer y ordenar una tabla para localizar información.
- H6: Como usuario quiero distinguir notificaciones y estados de carga para comprender el resultado de una interacción.
- H7: Como responsable de calidad quiero revisar los componentes en una demostración de desarrollo para comprobar sus estados sin depender del backend.

## Requisitos funcionales — criterios de aceptación en EARS

### Comportamientos comunes

- RF-1: EL SISTEMA ofrecerá las once primitivas acordadas.
- RF-2: EL SISTEMA mostrará un indicador de foco visible en los elementos interactivos cuando reciban foco mediante teclado.
- RF-3: MIENTRAS un control esté deshabilitado, EL SISTEMA impedirá que su interacción ejecute la acción asociada.
- RF-4: EL SISTEMA permitirá proporcionar un nombre accesible a cada control interactivo.

### Button

- RF-5: CUANDO el usuario active un Button habilitado, EL SISTEMA ejecutará una sola vez la acción asociada a esa activación.
- RF-6: CUANDO un Button reciba foco, EL SISTEMA permitirá activarlo mediante Enter o Espacio.
- RF-7: MIENTRAS un Button esté en estado de carga, EL SISTEMA mostrará un indicador de operación pendiente.
- RF-8: MIENTRAS un Button esté en estado de carga, EL SISTEMA impedirá nuevas activaciones de su acción.
- RF-9: EL SISTEMA permitirá presentar un Button con texto, con texto e icono o únicamente con icono.
- RF-10: EL SISTEMA exigirá un nombre accesible explícito para un Button presentado únicamente con icono.

### Icon

- RF-11: EL SISTEMA permitirá presentar un Icon como elemento decorativo o informativo.
- RF-12: MIENTRAS un Icon sea decorativo, EL SISTEMA lo excluirá de la información anunciada por tecnologías de asistencia.
- RF-13: MIENTRAS un Icon sea informativo, EL SISTEMA ofrecerá una alternativa textual que describa su significado.

### Input y Textarea

- RF-14: CUANDO el usuario edite un Input habilitado, EL SISTEMA comunicará el nuevo valor a su consumidor.
- RF-15: CUANDO el usuario edite un Textarea habilitado, EL SISTEMA comunicará el nuevo valor a su consumidor.
- RF-16: EL SISTEMA permitirá asociar una etiqueta accesible a Input y Textarea.
- RF-17: DONDE exista texto de ayuda para Input o Textarea, EL SISTEMA lo asociará al control correspondiente.
- RF-18: MIENTRAS Input o Textarea tengan un error, EL SISTEMA identificará el control como inválido.
- RF-19: DONDE exista un mensaje de error para Input o Textarea, EL SISTEMA lo asociará al control correspondiente.
- RF-20: MIENTRAS Input o Textarea estén en modo de solo lectura, EL SISTEMA impedirá la modificación de su valor.
- RF-21: EL SISTEMA permitirá introducir contenido de varias líneas en Textarea.

### Select

- RF-22: EL SISTEMA permitirá seleccionar como máximo una opción en Select.
- RF-23: CUANDO el usuario seleccione una opción habilitada, EL SISTEMA comunicará su valor al consumidor.
- RF-24: EL SISTEMA permitirá representar Select sin una opción seleccionada.
- RF-25: EL SISTEMA permitirá recorrer y seleccionar opciones de Select mediante teclado.
- RF-26: MIENTRAS una opción de Select esté deshabilitada, EL SISTEMA impedirá seleccionarla.
- RF-27: EL SISTEMA permitirá asociar una etiqueta accesible a Select.
- RF-28: MIENTRAS Select tenga un error, EL SISTEMA identificará el control como inválido.
- RF-29: DONDE exista un mensaje de error para Select, EL SISTEMA lo asociará al control.

### Dialog

- RF-30: CUANDO se abra un Dialog, EL SISTEMA trasladará el foco a un elemento dentro del diálogo.
- RF-31: MIENTRAS un Dialog esté abierto, EL SISTEMA mantendrá la navegación mediante Tab y Mayús+Tab dentro del diálogo.
- RF-32: EL SISTEMA habilitará por defecto el control de cierre, Escape y clic fuera de Dialog y permitirá configurar cada mecanismo independientemente.
- RF-33: CUANDO el usuario solicite cerrar un Dialog por un mecanismo habilitado, EL SISTEMA comunicará la solicitud de cierre a su consumidor.
- RF-34: MIENTRAS el cierre de un Dialog esté bloqueado por una operación pendiente, EL SISTEMA impedirá las solicitudes de cierre del usuario.
- RF-35: CUANDO se cierre un Dialog, EL SISTEMA devolverá el foco al elemento que lo abrió si continúa disponible; en caso contrario, lo devolverá al encabezado principal si existe, a la región principal si no hay encabezado o al primer elemento interactivo disponible si tampoco existe una región principal; si ninguno de esos destinos está disponible, al destino alternativo proporcionado por la página que abrió el diálogo.
- RF-36: EL SISTEMA identificará cada Dialog mediante un título accesible.

### DataTable

- RF-37: CUANDO DataTable reciba filas y columnas, EL SISTEMA presentará los valores correspondientes.
- RF-38: MIENTRAS DataTable esté cargando, EL SISTEMA mostrará un estado de carga identificable.
- RF-39: SI la última carga exitosa de DataTable no tiene filas y no hay una actualización en curso ni un error activo, ENTONCES EL SISTEMA mostrará un estado vacío.
- RF-40: SI DataTable presenta un error, ENTONCES EL SISTEMA mostrará un estado de error identificable y conservará las filas disponibles de una respuesta exitosa anterior.
- RF-41: CUANDO el usuario solicite una página disponible, EL SISTEMA comunicará al consumidor la página solicitada.
- RF-42: MIENTRAS DataTable se encuentre en la primera o última página, EL SISTEMA impedirá solicitar una página anterior al inicio o posterior al final, respectivamente.
- RF-43: EL SISTEMA identificará la página actual de DataTable.
- RF-44: CUANDO el usuario cambie la ordenación de una columna habilitada para ello, EL SISTEMA comunicará al consumidor la columna y la dirección solicitadas.
- RF-45: EL SISTEMA identificará la columna y la dirección de ordenación activas.
- RF-46: EL SISTEMA permitirá utilizar los controles de paginación y ordenación mediante teclado.
- RF-47: CUANDO el contenido de DataTable exceda el ancho disponible, EL SISTEMA permitirá acceder a sus columnas sin provocar desbordamiento horizontal de toda la página.

### Badge

- RF-48: EL SISTEMA permitirá presentar una etiqueta textual mediante Badge.
- RF-49: EL SISTEMA conservará una identificación textual del significado de Badge sin depender únicamente del color.

### Toast

- RF-50: CUANDO se solicite una notificación Toast, EL SISTEMA mostrará su mensaje con el tipo indicado: éxito, información, advertencia o error.
- RF-51: CUANDO se muestre un Toast de éxito o información, EL SISTEMA programará su cierre automático tras cinco segundos acumulados, pausando el tiempo mientras el puntero o el foco estén dentro del Toast y reanudándolo con el tiempo restante cuando ambos salgan.
- RF-52: MIENTRAS un Toast de advertencia o error esté visible, EL SISTEMA lo mantendrá hasta su cierre manual.
- RF-53: CUANDO el usuario active el cierre manual de un Toast, EL SISTEMA retirará esa notificación.
- RF-54: CUANDO se muestre un Toast, EL SISTEMA anunciará su mensaje mediante tecnologías de asistencia sin trasladarle el foco.
- RF-55: CUANDO se soliciten varias notificaciones Toast, EL SISTEMA permitirá cerrar cada una de manera independiente.

### Tooltip

- RF-56: CUANDO el usuario coloque el puntero sobre el elemento asociado a un Tooltip, EL SISTEMA mostrará su contenido.
- RF-57: CUANDO el elemento asociado a un Tooltip reciba foco mediante teclado, EL SISTEMA mostrará su contenido.
- RF-58: CUANDO el usuario pulse Escape con un Tooltip visible, EL SISTEMA lo ocultará.
- RF-59: MIENTRAS un Tooltip esté visible por interacción con su elemento asociado, EL SISTEMA permitirá mantenerlo visible al trasladar el puntero sobre su contenido.
- RF-60: EL SISTEMA asociará el contenido de Tooltip como descripción accesible de su elemento de referencia.

### Skeleton

- RF-61: EL SISTEMA permitirá representar con Skeleton el espacio de un contenido que está pendiente de carga.
- RF-62: EL SISTEMA excluirá Skeleton de la navegación por teclado.
- RF-63: EL SISTEMA excluirá las formas decorativas de Skeleton de los anuncios de tecnologías de asistencia.

### Demostración de desarrollo

- RF-64: DONDE la aplicación se ejecute en desarrollo, EL SISTEMA ofrecerá una página de demostración de las once primitivas.
- RF-65: EL SISTEMA permitirá revisar en la demostración los estados aplicables de habilitado, deshabilitado, carga, vacío y error.
- RF-66: EL SISTEMA permitirá probar en la demostración el cierre configurable de Dialog.
- RF-67: EL SISTEMA permitirá probar en la demostración la paginación y ordenación de DataTable.
- RF-68: EL SISTEMA permitirá probar en la demostración los cuatro tipos de Toast.
- RF-69: EL SISTEMA permitirá utilizar la demostración sin backend ni credenciales.
- RF-70: DONDE se genere la distribución de producción, EL SISTEMA impedirá el acceso a la demostración y excluirá del bundle su código, datos de ejemplo y recursos exclusivos.

### Comportamientos aclarados

- RF-71: MIENTRAS Button no esté configurado explícitamente como botón de envío, EL SISTEMA no enviará el formulario al activarlo.
- RF-72: EL SISTEMA admitirá únicamente estos tipos de Input: texto, email, contraseña, búsqueda, teléfono o URL.
- RF-73: EL SISTEMA permitirá ordenar DataTable por una sola columna a la vez.
- RF-74: CUANDO el usuario active una columna ordenable sin ordenación, EL SISTEMA solicitará orden ascendente.
- RF-75: CUANDO el usuario active una columna ordenada ascendente, EL SISTEMA solicitará orden descendente.
- RF-76: CUANDO el usuario active una columna ordenada descendente, EL SISTEMA solicitará quitar la ordenación.
- RF-77: CUANDO el usuario active una columna distinta a la ordenada, EL SISTEMA la ordenará ascendentemente y sustituirá la ordenación anterior.
- RF-78: EL SISTEMA utilizará el tamaño de página definido por su consumidor y no ofrecerá al usuario un control para cambiarlo.
- RF-79: SI el total reduce las páginas disponibles por debajo de la página actual y queda al menos una página disponible, ENTONCES EL SISTEMA comunicará al consumidor la última página disponible para que actualice la página presentada.
- RF-80: SI la última carga exitosa de DataTable no tiene filas, ENTONCES EL SISTEMA indicará 0 de 0 páginas y deshabilitará la navegación.
- RF-81: MIENTRAS DataTable actualice datos y existan filas de una respuesta exitosa anterior, EL SISTEMA conservará esas filas y mostrará el estado de carga.
- RF-82: SI Dialog no contiene elementos enfocables, ENTONCES EL SISTEMA moverá el foco a su título al abrirlo.
- RF-83: MIENTRAS Dialog esté abierto, EL SISTEMA impedirá la interacción con el contenido exterior mediante puntero y teclado y lo excluirá temporalmente de la información disponible para tecnologías de asistencia.
- RF-84: MIENTRAS el cierre de Dialog esté bloqueado, EL SISTEMA permitirá interactuar con el contenido del diálogo.
- RF-85: SI el contenido de Dialog excede la altura disponible de la ventana, ENTONCES EL SISTEMA limitará la altura del diálogo y permitirá desplazarse verticalmente dentro de él.
- RF-86: MIENTRAS el puntero o el foco estén sobre el elemento asociado o el contenido de Tooltip, EL SISTEMA mantendrá visible el Tooltip.
- RF-87: CUANDO ni el puntero ni el foco estén sobre el elemento asociado o el contenido de Tooltip, EL SISTEMA ocultará el Tooltip.
- RF-88: CUANDO un Tooltip visible se oculte por Escape, EL SISTEMA lo mantendrá oculto hasta que el puntero salga del elemento asociado y vuelva a entrar; los cambios de foco por sí solos no lo reabrirán.
- RF-89: SI la opción seleccionada de Select se elimina o se deshabilita, ENTONCES EL SISTEMA limpiará la selección y comunicará al consumidor que no hay valor seleccionado.
- RF-90: CUANDO el usuario seleccione la opción vacía de Select, EL SISTEMA limpiará la selección y comunicará al consumidor que no hay valor seleccionado.
- RF-91: SI Select no tiene opciones disponibles, ENTONCES EL SISTEMA lo mostrará deshabilitado e informará que no hay opciones.
- RF-92: MIENTRAS Skeleton represente contenido pendiente de carga, EL SISTEMA anunciará ese estado a tecnologías de asistencia sin anunciar las formas decorativas individuales.
- RF-93: SI Input no recibe un tipo configurado, ENTONCES EL SISTEMA usará texto.
- RF-94: MIENTRAS el consumidor actualice la página tras reducirse las páginas disponibles y quede al menos una página, EL SISTEMA conservará las filas actualmente visibles.
- RF-95: SI el consumidor configura un tipo de Input que no figura entre los admitidos por RF-72, ENTONCES EL SISTEMA mostrará un error explícito de configuración al consumidor y no renderizará Input.
- RF-96: DONDE una página abra Dialog, EL SISTEMA requerirá que la página mantenga disponible y enfocable un destino de foco alternativo hasta el cierre, para usarlo si los demás destinos no están disponibles.

## Requisitos no funcionales

- Cumplir la constitución vigente y las fronteras públicas del proyecto.
- Los consumidores utilizarán contratos propios de los componentes, sin depender de detalles de la biblioteca de interfaz subyacente.
- Separar la presentación y la interacción de las reglas de negocio.
- Mantener las decisiones de consulta, paginación y ordenación de datos bajo responsabilidad del consumidor.
- No introducir estado de sesión ni caché de negocio en estas primitivas.
- Mantener para las once primitivas una escala visual compartida de tipografía, espaciado, colores, bordes y estados de interacción. Los valores concretos se definirán durante el diseño.
- Mantener una relación de contraste mínima de 4,5:1 para texto normal menor de 24 CSS px y texto en negrita menor de 18,7 CSS px.
- Mantener una relación de contraste mínima de 3:1 para texto normal de al menos 24 CSS px o texto en negrita de al menos 18,7 CSS px.
- Mantener una relación de contraste mínima de 3:1 en indicadores de foco y límites visuales necesarios para identificar controles.
- Permitir el uso de los componentes con un ancho de ventana de 360 píxeles.
- Respetar la preferencia de movimiento reducido en las animaciones no esenciales.
- La demostración utilizará datos ficticios sin información sensible.
- Verificar los contratos públicos y la interacción observable sin depender de detalles internos de la biblioteca de interfaz.

## Casos límite

- Activación de Button durante una operación pendiente.
- Button con icono y sin texto visible.
- Button dentro de un formulario sin configuración explícita de envío.
- Mecanismos de cierre predeterminados y configurables de Dialog.
- Dialog sin elemento de apertura, encabezado principal o región principal disponibles al devolver el foco.
- Dialog se cierra cuando no están disponibles los demás destinos de foco, pero la página mantiene disponible y enfocable el destino alternativo hasta el cierre.
- Input con cada uno de los tipos acordados.
- Input sin tipo configurado.
- Input configurado con un tipo no admitido.
- Icon decorativo e Icon informativo.
- Campos vacíos, deshabilitados, de solo lectura o con error.
- Textarea con contenido de varias líneas.
- Select sin opciones o sin selección.
- Opciones de Select deshabilitadas.
- Select sin opciones disponibles y limpieza mediante opción vacía.
- Dialog con contenido que supera la altura disponible.
- Solicitud de cierre de Dialog durante una operación pendiente.
- Elemento que abrió Dialog eliminado antes de su cierre.
- DataTable sin filas, cargando o con error.
- DataTable con una única página.
- Navegación en la primera o última página.
- Ciclo de ordenación, cambio de columna y ordenación de una sola columna.
- Reducción del total a una o más páginas mientras se muestra una página posterior.
- Reducción del total a cero mientras se muestra una página posterior.
- DataTable sin filas tras una carga exitosa, con indicador 0 de 0 páginas y navegación deshabilitada.
- DataTable sin filas y con carga o error; actualización con filas previas disponibles.
- DataTable conservando filas mientras se actualiza tras reducirse el total de páginas.
- Columnas no ordenables.
- Tabla con más columnas que el ancho disponible.
- Dialog sin controles enfocables, con el elemento que lo abrió eliminado o con cierre bloqueado.
- Dialog con contenido que supera la altura disponible de la ventana.
- Varias notificaciones Toast visibles.
- Cierre manual antes del vencimiento automático de un Toast.
- Toast de éxito o información con hover o foco durante la cuenta regresiva.
- Skeleton durante carga y anuncio a tecnologías de asistencia.
- Select con opción seleccionada eliminada, deshabilitada o limpiada manualmente.
- Tooltip activado mediante foco y descartado con Escape.
- Tooltip después de salir del elemento/contenido o de descartarlo con Escape.
- Tooltip descartado con Escape mientras sigue el foco o el puntero.
- Preferencia de movimiento reducido.
- Intento de acceso a la demostración desde producción.

## Fuera de alcance

- App Shell, sidebar, header y navegación de negocio.
- Pantallas de productos, inventario, compras, ventas o autenticación.
- Reglas de negocio y autorización.
- Acceso al backend desde las primitivas o la demostración.
- Búsqueda, filtrado y selección de filas en DataTable.
- Edición de celdas, agrupación, exportación y virtualización de DataTable.
- Selección múltiple o búsqueda de opciones en Select.
- Input numérico especializado.
- Opciones de Select obtenidas automáticamente desde un servicio.
- Confirmación de cambios sin guardar en Dialog.
- Contenido interactivo dentro de Tooltip.
- Historial persistente de notificaciones.
- Disponibilidad de la demostración en producción.
- Componentes adicionales a las once primitivas acordadas.
- Un catálogo completo de variantes que no tengan una necesidad identificada.

## Criterios de finalización

- Cada RF cuenta con evidencia verificable.
- Las once primitivas pueden revisarse en la demostración de desarrollo.
- Los controles interactivos se recorren y utilizan mediante teclado.
- Dialog conserva y devuelve el foco conforme a sus requisitos.
- Dialog demuestra modalidad, foco inicial y la secuencia de retorno hasta el primer elemento interactivo disponible.
- DataTable demuestra paginación, ordenación y sus estados acordados.
- DataTable demuestra el ciclo de ordenación, una sola columna ordenada, tamaño de página fijo, límites de navegación y ajuste a la última página disponible.
- DataTable demuestra carga inicial, vacío exitoso, error inicial y actualización fallida con filas previas conservadas.
- DataTable indica 0 de 0 páginas y deshabilita la navegación tras una carga exitosa sin filas.
- DataTable conserva las filas mientras se actualiza a otra página disponible; después de una carga exitosa vacía muestra 0 de 0 páginas y deja de presentar las filas anteriores.
- Dialog demuestra sus tres mecanismos de cierre habilitados por defecto, configuración independiente y foco alternativo hasta la región principal.
- Dialog devuelve el foco al destino alternativo proporcionado por la página cuando los demás destinos no están disponibles; el destino permanece disponible y enfocable hasta el cierre.
- Toast demuestra duración y cierre según el tipo.
- Toast demuestra pausa y reanudación del tiempo durante hover y foco.
- Select demuestra selección simple, limpieza manual y limpieza cuando la opción seleccionada deja de estar disponible.
- Select sin opciones queda deshabilitado e informa su estado; la opción vacía limpia la selección.
- Input sin tipo configurado usa texto.
- Input rechaza un tipo que no esté entre los admitidos.
- Skeleton anuncia la carga sin anunciar sus formas decorativas.
- Tooltip demuestra ocultación al salir de la zona de interacción y descarte persistente tras Escape hasta una nueva interacción.
- Tooltip no reaparece tras Escape hasta que el foco o el puntero salgan y vuelvan a entrar.
- Se verifica la presentación a 360 píxeles y en escritorio.
- Se verifica que el build de producción no permite acceder a la demostración ni contiene su código, datos o recursos exclusivos.
- Button dentro de formularios no los envía salvo configuración explícita de envío; Input admite únicamente los tipos definidos.
- Pasan las comprobaciones configuradas de calidad, tipos, pruebas y build.
- La revisión de interfaz acredita contraste, foco y estados aplicables.
- El contraste distingue de manera verificable texto normal, texto normal grande y texto grande en negrita.
- Las primitivas comparten las escalas visuales acordadas.

## Dudas abiertas

- Ninguna decisión de alcance pendiente de la entrevista.
- Las opciones visuales concretas se definirán durante el diseño dentro del alcance aprobado.
