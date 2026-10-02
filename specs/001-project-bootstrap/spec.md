# Spec 001 — Project Bootstrap

## Contexto y objetivo

El frontend Inventory necesita una base ejecutable y verificable antes de desarrollar el Design System y las funcionalidades de negocio. Esta fase habilita el desarrollo local, la configuración de aplicación, la comunicación con el backend, la infraestructura de autenticación y los controles de calidad. Debe permitir comprobar la integración con el backend local sin construir pantallas de negocio ni una experiencia completa de login.

## Usuarios / actores

- Desarrollador que instala, ejecuta y verifica el frontend.
- Desarrollador que incorpora funcionalidades en fases posteriores.
- Responsable de integración que comprueba comunicación y autenticación con el backend local.
- Proceso automatizado que ejecuta verificaciones del proyecto.

## Historias de usuario

- H1: Como desarrollador quiero instalar el proyecto desde un entorno limpio para obtener las dependencias acordadas.
- H2: Como desarrollador quiero ejecutar el frontend localmente para comenzar a desarrollar funcionalidades.
- H3: Como desarrollador quiero detectar configuración inválida antes de utilizar la aplicación para identificar errores de entorno.
- H4: Como responsable de integración quiero comprobar la comunicación con el backend para validar la base de acceso a datos.
- H5: Como responsable de integración quiero verificar el ciclo de autenticación sin una pantalla de login para confirmar la infraestructura de sesión.
- H6: Como desarrollador quiero ejecutar controles automatizados para detectar errores antes de incorporar cambios.
- H7: Como desarrollador quiero disponer de instrucciones verificadas para reproducir la ejecución y validación del proyecto.

## Requisitos funcionales — criterios de aceptación en EARS

### Instalación y ejecución

- RF-1: CUANDO el desarrollador instale las dependencias con la configuración de versiones acordada, EL SISTEMA completará la instalación sin conflictos de dependencias pendientes de resolver.
- RF-2: CUANDO el desarrollador inicie el entorno de desarrollo, EL SISTEMA servirá el frontend en `http://localhost:5174`.
- RF-3: SI el puerto `5174` está ocupado, ENTONCES EL SISTEMA rechazará el inicio con un mensaje que identifique el conflicto.
- RF-4: CUANDO el navegador abra la dirección local del frontend con configuración válida, EL SISTEMA mostrará una vista mínima que identifique Inventory.
- RF-5: CUANDO el desarrollador genere la distribución de producción con configuración válida, EL SISTEMA completará la generación sin errores.
- RF-6: CUANDO el desarrollador ejecute la previsualización de una distribución generada, EL SISTEMA permitirá abrir la vista mínima en el navegador.

### Configuración

- RF-7: SI falta un valor de configuración obligatorio sin valor predeterminado documentado, ENTONCES EL SISTEMA impedirá la inicialización de la aplicación.
- RF-8: SI un valor de configuración no cumple el formato admitido, ENTONCES EL SISTEMA identificará el nombre del valor inválido sin reproducir información sensible.
- RF-9: CUANDO el desarrollador prepare un entorno local, EL SISTEMA dispondrá de instrucciones sobre los valores de configuración necesarios.

### Comunicación con el backend

- RF-10: CUANDO el frontend solicite una operación de autenticación en desarrollo local, EL SISTEMA enviará la petición al backend configurado conservando la ruta pública de autenticación.
- RF-11: CUANDO el frontend solicite una operación de negocio en desarrollo local, EL SISTEMA enviará la petición al backend configurado sin interferir con la navegación de páginas.
- RF-12: CUANDO el backend responda correctamente a una petición de comprobación no destructiva, EL SISTEMA permitirá consumir su resultado desde el frontend.
- RF-13: SI el backend no está disponible, ENTONCES EL SISTEMA comunicará el fallo de conexión al consumidor de la petición.
- RF-14: CUANDO el backend devuelva un error con código público, EL SISTEMA conservará ese código en el error entregado al consumidor.
- RF-15: CUANDO el backend devuelva errores asociados a campos, EL SISTEMA conservará esa información para su consumo posterior.

### Infraestructura de autenticación

- RF-16: CUANDO la integración envíe credenciales válidas al backend local, EL SISTEMA permitirá establecer una sesión mediante la cookie emitida por el backend.
- RF-17: CUANDO la integración consulte una sesión válida, EL SISTEMA expondrá el usuario público recibido del backend.
- RF-18: CUANDO la integración consulte una sesión válida, EL SISTEMA expondrá los metadatos públicos de sesión recibidos del backend.
- RF-19: MIENTRAS la consulta inicial de sesión esté pendiente, EL SISTEMA expondrá un estado pendiente de resolución.
- RF-20: SI la consulta de sesión responde `401`, ENTONCES EL SISTEMA expondrá un estado no autenticado.
- RF-21: SI una operación de autenticación falla por conexión o error del servidor, ENTONCES EL SISTEMA expondrá un error distinguible de la ausencia de sesión.
- RF-22: CUANDO el backend confirme el cierre de sesión con `204`, EL SISTEMA actualizará el estado de la integración a no autenticado.
- RF-23: CUANDO la integración consulte la sesión después de cerrarla, EL SISTEMA no expondrá al usuario como autenticado mediante la sesión cerrada.
- RF-24: EL SISTEMA consumirá el contrato público actual de autenticación sin exigir cambios en sus respuestas.
- RF-25: EL SISTEMA expondrá únicamente información de usuario y sesión derivada de las respuestas disponibles, sin inventar campos ausentes.

