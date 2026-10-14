# Spec 003 — App Shell

## Contexto y objetivo

Inventory necesita una estructura de aplicación que permita incorporar las futuras pantallas de negocio y navegar entre ellas de manera consistente. Esta fase establece el encabezado, la navegación lateral, el área de contenido y la presentación de los estados de sesión. El usuario autenticado accederá a una bienvenida breve, podrá reconocer su identidad y cerrar sesión. La navegación mostrará únicamente destinos implementados. La experiencia cubrirá escritorio, tablet y móvil, con una preferencia persistente de navegación lateral expandida o contraída.

## Usuarios / actores

- Usuario autenticado que accede a Inventory.
- Visitante sin sesión activa.
- Usuario que navega mediante teclado o tecnologías de asistencia.
- Responsable de calidad que verifica navegación, sesión y comportamiento responsive.

## Historias de usuario

- H1: Como usuario autenticado quiero acceder a una estructura de aplicación consistente para orientarme entre las pantallas disponibles.
- H2: Como usuario quiero encontrar únicamente destinos disponibles para evitar acceder a funcionalidades pendientes.
- H3: Como usuario quiero contraer la navegación lateral para disponer de más espacio de trabajo.
- H4: Como usuario quiero conservar mi preferencia de navegación lateral para no configurarla en cada visita.
- H5: Como usuario de móvil quiero abrir y cerrar la navegación para consultar destinos sin perder acceso al contenido.
- H6: Como usuario autenticado quiero reconocer mi identidad para saber qué sesión estoy utilizando.
- H7: Como usuario autenticado quiero cerrar sesión para finalizar mi acceso a la aplicación.
- H8: Como visitante quiero distinguir la ausencia de sesión de un fallo de conexión para comprender el estado de mi acceso.

## Requisitos funcionales — criterios de aceptación en EARS

### Estructura e Inicio

- RF-1: MIENTRAS exista una sesión autenticada confirmada, EL SISTEMA presentará un encabezado, una navegación principal y un área de contenido.
- RF-2: EL SISTEMA identificará la aplicación como Inventory en su estructura de navegación.
- RF-3: CUANDO el usuario autenticado acceda a Inicio, EL SISTEMA mostrará una bienvenida breve.
- RF-4: EL SISTEMA presentará la bienvenida sin métricas ni datos de negocio ficticios.
- RF-5: EL SISTEMA identificará la página actual mediante un encabezado principal.

### Navegación

- RF-6: EL SISTEMA mostrará en la navegación principal únicamente destinos de aplicación implementados.
- RF-7: EL SISTEMA ofrecerá Inicio como destino disponible.
- RF-8: EL SISTEMA excluirá las herramientas de demostración y comprobación de desarrollo de la navegación de trabajo.
- RF-9: CUANDO el usuario active un destino disponible, EL SISTEMA mostrará su página correspondiente.
- RF-10: MIENTRAS un destino corresponda a la página actual, EL SISTEMA lo identificará como activo visualmente y ante tecnologías de asistencia.
- RF-11: CUANDO el usuario recargue una dirección válida de aplicación, EL SISTEMA conservará el destino solicitado.
- RF-12: CUANDO el usuario utilice Atrás o Adelante del navegador, EL SISTEMA mostrará el destino correspondiente al historial.
- RF-13: SI el usuario accede a una dirección de aplicación inexistente con una sesión autenticada confirmada, ENTONCES EL SISTEMA mostrará un estado de página no encontrada.
- RF-14: MIENTRAS se muestre una página no encontrada, EL SISTEMA ofrecerá una acción para volver a Inicio.

### Navegación lateral y preferencia

- RF-15: DONDE la navegación se presente como barra lateral persistente, EL SISTEMA permitirá alternarla entre expandida y contraída.
- RF-16: MIENTRAS la barra lateral esté contraída, EL SISTEMA conservará un nombre accesible para cada destino.
- RF-17: MIENTRAS la barra lateral esté contraída, EL SISTEMA permitirá consultar el nombre visible de cada destino mediante puntero o foco de teclado.
- RF-18: CUANDO el usuario cambie la preferencia de barra lateral expandida o contraída, EL SISTEMA conservará su elección para posteriores recargas y aperturas en el mismo navegador.
- RF-19: SI no existe una preferencia guardada válida, ENTONCES EL SISTEMA presentará la barra lateral expandida cuando corresponda una navegación persistente.
- RF-20: SI no puede conservarse la preferencia, ENTONCES EL SISTEMA permitirá alternar la barra lateral durante la visita actual.

