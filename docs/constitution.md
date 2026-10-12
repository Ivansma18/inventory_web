# Constitución del proyecto

Principios no negociables del frontend Inventory. Toda spec, plan, tarea y
cambio debe cumplirlos. La referencia de alcance, stack y secuencia de
desarrollo es `docs/ruta.md`.

## Principios

1. **Stack oficial y evolución por necesidades reales**

   Utilizar React, TypeScript en modo strict, Vite y React Router;
   Better Auth React Client para autenticación; Axios y TanStack Query
   para datos; Zustand para estado de cliente; React Hook Form y Zod
   para formularios; PrimeReact, PrimeIcons y TailwindCSS para UI.

   Utilizar Vitest, React Testing Library, MSW y Playwright para pruebas,
   y ESLint, Prettier, Husky y lint-staged para calidad.

   Cada cambio debe corresponder a la fase y al alcance solicitado.
   Crear abstracciones cuando exista una necesidad real, extraer
   componentes a shared cuando se demuestre reutilización y optimizar
   rendimiento según mediciones.

   **Verificación:** contrastar dependencias, configuración y alcance con
   la ruta; comprobar strict en TypeScript y justificar abstracciones,
   extracciones y optimizaciones introducidas.

2. **Arquitectura por features y fronteras públicas**

   Organizar `src/app` para router, providers, layouts y configuración;
   `src/features` por capacidades funcionales y vertical slices;
   `src/shared/ui` para primitivas y `src/shared/components` para
   composiciones genéricas.

   Mantener componentes de negocio dentro de su feature. Cada feature
   expone su API pública mediante `index.ts`; otros módulos no deben
   consumir sus internos. Crear carpetas según las necesidades de la
   feature, sin reproducir toda la estructura anticipadamente.

   **Verificación:** revisar ubicación de archivos y dependencias entre
   módulos; comprobar que los imports entre features usen APIs públicas.

3. **Design System independiente de PrimeReact y PrimeIcons**

   Importar PrimeReact y PrimeIcons únicamente dentro de `src/shared/ui`.
   Los consumidores utilizan componentes propios y `Icon`, nunca clases
   `pi` fuera del Design System.

   Los wrappers deben tener APIs propias, sin exportar ni heredar tipos
   de PrimeReact y sin reproducir todas sus opciones. Si falta un
   comportamiento genérico, extender `shared/ui`; si pertenece al
   negocio, componer primitivas dentro de la feature.

   Cada primitiva visual mantiene sus estilos en un archivo CSS
   co-localizado (`<componente>.css`) e importado por su propio módulo.
   `shared/ui/styles.css` conserva únicamente imports globales, tokens y
   reglas base o transversales; no contiene selectores específicos de una
   primitiva.

   **Verificación:** automatizar restricciones de imports con ESLint,
   revisar los tipos públicos y probar los contratos de los wrappers.
   Comprobar que cada primitiva visual importa su hoja co-localizada y que
   los estilos globales no contienen selectores propios de componentes.
   Sustituir la librería UI debe tener un impacto localizado en el Design
   System.

4. **Autenticación encapsulada y autorización separada**

   Better Auth es un detalle de implementación de `src/features/auth`.
   Su cliente se centraliza en `features/auth/api/auth-client.ts`,
   preparado durante el bootstrap.

   Solo Auth utiliza Better Auth directamente. El resto de la aplicación
   consume la API pública de Auth, como `useAuth` y `useSession`, sin
   importar el cliente interno.

   Better Auth es la fuente de verdad de sesión, usuario autenticado y
   estado de autenticación. Mantener la autorización en su propio dominio;
   ocultar acciones o bloquear rutas en el frontend no sustituye la
   autorización del backend.

   **Verificación:** aplicar restricciones de imports con ESLint y probar
   login, logout, errores, sesión pendiente, estados autenticado y no
   autenticado y rutas protegidas. La integración debe poder mockearse
   detrás de la abstracción de Auth.

5. **Ownership del estado y acceso a datos separado de la UI**

   Asignar cada estado a su responsable:
   - Datos del servidor y caché de negocio: TanStack Query.
   - Sesión y autenticación: Better Auth mediante Auth.
   - Estado global de cliente/UI: Zustand.
   - Valores y estado de formularios: React Hook Form.
   - Estado navegable, incluidos filtros: React Router y URL.

   No copiar server state ni session state a Zustand.

   Mantener el flujo de datos de negocio:
   componente → hook de feature → query/mutation → API de feature →
   cliente HTTP → backend. Los componentes no utilizan Axios directamente.

   Centralizar transporte y normalización de errores en el cliente HTTP,
   sin reglas de negocio. Centralizar variables de entorno en
   `shared/config/env.ts` y validarlas con Zod.

   Cuando se implemente multi-tenancy, incluir el contexto de organización
   en las query keys y evitar que datos de un tenant aparezcan en otro.

   **Verificación:** revisar hooks, APIs, stores, query keys, acceso a
   variables de entorno e imports; probar invalidación de datos afectados
   y aislamiento de caché durante el cambio de organización.