### Verificaciones y documentación

- RF-26: CUANDO el desarrollador ejecute la comprobación de tipos, EL SISTEMA devolverá un resultado fallido si encuentra errores de tipos.
- RF-27: CUANDO el desarrollador ejecute el análisis de calidad, EL SISTEMA devolverá un resultado fallido ante imports que vulneren las fronteras de UI o autenticación.
- RF-28: CUANDO el desarrollador ejecute la comprobación de formato, EL SISTEMA informará los archivos que incumplen el formato acordado sin modificarlos.
- RF-29: CUANDO el desarrollador ejecute el formateo de escritura, EL SISTEMA aplicará el formato acordado a los archivos incluidos en su alcance.
- RF-30: CUANDO el desarrollador ejecute las pruebas en modo de una ejecución, EL SISTEMA finalizará con un resultado fallido si alguna prueba falla.
- RF-31: CUANDO el desarrollador ejecute las pruebas en modo interactivo, EL SISTEMA permitirá repetirlas durante el desarrollo.
- RF-32: EL SISTEMA permitirá verificar errores de integración mediante respuestas simuladas sin depender de la disponibilidad del backend real.
- RF-33: EL SISTEMA documentará los comandos operativos comprobados desde la raíz del proyecto.
- RF-34: EL SISTEMA documentará los prerrequisitos de las comprobaciones que requieran el backend real.

### Comportamientos aclarados

- RF-35: SI la configuración es inválida, ENTONCES EL SISTEMA rechazará el inicio del entorno de desarrollo.
- RF-36: SI la configuración es inválida, ENTONCES EL SISTEMA rechazará la generación de la distribución.
- RF-37: SI un valor de configuración no cumple el formato admitido, ENTONCES EL SISTEMA impedirá la inicialización de la aplicación.
- RF-38: EL SISTEMA admitirá el inicio de sesión únicamente desde un estado no autenticado confirmado.
- RF-39: CUANDO el backend rechace las credenciales de login, EL SISTEMA expondrá un error de credenciales distinguible de un fallo de conexión o servidor.
- RF-40: CUANDO el backend rechace las credenciales de login, EL SISTEMA mantendrá el estado no autenticado.
- RF-41: SI una petición de logout falla sin confirmación del cierre, ENTONCES EL SISTEMA conservará el estado de sesión anterior.
- RF-42: CUANDO una petición de logout falle sin confirmación del cierre, EL SISTEMA permitirá reintentar la operación.
- RF-43: SI una respuesta exitosa de consulta de sesión carece de información obligatoria según el contrato público vigente, ENTONCES EL SISTEMA expondrá un error de contrato distinguible de la ausencia de sesión.
- RF-44: SI una respuesta de consulta de sesión es incompleta, ENTONCES EL SISTEMA rechazará sus datos como evidencia de autenticación.
- RF-45: SI una respuesta HTTP de error carece de un contrato reconocido, ENTONCES EL SISTEMA expondrá un error HTTP genérico con el estado recibido.
- RF-46: EL SISTEMA distinguirá los errores con respuesta HTTP de los fallos de conexión sin respuesta HTTP.
- RF-47: SI una respuesta exitosa de consulta de sesión es incompleta, ENTONCES EL SISTEMA expondrá un estado de sesión no confirmada, independientemente del estado anterior.
- RF-48: MIENTRAS la sesión esté no confirmada, EL SISTEMA no afirmará que el usuario está autenticado ni que existe una ausencia de sesión confirmada.
- RF-49: CUANDO la sesión quede no confirmada por una respuesta incompleta, EL SISTEMA permitirá repetir la consulta para confirmar su estado.

## Requisitos no funcionales

- Cumplir la constitución vigente y las fronteras descritas en la documentación de arquitectura.
- Mantener separado el estado de negocio, sesión, UI, formularios y navegación.
- No duplicar datos del servidor ni sesión en el estado global de UI.
- No registrar contraseñas, cookies, tokens de sesión ni secretos.
- No incorporar secretos en la configuración pública distribuida al navegador.
- Mantener intactos los contratos públicos actuales del backend.
- Seleccionar versiones estables compatibles durante la planificación.
- Registrar las versiones necesarias para reproducir el entorno.
- Mantener las comprobaciones simuladas independientes del backend real.
- Utilizar una cuenta exclusiva de pruebas preparada previamente para comprobar autenticación real.
- Proporcionar las credenciales de prueba mediante configuración privada del entorno de verificación, sin incorporarlas a la documentación ni a los registros.
- No mostrar cuerpos de error HTTP sin validar como mensajes de la aplicación.
- No modificar datos de negocio existentes durante las comprobaciones del bootstrap.
- La vista mínima tendrá texto legible y estructura semántica; no requiere un diseño completo de aplicación.