### Navegación compacta

- RF-21: DONDE la navegación se presente en modalidad compacta, EL SISTEMA mantendrá el panel de navegación cerrado al acceder a una página.
- RF-22: CUANDO el usuario active el control de apertura de navegación compacta, EL SISTEMA mostrará el panel de destinos.
- RF-23: CUANDO se abra el panel de navegación compacta, EL SISTEMA trasladará el foco a su interior.
- RF-24: MIENTRAS el panel de navegación compacta esté abierto, EL SISTEMA mantendrá la navegación mediante Tab y Mayús+Tab dentro del panel.
- RF-25: MIENTRAS el panel de navegación compacta esté abierto, EL SISTEMA impedirá la interacción con el contenido situado detrás.
- RF-26: CUANDO el usuario active el cierre, pulse Escape o active el fondo exterior del panel, EL SISTEMA cerrará la navegación compacta.
- RF-27: CUANDO el usuario cierre la navegación compacta mediante el control de cierre, Escape o el fondo exterior sin cambiar de página, EL SISTEMA devolverá el foco al control de apertura.
- RF-28: CUANDO el usuario seleccione un destino en la navegación compacta, EL SISTEMA cerrará el panel.
- RF-29: CUANDO una navegación solicitada por el usuario muestre otra página, EL SISTEMA trasladará el foco al encabezado principal de esa página.
- RF-30: CUANDO el usuario abra o cierre la navegación compacta, EL SISTEMA conservará la preferencia de barra lateral expandida o contraída.

### Sesión e identidad

- RF-31: MIENTRAS una comprobación inicial o posterior de sesión esté pendiente, EL SISTEMA mostrará un estado de comprobación de sesión identificable.
- RF-32: MIENTRAS la sesión no esté confirmada, EL SISTEMA impedirá mostrar el contenido reservado al usuario autenticado.
- RF-33: MIENTRAS exista una sesión autenticada confirmada, EL SISTEMA mostrará en el encabezado el nombre público del usuario o, si falta, su correo público disponible.
- RF-34: SI la sesión confirmada no proporciona nombre ni correo público, ENTONCES EL SISTEMA mostrará la identificación genérica «Usuario».
- RF-35: CUANDO se confirme la ausencia de sesión, EL SISTEMA mostrará una pantalla informativa de sesión no iniciada con prioridad sobre el estado de página no encontrada.
- RF-36: MIENTRAS se muestre la pantalla de sesión no iniciada, EL SISTEMA presentará el contenido en un layout separado de la navegación de trabajo.
- RF-37: MIENTRAS se muestre la pantalla de sesión no iniciada, EL SISTEMA excluirá formularios de acceso y acciones que conduzcan a un login todavía no implementado.
- RF-38: SI una comprobación inicial o posterior de sesión falla por conexión, servidor o respuesta inválida, ENTONCES EL SISTEMA sustituirá la presentación autenticada, si existe, por un estado de error distinguible de la ausencia de sesión.
- RF-39: MIENTRAS exista un error de comprobación de sesión, EL SISTEMA ofrecerá una acción para reintentar la consulta.
- RF-40: CUANDO una nueva comprobación confirme que la sesión dejó de estar activa, EL SISTEMA retirará la presentación autenticada.

### Cierre de sesión

- RF-41: MIENTRAS exista una sesión autenticada confirmada, EL SISTEMA ofrecerá la acción «Cerrar sesión» desde el encabezado.
- RF-42: CUANDO el usuario active «Cerrar sesión», EL SISTEMA solicitará el cierre de la sesión actual.
- RF-43: MIENTRAS la solicitud de cierre esté pendiente, EL SISTEMA mostrará un indicador de operación en curso.
- RF-44: MIENTRAS la solicitud de cierre esté pendiente, EL SISTEMA impedirá nuevas activaciones de esa acción.
- RF-45: CUANDO se confirme el cierre de sesión, EL SISTEMA mostrará la pantalla informativa de sesión no iniciada.
- RF-46: SI el cierre falla sin confirmación del servidor mientras la sesión siga confirmada como autenticada, ENTONCES EL SISTEMA conservará la presentación de sesión anterior.
- RF-47: SI el cierre de sesión falla, ENTONCES EL SISTEMA mostrará un mensaje de error accesible.
- RF-48: MIENTRAS exista un fallo de cierre de sesión y la sesión siga confirmada como autenticada, EL SISTEMA permitirá reintentar la acción.
- RF-49: CUANDO el usuario utilice el historial del navegador después de un cierre confirmado, EL SISTEMA impedirá recuperar la presentación autenticada mediante la sesión cerrada.