6. **Contratos y operaciones bajo autoridad del backend**

   Derivar los contratos HTTP de OpenAPI cuando esté disponible y mantener
   los contratos generados en `shared/api/generated`. Evitar definiciones
   manuales idénticas. Los cambios de contrato deben reflejarse en los
   contratos TypeScript, consumidores y pruebas afectados.

   Utilizar códigos de error normalizados, sin deducir reglas a partir
   de mensajes del backend. React Hook Form y Zod validan en el cliente,
   pero el backend sigue siendo autoritativo para negocio y permisos.

   Las operaciones críticas esperan confirmación del servidor.
   Completar una venta no utiliza optimistic update. El stock se modifica
   mediante entradas, salidas y ajustes; una venta completada no se edita
   silenciosamente, sino que se cancela mediante una operación explícita.

   Ante conflictos de stock, mostrar el error y refrescar la información.

   No incluir secretos en variables `VITE_*` ni registrar contraseñas,
   tokens de sesión, cookies o secretos. La sesión se gestiona según el
   modelo configurado de Better Auth.

   **Verificación:** contrastar contratos con OpenAPI y ejecutar typecheck
   y pruebas de integración aplicables; comprobar errores de negocio,
   concurrencia y permisos, confirmación del servidor y ausencia de
   información sensible en configuración y registros.

7. **UX completa, consistencia visual y accesibilidad**

   Utilizar la skill `impeccable` al crear o mejorar vistas significativas.
   Definir objetivo del usuario, información necesaria y flujo antes de
   implementar.

   Construir con el Design System y tokens compartidos. Cubrir estados
   aplicables de loading, error, empty, success e interacción, junto con
   confirmaciones y feedback de operaciones.

   Resolver accesibilidad transversal en el Design System: teclado, foco,
   labels, ARIA, descripción de errores, contraste, estados deshabilitados
   y focus trapping de dialogs.

   **Verificación:** recorrer workflows completos, incluidos errores y
   permisos; revisar desktop, tablet y mobile y comprobar navegación por
   teclado y comportamiento del foco.

8. **Pruebas y verificaciones como evidencia de cumplimiento**

   Probar los contratos de los wrappers cuando cambie su comportamiento.
   Las pruebas de features interactúan con la UI propia, sin depender de
   detalles internos de PrimeReact.

   Utilizar Vitest y React Testing Library para pruebas aplicables, MSW
   para simular APIs y Playwright para E2E. Cubrir los flujos de
   autenticación, inventario, compras, ventas, autorización y multi-tenancy
   conforme se implementen.

   Ejecutar lint, typecheck, pruebas y build configurados que correspondan
   al cambio. El pipeline de producción debe incluir pruebas unitarias,
   de integración y E2E antes de desplegar.

   **Verificación:** informar comandos ejecutados, resultados y bloqueos;
   declarar cualquier verificación todavía no configurada y mantener
   actualizados los comandos reales en `AGENTS.md`.

## Decisiones acordadas para el bootstrap

- Usar pnpm como gestor de paquetes.
- Seleccionar versiones estables compatibles, con Node.js LTS,
  y fijar las versiones exactas en el plan del bootstrap.
- Configurar los scripts `dev`, `lint`, `format`, `format:check`,
  `typecheck`, `test`, `test:run`, `build` y `preview`.
  `test` será interactivo y `test:run` ejecutará la suite una vez.
  Añadir `test:e2e` cuando se configure Playwright.
- Documentar los comandos como operativos en `AGENTS.md` únicamente
  después de implementarlos y verificarlos.
- Usar `http://localhost:5174` para el frontend con puerto estricto
  y `http://localhost:3000` como dirección objetivo del backend local.
- Conectar ambos mediante el proxy de desarrollo de Vite, conservando
  `/api/auth` y definiendo un mapeo para las rutas de negocio que no
  interfiera con las rutas del frontend.
- Mantener el contrato público actual del backend de autenticación.
  Adaptar su integración con Better Auth React Client exclusivamente
  dentro de `features/auth`, sin duplicar sesión en Zustand ni inventar
  campos ausentes en las respuestas.
- Mantener email y contraseña como método inicial de autenticación.
  La disponibilidad de registro en el backend no amplía por sí sola
  el alcance de las pantallas del frontend.
- Definir la topología de producción en la fase de despliegue.

## Verificaciones pendientes del bootstrap

- Fijar las versiones exactas y comprobar su compatibilidad.
- Confirmar el puerto efectivo y la URL de Auth del backend local.
- Configurar el origen permitido `http://localhost:5174` en el backend,
  mediante el proceso de cambio de su spec.
- Validar la adaptación del contrato con el cliente Better Auth:
  login, sesión válida, ausencia de sesión con `401`, errores de red
  o servidor y logout con `204`.
- Comprobar el envío y recepción de cookies a través del proxy,
  la actualización del estado de sesión y las rutas protegidas.