## Casos límite

- Puerto `5174` ocupado.
- Instalación con una versión de entorno no admitida.
- Configuración obligatoria ausente.
- Dirección de servicio con formato inválido.
- Backend local apagado.
- Puerto efectivo del backend distinto del configurado.
- Petición de API que coincide con una ruta de navegación.
- Respuesta HTTP sin cuerpo.
- Error sin el código público esperado.
- Credenciales incorrectas.
- Consulta de sesión sin cookie.
- Cookie inválida o sesión cerrada.
- Consulta de sesión pendiente.
- Error de red durante la consulta de sesión.
- Error del servidor durante autenticación.
- Respuesta de sesión con información pública incompleta.
- Intento de login con una sesión activa.
- Intento de login mientras el estado de sesión está pendiente o no confirmado.
- Credenciales rechazadas cuando no existe sesión activa.
- Error de conexión o servidor durante logout.
- Logout procesado por el servidor cuya respuesta no llega al cliente.
- Reintento de logout después de un fallo.
- Respuesta exitosa de sesión incompleta sin una sesión previa confirmada.
- Respuesta exitosa de sesión incompleta durante una consulta posterior.
- Error HTTP vacío o con contenido no reconocido.
- Cuenta exclusiva de pruebas no disponible.
- Logout exitoso con `204`.
- Consulta de sesión posterior al logout.
- Origen del frontend rechazado por el backend.
- Cookie no enviada o no recibida mediante la conexión local.
- Intento de importación fuera de las fronteras permitidas.
- Error de tipos, formato o pruebas.
- Entorno sin los prerrequisitos necesarios para las comprobaciones reales.

## Fuera de alcance

- Primitivas completas del Design System correspondientes a la Fase 1.
- App Shell, sidebar, header y navegación de negocio correspondientes a la Fase 2.
- Pantallas y operaciones de productos, categorías, inventario, compras, ventas y demás features.
- Pantalla de login y experiencia completa de autenticación correspondientes a la Fase 7.
- Pantallas de registro, recuperación de contraseña, verificación de email o MFA.
- Cambio de cuenta mediante login mientras exista una sesión activa.
- Creación automática de cuentas para las comprobaciones del bootstrap.
- Guards de rutas funcionales: no hay rutas privadas de negocio que proteger en esta fase.
- Autorización por permisos o roles.
- Multi-tenancy y gestión de organizaciones.
- Workflows E2E de negocio.
- Automatización completa de generación de contratos de negocio.
- Optimizaciones de rendimiento sin mediciones.
- Pipeline de despliegue y topología de producción.
- Modificación del código, contratos o datos de negocio del backend.

El ajuste del origen permitido en el backend, si resulta necesario, se gestiona mediante un cambio separado de su spec. Es una dependencia para completar la comprobación real de autenticación.

## Criterios de finalización

- Los RF cuentan con evidencia de pruebas, ejecución de comandos o comprobación manual según corresponda.
- La instalación resulta reproducible con las versiones fijadas.
- El frontend arranca en `5174`.
- Un puerto ocupado provoca un fallo explícito.
- La vista mínima puede abrirse en desarrollo y en la previsualización de la distribución.
- La configuración inválida impide iniciar desarrollo, generar la distribución e inicializar la aplicación.
- La conexión local permite comprobar una operación no destructiva del backend.
- El navegador completa el ciclo de autenticación real: login, consulta de sesión, logout y comprobación posterior.
- Las pruebas simuladas verifican ausencia de sesión, credenciales rechazadas, logout fallido, sesión incompleta y errores de conexión y servidor.
- Las pruebas verifican que un login rechazado desde el estado no autenticado conserva dicho estado.
- Las pruebas verifican que un logout sin confirmación conserva el estado previo.
- Las pruebas verifican que una respuesta de sesión incompleta no se acepta como evidencia de autenticación.
- Las pruebas verifican que una respuesta de sesión incompleta deja la sesión no confirmada tanto en la consulta inicial como después de una sesión válida.
- Las pruebas verifican que una consulta posterior válida permite salir del estado no confirmado.
- Las pruebas verifican que una consulta posterior con `401` confirma el estado no autenticado.
- Las pruebas distinguen errores HTTP genéricos de fallos de conexión sin respuesta.
- La comprobación real utiliza una cuenta exclusiva de pruebas preparada previamente.
- Los controles de imports detectan vulneraciones de las fronteras de UI y Auth.
- Pasan análisis de calidad, comprobación de formato, typecheck, pruebas de una ejecución y build.
- Las instrucciones reflejan los comandos efectivamente comprobados.
- Las dependencias del backend están satisfechas antes de declarar completada la integración real.

## Dudas abiertas

- Las aclaraciones funcionales de la revisión quedan resueltas. Las versiones exactas, el mapeo del proxy y el mecanismo de adaptación del contrato se definirán en el plan.
- Dependencia pendiente de verificación: configuración efectiva del backend local y aceptación del origen `http://localhost:5174`.
- Prerrequisito de comprobación real: disponibilidad de una cuenta exclusiva de pruebas preparada previamente.