### Accesibilidad transversal

- RF-50: EL SISTEMA ofrecerá un enlace para saltar al contenido principal mediante teclado.
- RF-51: EL SISTEMA permitirá operar los controles de navegación y sesión mediante teclado.
- RF-52: EL SISTEMA mostrará un indicador visible del foco en los controles interactivos.
- RF-53: EL SISTEMA identificará el estado expandido o contraído de los controles que abran paneles.
- RF-54: EL SISTEMA anunciará los estados de comprobación de sesión y sus errores sin depender únicamente de indicadores visuales.

### Comportamientos aclarados tras la revisión

- RF-55: CUANDO una comprobación posterior confirme una sesión autenticada válida, EL SISTEMA volverá a mostrar la presentación autenticada.
- RF-56: DONDE el ancho disponible sea de 360 píxeles, EL SISTEMA presentará la navegación en modalidad compacta.
- RF-57: DONDE el ancho disponible sea de 1280 píxeles, EL SISTEMA presentará una barra lateral persistente según la preferencia válida guardada o el estado predeterminado.
- RF-58: CUANDO el usuario seleccione el destino ya activo desde la navegación compacta, EL SISTEMA devolverá el foco al control de apertura después del cierre del panel.
- RF-59: CUANDO el usuario seleccione el destino ya activo desde la navegación compacta, EL SISTEMA conservará la página actual sin recargarla.
- RF-60: CUANDO la navegación cambie de modalidad compacta a persistente, EL SISTEMA retirará el panel compacto.
- RF-61: CUANDO la navegación cambie de modalidad compacta a persistente, EL SISTEMA eliminará el bloqueo de interacción causado por el panel compacto.
- RF-62: CUANDO la navegación cambie de modalidad compacta a persistente con el panel abierto, EL SISTEMA trasladará el foco al destino activo de la barra lateral o, si no existe, al encabezado principal de la página mostrada.
- RF-63: CUANDO un estado de comprobación de sesión, error de sesión o ausencia de sesión sustituya la presentación autenticada, EL SISTEMA cerrará el panel de navegación compacta si está abierto.
- RF-64: CUANDO un estado de comprobación de sesión, error de sesión o ausencia de sesión sustituya la presentación autenticada, EL SISTEMA eliminará el bloqueo de interacción causado por el panel compacto.
- RF-65: CUANDO un estado de comprobación de sesión, error de sesión o ausencia de sesión sustituya la presentación autenticada, EL SISTEMA trasladará el foco al encabezado principal del estado mostrado.

## Requisitos no funcionales

- **NFR-1 — Responsive:** las vistas serán utilizables a anchos de 360, 768 y 1280 píxeles sin desbordamiento horizontal de la página.
- **NFR-2 — Accesibilidad:** los elementos incluidos cumplirán los criterios aplicables de WCAG 2.2 nivel AA.
- **NFR-3 — Ampliación:** la navegación y las acciones de sesión seguirán disponibles con zoom del navegador al 200 %.
- **NFR-4 — Movimiento reducido:** la interfaz respetará la preferencia de movimiento reducido sin perder funcionalidad.
- **NFR-5 — Idioma:** las etiquetas, mensajes y estados dirigidos al usuario estarán en español.
- **NFR-6 — Consistencia visual:** las vistas utilizarán los patrones visuales y tokens compartidos del Design System existente.
- **NFR-7 — Privacidad:** la persistencia de la preferencia de navegación no contendrá información personal ni datos de sesión.
- **NFR-8 — Información sensible:** la interfaz y sus mensajes de error no mostrarán contraseñas, tokens, cookies ni detalles internos del servidor.
- **NFR-9 — Autoridad de sesión:** la presentación autenticada dependerá de una sesión confirmada por la integración existente.
- **NFR-10 — Verificabilidad:** los estados de sesión y sus fallos podrán verificarse sin credenciales privadas mediante escenarios simulados.

## Casos límite

- La consulta inicial de sesión permanece pendiente.
- La sesión no existe o ha expirado.
- La consulta falla por conexión o servidor.
- La respuesta de sesión es inválida.
- El usuario carece de nombre o correo público.
- El nombre o correo es demasiado largo para el espacio disponible.
- El cierre de sesión falla sin confirmación.
- El usuario activa repetidamente el cierre durante una solicitud pendiente.
- El usuario vuelve mediante el historial después de cerrar sesión.
- La preferencia guardada es inválida o no puede persistirse.
- El usuario cambia el ancho de la ventana con la navegación compacta abierta.
- El usuario utiliza zoom del navegador al 200 %.
- El usuario accede directamente a una dirección inexistente.
- Inicio es el único destino de trabajo disponible.
- Una comprobación posterior de sesión queda pendiente después de mostrar la aplicación autenticada.
- Una comprobación posterior de sesión falla después de mostrar la aplicación autenticada.
- Un visitante sin sesión accede a una dirección inexistente.
- El cierre de sesión falla mientras otra comprobación confirma ausencia de sesión.
- El usuario selecciona el destino ya activo desde la navegación compacta.
- Un estado de comprobación, error o ausencia de sesión sustituye la vista autenticada con el panel compacto abierto.

En cambios entre modalidades responsive, la navegación no dejará bloqueado el contenido ni mantendrá el foco en un panel que ya no esté visible. Los textos largos no ocultarán las acciones de navegación o sesión y conservarán una identificación accesible completa.

## Fuera de alcance

- Pantallas y operaciones de Productos, Categorías, Inventario, Compras, Ventas y demás módulos de negocio.
- Destinos futuros deshabilitados o pantallas de «Próximamente».
- Dashboard con métricas, gráficos o datos ficticios.
- Formulario de login, registro, recuperación de contraseña, verificación de correo y MFA.
- Edición del perfil del usuario.
- Gestión de roles y permisos.
- Selector de organización y gestión multi-tenant.
- Preferencias adicionales como cambio de tema.
- Sincronización de la preferencia de sidebar entre navegadores o dispositivos.
- Cambios en el contrato público del backend de autenticación.

## Criterios de finalización

- Todos los requisitos funcionales cuentan con evidencia verificable de cumplimiento.
- Las comprobaciones de calidad, tipos, pruebas y compilación aplicables finalizan sin errores.
- Se verifica el flujo de sesión confirmada → bienvenida → cierre de sesión → pantalla informativa.
- Se verifican sesión pendiente, ausencia de sesión, errores de consulta y reintento.
- Se verifica el fallo de cierre de sesión con conservación del estado anterior y reintento.
- Se verifica la persistencia de la preferencia de sidebar tras recargar y volver a abrir la aplicación.
- Se revisan navegación, foco, zoom y estados en escritorio, tablet y móvil.
- Se realiza una revisión con lector de pantalla de navegación, identidad y estados de sesión.
- Se revisa la experiencia con Impeccable antes de considerar finalizadas las vistas.
- Se conserva evidencia de las verificaciones y de los bloqueos que impidan el cierre.
- Se verifica la sustitución de la presentación autenticada durante comprobaciones posteriores de sesión y sus errores.
- Se verifica la recuperación de la presentación autenticada tras una comprobación posterior exitosa.
- Se verifica la prioridad del estado de sesión ante una dirección inexistente.
- Se verifica que una ausencia de sesión confirmada prevalece sobre un fallo de logout.
- Se verifica navegación compacta a 360 píxeles y barra lateral persistente a 1280 píxeles.
- Se verifica el cierre sin recarga y el retorno del foco al seleccionar el destino activo.
- Se verifican los destinos del foco y la retirada del bloqueo del panel durante cambios de modalidad y estado de sesión.

## Dudas abiertas

- No quedan dudas de comportamiento pendientes tras la entrevista y la revisión.
- La composición visual, la modalidad a 768 píxeles y el punto de transición se definirán durante el diseño, respetando la navegación compacta a 360 píxeles y la barra lateral persistente a 1280 píxeles.
