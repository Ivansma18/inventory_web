# Tareas - Spec 001 Project Bootstrap

Derivadas de la spec y del plan aprobados. Todas las tareas están pendientes. Cada una apunta a una sesión de aproximadamente 15–30 minutos, sin contar descargas o esperas por prerrequisitos externos. Si una unidad resulta mayor durante la implementación, detenerse y dividir su trabajo pendiente antes de ampliar su alcance.

Cada tarea de comportamiento escribe o actualiza primero su prueba de aceptación y después incorpora el comportamiento. Las tareas de infraestructura se verifican con comandos o fixtures negativas cuando no exista todavía un runner. Ejecutar los checks disponibles que correspondan al cambio; no exigir herramientas que aún no hayan sido configuradas.

## Tareas

### Base y herramientas

- [x] T1. Verificar la disponibilidad del entorno fijado por el plan para este proyecto y registrar los prerrequisitos de ejecución. (RF-1, RF-33)
      Hecho cuando: se acreditan Node.js `24.21.0` y pnpm `12.8.1` en el entorno que ejecutará el frontend, o la tarea queda bloqueada con diagnóstico explícito; la preparación no altera silenciosamente el runtime de otras aplicaciones ni instala herramientas globales como efecto oculto.
      Evidencia: NVM instaló Node.js `24.21.0` en paralelo y se ejecutó su `node.exe` por ruta explícita. Corepack con ese runtime descargó pnpm `12.8.1` a su caché de usuario y, con acceso de red deshabilitado, se verificó que continuaba disponible. La selección predeterminada de NVM permanece en Node.js `22.19.0` y `pnpm` sin versionar continúa en `11.25.0`; no se alteró el runtime de otras aplicaciones ni se instalaron herramientas globales.

- [x] T2. Crear el manifiesto e instalar las dependencias exactas del plan con configuración de engines y peers requeridos. (RF-1)
      Hecho cuando: existe `pnpm-lock.yaml`, la instalación no tiene conflictos de peers requeridos y `pnpm install --frozen-lockfile` se repite sin modificar el lockfile; se preservan documentos y configuraciones de agentes existentes.
      Evidencia: tras la aprobación de actualizar MSW a `2.12.10`, `package.json` fija todas las dependencias, pnpm `12.8.1` y Node `24.21.0`; `.node-version` selecciona el runtime del proyecto. pnpm 12 lee `engineStrict=true`, `strictPeerDependencies=true` y `autoInstallPeers=false` desde `pnpm-workspace.yaml`. El postinstall de MSW se deniega explícitamente porque su único efecto sería copiar el worker si el proyecto declara `msw.workerDirectory`, que no está configurado. `pnpm peers check` no detectó issues y dos ejecuciones de `pnpm install --frozen-lockfile` pasaron sin cambiar el SHA-256 del lockfile. Para permanecer en aislamiento, los comandos usaron Node 24 por ruta y un PATH temporal, sin cambiar la selección predeterminada de NVM.

- [x] T3. Configurar TypeScript strict y aliases para aplicación y herramientas, con script `typecheck`. (RF-26)
      Hecho cuando: una fixture aislada con error de tipos falla, su control válido pasa y los aliases se resuelven; la configuración permite incorporar pruebas cuando se añadan sin incluir fixtures deliberadamente inválidas en el código de aplicación.
      Evidencia: `pnpm typecheck` pasó con Node.js `24.21.0` y pnpm `12.8.1`. `scripts/verify-typescript-config.mjs` comprueba `strict`, `noEmit`, las rutas `@/app`, `@/features` y `@/shared`; genera fixtures válidas e inválidas en un directorio temporal, confirma resolución de aliases y errores por asignación incompatible e implicit any, y limpia el directorio al terminar. `src/vite-env.d.ts` registra los tipos del cliente Vite.

- [x] T4. Configurar Vitest, entorno de componentes y Testing Library, con scripts `test` y `test:run`. (RF-30, RF-31, RF-32)
      Hecho cuando: una prueba de componente válida se ejecuta, una fixture de suite fallida produce exit no cero y el modo interactivo repite pruebas al cambiar una fixture; se excluyen las suites Playwright y no se trata la ausencia de tests como éxito.
      Evidencia: `vitest.config.ts` usa jsdom, setup de jest-dom y cleanup explícito; incluye solo `tests/**/*.test.{ts,tsx}` y excluye `tests/browser/**`. `pnpm test:run` pasó la prueba de render/interacción. Una fixture fallida temporal produjo exit 1 y fue eliminada. `pnpm test` en watch reejecutó una fixture al modificarla y reportó el fallo esperado; se eliminaron fixture y verificador temporales. Una ruta de test inexistente produjo “No test files found” y exit 1. `pnpm typecheck` también pasó.

- [x] T5. Configurar MSW para las pruebas aisladas y su limpieza entre casos. (RF-32)
      Hecho cuando: una petición simulada se prueba sin backend ni credenciales reales, las peticiones no previstas causan fallo y los handlers/estado no se filtran entre pruebas.
      Evidencia: `tests/mocks/server.ts` ejecuta `setupServer` con `onUnhandledRequest: "error"`; `tests/setup.ts` inicia y cierra el servidor y restablece handlers y cleanup después de cada caso. Cuatro pruebas verifican respuesta interceptada sin backend, override por prueba, restauración del handler inicial entre casos y rechazo de solicitud sin handler. `pnpm typecheck`, la suite completa (`2` archivos, `5` pruebas) y `pnpm peers check` pasaron.

- [x] T6. Configurar ESLint para fuentes, React y herramientas con script `lint`. (RF-27)
      Hecho cuando: una fixture virtual con una infracción de lint falla y un control válido pasa; el script funciona desde la raíz sin requerir código deliberadamente inválido en `src`.
      Evidencia: `eslint.config.js` combina las reglas recomendadas de ESLint, TypeScript, React Hooks y React Refresh y Prettier compatibility; ignora dependencias, outputs y directorios de agentes/herramientas. `pnpm lint` pasó desde la raíz. `scripts/verify-eslint-config.mjs` confirma que fixtures virtuales de TypeScript y React inválidos se rechazan y los controles válidos pasan; no deja fixtures inválidas en `src`. `pnpm typecheck` también pasó.

- [x] T7. Automatizar fronteras de UI, Auth y transporte HTTP mediante restricciones ESLint. (RF-27)
      Hecho cuando: pruebas programáticas detectan imports raíz, subpaths, tipos y CSS no autorizados de PrimeReact/PrimeIcons, Better Auth y Axios; los imports permitidos dentro de sus fronteras pasan.
      Evidencia: `eslint.config.js` prohíbe PrimeReact/PrimeIcons fuera de `src/shared/ui`, Better Auth fuera de `src/features/auth` y Axios fuera de `src/shared/api/http-client.ts`, con reglas conservadas para las demás dependencias dentro de cada excepción. `scripts/verify-eslint-config.mjs` comprueba imports raíz, subpaths, tipos y CSS prohibidos, además de imports permitidos en cada frontera y la API pública de Auth desde otra feature. `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (2 archivos, 5 pruebas).

- [x] T8. Automatizar la frontera de APIs públicas entre features para imports por alias y relativos. (RF-27)
      Hecho cuando: fixtures virtuales rechazan imports externos a internos de otra feature por ambas formas de ruta y aceptan su API pública e imports internos de la propia feature.
      Evidencia: la regla local `inventory-architecture/no-cross-feature-internal-imports` (`scripts/eslint-rules/no-cross-feature-internal-imports.mjs`) normaliza los aliases `@/features/*` y las rutas relativas, permite internals de la feature actual y exige la entrada `index` al importar otra feature. También comprueba imports de tipos y reexports. Las fixtures virtuales rechazan imports profundos por alias/relativo, imports type-only y reexports; aceptan la API pública por alias/relativo y los imports internos propios. `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (2 archivos, 5 pruebas).

- [x] T9. Configurar Prettier y scripts `format` y `format:check`. (RF-28, RF-29)
      Hecho cuando: check detecta una fixture mal formateada sin escribirla, write la corrige y el segundo check pasa; ambos comandos usan el mismo alcance documentado y excluyen generados/artefactos.
      Evidencia: `.prettierrc.json` fija estilo y finales LF; `.prettierignore` excluye lockfile, código generado, dependencias, artefactos, documentación y configuración de agentes. `format` y `format:check` comparten cinco globs para fuentes, tests, scripts, configuración raíz y `.prettierrc.json`; `scripts/verify-prettier-config.mjs` verifica la igualdad de globs y ejecuta la fixture check sin escritura → write → check en un directorio temporal que limpia. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (2 archivos, 5 pruebas).

- [x] T10. Preparar Husky y lint-staged con activación condicionada a Git. (RF-27, RF-28, RF-33)
      Hecho cuando: la configuración de archivos preparados y hook está definida, sus comandos se comprueban en un entorno Git aislado si hace falta y la ausencia de Git en el proyecto se informa sin presentarlo como hook activo; no se inicializa el repositorio como efecto oculto.
      Evidencia: `package.json` configura `prepare` mediante `scripts/prepare-hooks.mjs`, `lint-staged` aplica ESLint y luego Prettier a JavaScript/TypeScript staged y Prettier a los demás tipos incluidos; `.husky/pre-commit` invoca `pnpm exec lint-staged`. La preparación informa y no instala si no hay repositorio Git, omite CI/production/HUSKY=0 y deja intacto un `core.hooksPath` personalizado. `pnpm verify:hooks` comprueba ausencia de Git sin inicializarla, instala Husky y ejecuta lint-staged en un repositorio temporal aislado con fixtures de src/tests/scripts/raíz; valida formato y que los cambios queden staged, y limpia el temporal. Este proyecto sí es un repo Git: `pnpm prepare` instaló Husky con `core.hooksPath=.husky/_`; `git hook run pre-commit` pasó al no haber archivos staged. `pnpm format`, `pnpm format:check`, `pnpm verify:hooks`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (2 archivos, 5 pruebas).

### Configuración, comunicación y vista mínima

- [x] T11. Escribir pruebas y crear el esquema puro de configuración pública y de herramientas. (RF-7, RF-8, RF-9, RF-37)
      Hecho cuando: las pruebas cubren variables obligatorias ausentes, valores inválidos, prefijo local, URL HTTP(S), nombre vacío y default de destino del proxy según el plan; los errores indican nombres sin reproducir valores sensibles y `.env.example` contiene solo ejemplos públicos.
      Evidencia: `src/shared/config/env.schema.ts` exporta esquemas Zod puros separados para `VITE_APP_NAME`/`VITE_API_URL` y `API_PROXY_TARGET`; el proxy usa default local y valida un origen HTTP(S) sin credenciales, path, query ni fragmento. `.env.example` incluye únicamente valores de ejemplo seguros, sin credenciales de pruebas reales. `tests/env-schema.test.ts` cubre variables requeridas, nombre vacío/trim, prefijo local, URLs HTTP(S), entradas inválidas, default del proxy y que los errores indiquen `VITE_API_URL` sin divulgar credenciales. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (3 archivos, 26 pruebas).

- [x] T12. Integrar validación de configuración en Vite y fijar puertos estrictos de dev y preview. (RF-2, RF-3, RF-5, RF-6, RF-35, RF-36)
      Hecho cuando: la configuración valida antes de servir o compilar, los puertos son `5174` con rechazo de conflictos y React/Tailwind y aliases están configurados; las pruebas de configuración no necesitan la cuenta de Auth.
      Evidencia: `vite.config.ts` combina `loadEnv` con las variables de proceso admitidas, valida los esquemas públicos y de herramientas antes de devolver la configuración y expone al bundle solo `VITE_APP_NAME`/`VITE_API_URL`. Dev y preview fijan `localhost:5174` con `strictPort: true`; React, Tailwind y aliases están configurados en Vite y Vitest, usando `scripts/vite-aliases.ts`. `package.json` añade `dev`, `build` y `preview`. `tests/vite-config.test.ts` verifica rechazo de configuración inválida para `serve` y `build`, saneamiento de errores, proxy de herramientas y configuración de puertos/plugins/aliases. `pnpm dev` y `pnpm build` con valores inválidos terminaron con error antes de servir o crear build. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (4 archivos, 32 pruebas).

- [x] T13. Configurar reglas de proxy de Auth y negocio conservando la separación de rutas. (RF-10, RF-11)
      Hecho cuando: pruebas de reglas verifican `/api/auth` sin rewrite, `/api/backend` con rewrite acotado y query preservada; `/products` y prefijos parecidos no se interceptan; se conserva Origin y preview reutiliza el proxy local.
      Evidencia: `scripts/vite-proxy.ts` define contextos regex con límite de segmento para `/api/auth` y `/api/backend`; solo negocio elimina el prefijo, preserva query y deja rutas ajenas intactas. `vite.config.ts` comparte la misma configuración de proxy entre dev y preview; `changeOrigin` ajusta Host sin reescribir `Origin`. `tests/vite-proxy.test.ts` usa un backend HTTP local simulado para comprobar path, método, body, query, Origin, prefijos no interceptados y la misma conducta en preview. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (5 archivos, 36 pruebas).

- [x] T14. Escribir pruebas y crear el modelo común de errores HTTP. (RF-14, RF-15, RF-45, RF-46)
      Hecho cuando: los errores reconocidos conservan código, status y field errors validados; cuerpos vacíos/HTML/desconocidos producen error genérico con status; fallos sin respuesta son distinguibles y no se publican cuerpos crudos ni datos sensibles.
      Evidencia: `src/shared/api/api-error.ts` define la unión `http`/`network`, normaliza cuerpos con contrato reconocido conservando status, código público y `fieldErrors` solo si son `Record<string,string[]>` válidos. Cuerpos vacíos, HTML o malformados generan un mensaje HTTP local; el mensaje del backend y el payload crudo no se publican. `createNetworkApiError()` entrega una categoría sin status HTTP. `tests/api-error.test.ts` cubre contratos reconocidos, códigos/status/campos, campos malformados, cuerpos genéricos, sanitización y fallos de red. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (6 archivos, 47 pruebas).

- [x] T15. Escribir pruebas e incorporar el cliente HTTP de negocio encapsulado. (RF-12, RF-13, RF-14, RF-15, RF-45, RF-46)
      Hecho cuando: MSW demuestra consumo de respuesta, base URL, credenciales, timeout y uso del normalizador; el transporte no contiene reglas de negocio ni se importa Axios desde componentes.
      Evidencia: `src/shared/config/env.ts` centraliza el acceso validado a la configuración pública. `src/shared/api/http-client.ts` mantiene la instancia Axios privada, configura `baseURL`, `withCredentials` y timeout de 10 segundos, retorna solo `response.data` y transforma los errores con `api-error.ts` sin exponer tipos Axios. `tests/http-client.test.ts` usa MSW para verificar URL base, credentials, datos de respuesta, errores HTTP normalizados y fallo de red; un servidor HTTP local demorado verifica el timeout real. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (7 archivos, 52 pruebas).

- [x] T16. Manejar la indisponibilidad del destino en el proxy con respuesta saneada. (RF-13, RF-45, RF-46)
      Hecho cuando: un destino de prueba no disponible produce `502` con procedencia de proxy y código de infraestructura previsto; no expone request/body/headers sensibles ni se confunde con una petición del navegador sin respuesta.
      Evidencia: `scripts/vite-proxy.ts` convierte fallos upstream en JSON estático `502` con código `PROXY_BACKEND_UNAVAILABLE`, `source: "proxy"` y `Cache-Control: no-store`; no copia URL, body, headers ni mensaje del error. La ruta de error reduce además la URL que Vite utiliza para registrar el fallo al prefijo `/api/auth` o `/api/backend`. `api-error.ts` conserva la procedencia solo para el código reservado; el cliente HTTP la normaliza como HTTP `502`, distinta de `network`. Las pruebas usan un destino local cerrado y datos secretos de fixture para comprobar status, payload, sanitización y normalización. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (7 archivos, 56 pruebas).

- [x] T17. Configurar Query Client y su provider con las convenciones iniciales del plan. (RF-12, RF-32)
      Hecho cuando: una query de prueba consume el cliente HTTP simulado y se comprueban las opciones iniciales de caché/retry/refetch; no se introduce server state en Zustand ni una feature de health de negocio.
      Evidencia: `src/shared/api/query-client.ts` configura `staleTime: 30_000`, `retry: false` para queries y mutations y `refetchOnWindowFocus: false`; `src/app/providers/query.provider.tsx` provee el cliente compartido. `tests/query-client.test.tsx` verifica opciones, consulta un recurso simulado mediante `httpClient`, comprueba los datos en Query Cache y acredita una sola petición ante error. No se añade estado de servidor a Zustand ni feature de health. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (8 archivos, 59 pruebas).

- [x] T18. Preparar el provider UI y estilos encapsulados en `shared/ui`. (RF-4, RF-27)
      Hecho cuando: las pruebas de montaje del contrato propio pasan, el provider de app consume su API pública y todos los imports PrimeReact/PrimeIcons, incluidos CSS, permanecen dentro de `shared/ui`; no se crea un catálogo de wrappers.
      Evidencia: `src/shared/ui/provider/ui-provider.tsx` envuelve `PrimeReactProvider` con props propias; `src/shared/ui/index.ts` exporta esa API e importa los estilos encapsulados. `src/shared/ui/styles.css` carga el tema Lara de PrimeReact y PrimeIcons dentro de su capa y Tailwind v4 theme/utilities sin preflight; `src/app/providers/ui.provider.tsx` solo consume `@/shared/ui`. `tests/ui-provider.test.tsx` monta children mediante el provider de app y verifica que imports CSS vendor solo estén en `shared/ui`; `pnpm lint` verifica imports de módulos. No se añadieron wrappers. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (9 archivos, 61 pruebas).

- [x] T19. Escribir prueba de la vista mínima y componer entrada, providers y ruta inicial. (RF-4, RF-7, RF-37)
      Hecho cuando: se muestra un main con heading Inventory, la validación pública ocurre antes del montaje y configuración inválida impide inicializar; la página funciona sin montar Auth ni requerir backend; se revisan semántica, legibilidad y responsive con Impeccable.
      Evidencia: `index.html` define el documento español y el root; `src/main.tsx` carga la configuración validada antes de crear el root de React y compone `AppProviders`; este último compone QueryProvider, UiProvider y RouterProvider. `src/app/router/router.tsx` declara `/` como ruta única de `BootstrapPage`, que presenta un `<main>`, heading `Inventory` y copy estático en español sin consultas ni Auth. Sus estilos neutrales usan tamaños fluidos y se revisaron en navegador a 1440×900 y 390×844, sin desbordamiento horizontal; `impeccable detect --json` no reportó hallazgos. `tests/app-bootstrap.test.tsx` comprueba el render del contenido y que configuración pública inválida impide llamar `createRoot`. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm test:run` pasaron (10 archivos, 63 pruebas).

- [x] T20. Completar scripts build/preview y comprobar generación del bundle inicial. (RF-5, RF-6)
      Hecho cuando: `pnpm typecheck` y `pnpm build` pasan con configuración válida y preview sirve la vista mínima en `5174`; no se incorpora una configuración de despliegue de producción.
      Evidencia: `package.json` ya contiene `build: tsc --noEmit && vite build` y `preview: vite preview`; `vite.config.ts` fija preview a `localhost:5174` con `strictPort: true`, por lo que no requirió cambios de scripts. Con Node.js `24.21.0`, pnpm `12.8.1`, `VITE_APP_NAME=Inventory` y `VITE_API_URL=/api/backend`, `pnpm typecheck` pasó y `pnpm build` generó `dist/index.html`, CSS/JS y assets del tema/iconos (249 módulos transformados). `pnpm preview` respondió HTTP 200 en `http://localhost:5174/`; Playwright con Microsoft Edge esperó el heading `Inventory` y capturó la vista mínima del bundle. El servidor temporal se cerró y el puerto quedó libre. No se añadió hosting de producción.

- [x] T21. Añadir comprobaciones de proceso para configuración inválida y conflicto de puerto. (RF-2, RF-3, RF-7, RF-8, RF-35, RF-36, RF-37)
      Hecho cuando: fixtures de entorno inválido bloquean dev/build, un listener aislado provoca rechazo de `5174` sin salto de puerto y las comprobaciones limpian sus propios procesos; no detienen ni reutilizan las otras aplicaciones.
      Evidencia: `scripts/verify-startup-processes.mjs` y `pnpm verify:startup` ejecutan Vite como proceso hijo aislado. Fixtures con `VITE_APP_NAME` vacío y `VITE_API_URL` inválida son rechazadas en dev y build, se informan los nombres sin reproducir el valor y ambos procesos terminan antes del timeout. El verificador reserva `localhost:5174` con un listener propio; si el puerto ya está ocupado, termina sin iniciar ni detener procesos externos. Con el puerto reservado, Vite sale con error que identifica `5174` en vez de saltar a otro puerto. El proceso Vite y el listener se cierran; tras `pnpm verify:startup` no queda ningún proceso escuchando en `5174`. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (10 archivos, 63 pruebas) y `pnpm build` pasaron.

### Contratos e infraestructura de Auth

- [x] T22. Verificar disponibilidad del backend para health/OpenAPI y registrar los prerrequisitos externos de Auth real. (RF-12, RF-34)
      Hecho cuando: se confirma en modo no destructivo el destino efectivo o se registra el bloqueo; se identifica aceptación de `http://localhost:5174` y disponibilidad de cuenta como condiciones para la prueba real; no se cambian código/configuración del backend ni se publican valores privados.
      Evidencia: no hay override de `API_PROXY_TARGET` en el proceso ni archivos `.env` activos; `.env.example` y el default validado fijan como destino local efectivo `http://localhost:3000`. En la verificación inicial de T22, las consultas GET no destructivas a `/health` y `/openapi.json`, con timeout máximo de 5 s, terminaron sin respuesta de conexión; el backend quedó registrado como no disponible. Tras el aviso de inicio del backend, se revalidaron ambos endpoints para T23 y respondieron HTTP 200. Para la prueba real de Auth, el backend debe aceptar el origen `http://localhost:5174` y debe existir una cuenta exclusiva de pruebas preparada previamente; esos prerrequisitos siguen sin confirmar. No se modificó el backend ni se consultaron o publicaron credenciales.

- [x] T23. Obtener snapshot OpenAPI real acotado a Auth/health y generar contratos TypeScript. (RF-17, RF-18, RF-24, RF-25)
      Hecho cuando: el snapshot conserva las referencias necesarias, se contrasta con el contrato vigente y la generación reproducible produce tipos sin DTOs duplicados manualmente; el snapshot permite compilar sin backend y no incluye secretos.
      Evidencia: `tests/contracts/auth-health.openapi.json` se extrajo del `/openapi.json` real (OpenAPI 3.0.3, Inventory API 0.1.0) mediante `pnpm snapshot:auth-openapi`; contiene solo `/health` y las cuatro operaciones `/api/auth/*`, junto con sus ocho schemas referenciados y el esquema de cookie. La consulta real de health devuelve HTTP 200 y `{ status: "ok" }`. El contrato coincide con los endpoints planificados: login `200` más `400` de validación y `401`, sesión `200`/`401`, logout `204` sin body; user incluye `id`, `email`, `role` enum y session `id`/`createdAt` date-time. OpenAPI también documenta registro `201` como contrato de Auth, sin añadir pantalla ni flujo frontend; los errores de Auth solo definen `code` y `message`, sin `fieldErrors`. `src/shared/api/generated/auth-contracts.ts` se generó con openapi-typescript `7.13.0`; `pnpm generate:auth-contracts` reproduce el mismo SHA-256 desde el snapshot y funciona con el destino de backend inaccesible. `tests/openapi-contract.test.ts` verifica el alcance, el cierre de `$ref`, respuestas/cookie y uso de los tipos generados. `pnpm build` pasó también con `API_PROXY_TARGET` apuntando a un puerto local sin servicio, acreditando que el snapshot permite compilar sin backend. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (11 archivos, 67 pruebas) y `pnpm build` pasaron.

- [x] T24. Escribir pruebas y crear la validación runtime del contrato reducido de Auth. (RF-17, RF-18, RF-24, RF-25, RF-43, RF-44)
      Hecho cuando: los DTOs reales válidos pasan, falta de cada campo obligatorio falla y tipos públicos/runtime concuerdan con generados; no se fabrican token, expiresAt ni otros campos ausentes.
      Evidencia: `src/features/auth/auth-contract.ts` valida desde `unknown` el envelope público, usuario y sesión con Zod, incluyendo email, enum de roles y date-time ISO con offset. Sus esquemas se comprueban contra `components` generados del OpenAPI. `tests/auth-contract.test.ts` cubre el DTO válido, la omisión de cada campo requerido, email/role/date-time inválidos y el filtrado de campos no públicos como token, expiresAt y displayName; `createdAt` se mantiene como string y no se fabrican valores. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (12 archivos, 80 pruebas) y `pnpm build` pasaron.

- [x] T25. Escribir pruebas e incorporar el transporte/parser de Auth sobre las extensiones públicas de Better Auth. (RF-21, RF-24, RF-25, RF-43, RF-45, RF-46)
      Hecho cuando: `$fetch` mantiene el envelope y `createdAt` string, acepta `204` vacío y distingue JSON exitoso inválido, HTTP vacío/HTML y red sin respuesta; se preservan status y credenciales sin importar internos ni parchear el SDK.
      Evidencia: `src/features/auth/api/auth-client.ts` instancia el React Client en `/api/auth` con `createAuthFetchOptions`; `src/features/auth/api/auth-transport.ts` usa `fetchOptions` públicos de Better Auth, `credentials: include`, timeout de 10 s y `parseJSON` con conversión de fechas desactivada. Su `customFetchImpl` inspecciona una copia de los éxitos JSON, conserva la respuesta original y separa respuestas exitosas malformadas mediante `AuthResponseContractError` con status; `204` vacío se parsea como `null`, los errores HTTP mantienen status sin publicar cuerpo HTML y las fallas de red se propagan sin reclasificarse. `tests/auth-transport.test.ts` ejerce `$fetch` a través de un plugin público de prueba y MSW para envelope/fecha string, credenciales, `204`, JSON inválido, HTTP vacío/HTML y red sin respuesta. No se importan rutas internas ni se modifica el SDK. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (13 archivos, 86 pruebas) y `pnpm build` pasaron.

- [x] T26. Registrar el atom de sesión de Inventory en el plugin del cliente React e implementar consulta inicial/refetch. (RF-17, RF-18, RF-19, RF-20, RF-49)
      Hecho cuando: pruebas de hooks generados observan pending, respuesta válida, `401` y consulta repetida; el atom registrado es la única fuente activa de sesión y los datos se validan antes de publicarse.
      Evidencia: `src/features/auth/inventory-auth-plugin.ts` registra el atom `inventorySession` con `getAtoms` y la consulta inicial al suscribirse; Better Auth genera `useInventorySession`. La acción `refreshSession` vuelve a consultar el mismo `$fetch` y actualiza el mismo atom; `200` se valida con `publicAuthResponseSchema` antes de publicar user/session y `401` confirma `unauthenticated`. `src/features/auth/api/auth-client.ts` registra el plugin. `tests/auth-session-plugin.test.tsx` usa MSW y el hook generado para comprobar `pending`, respuesta válida, `401` y refetch sobre el mismo estado. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (14 archivos, 89 pruebas) y `pnpm build` pasaron.

- [x] T27. Incorporar transiciones por respuesta incompleta y recuperación de sesión no confirmada. (RF-43, RF-44, RF-47, RF-48, RF-49)
      Hecho cuando: pruebas primero muestran que una respuesta incompleta elimina datos confirmados, expone error contract y ambos indicadores de confirmación son falsos; un refetch válido autentica y un refetch `401` confirma ausencia.
      Evidencia: `InventorySessionState` incorpora `unconfirmed` con user/session nulos, `error.kind: "contract"` y `isAuthenticated`/`isUnauthenticated` falsos. Un `200` que no pasa `publicAuthResponseSchema` o un `AuthResponseContractError` reemplaza incluso datos autenticados previos; refetch válido limpia el error y autentica, mientras `401` confirma `unauthenticated`. `tests/auth-session-plugin.test.tsx` prueba respuesta incompleta inicial, eliminación de datos confirmados y ambas rutas de recuperación. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (14 archivos, 91 pruebas) y `pnpm build` pasaron.

- [x] T28. Implementar login del plugin con precondiciones y errores de credenciales. (RF-16, RF-17, RF-18, RF-38, RF-39, RF-40)
      Hecho cuando: pruebas simuladas verifican login válido y cookie/transporte previsto, rechazo de credenciales mantiene unauthenticated y estados pending/authenticated/unconfirmed impiden enviar login; no se implementa cambio de cuenta.
      Evidencia: `signInWithEmail` envía `POST /sign-in/email` con las credenciales de contrato, `credentials: include` y timeout compartido. Solo acepta sesión `unauthenticated` confirmada; `pending`, `authenticated` y `unconfirmed` devuelven error de precondición sin petición. La respuesta exitosa se valida antes de publicar sesión; una respuesta incompleta pasa a `unconfirmed`. El `401 UNAUTHORIZED` devuelve error `credentials` con mensaje local y conserva `unauthenticated`. `inventorySignIn` expone el estado pendiente de la operación. `tests/auth-session-plugin.test.tsx` verifica transporte/cookie, éxito, rechazo saneado, los tres estados bloqueados y respuesta exitosa incompleta. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (14 archivos, 97 pruebas) y `pnpm build` pasaron.

- [x] T29. Implementar logout confirmado y consulta posterior en el plugin. (RF-22, RF-23)
      Hecho cuando: una prueba con `204` sin body actualiza inmediatamente a unauthenticated y una consulta posterior no recupera la sesión cerrada; no se espera un body JSON para confirmar el cierre.
      Evidencia: `signOutInventory` envía `POST /sign-out` con credenciales incluidas y timeout compartido. Al recibir la respuesta satisfactoria `204` sin body, cambia de inmediato el atom de sesión a `unauthenticated`; no hace una consulta implícita. La prueba MSW establece que la siguiente consulta explícita retorna `401` y confirma que user/session siguen nulos. `inventorySignOut` expone el indicador pendiente mientras se espera la confirmación. `tests/auth-session-plugin.test.tsx` verifica `204`, transporte de credenciales, transición inmediata y consulta posterior. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (14 archivos, 98 pruebas) y `pnpm build` pasaron.

- [x] T30. Incorporar tratamiento de errores de red/servidor y reintento de logout. (RF-21, RF-41, RF-42, RF-46)
      Hecho cuando: pruebas de consulta/login/logout distinguen errores de ausencia de sesión; logout fallido conserva estado/datos y permite reintento o confirmación posterior por consulta, sin declarar cierre exitoso.

      Evidencia: Auth normaliza errores de operación a `network`, `http` con status o `contract`, con operación identificada y mensajes locales saneados. Una consulta inicial fallida pasa a `unconfirmed`; una consulta `401` confirma ausencia, mientras un fallo durante refetch conserva la última sesión confirmada y devuelve el error sin convertirlo en ausencia. Login devuelve errores HTTP/red sin perder `unauthenticated`; logout mantiene usuario/sesión y restablece `isPending` ante fallo, permitiendo retry o confirmación posterior mediante consulta `401`. Una respuesta exitosa de logout malformada se clasifica como contrato y no cierra la sesión. `tests/auth-session-plugin.test.tsx` cubre fallos HTTP/red de consulta, login y logout, recuperación, sanitización y conservación de estado. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (14 archivos, 106 pruebas) y `pnpm build` pasaron.
- [x] T31. Exponer `useAuth`, `useSession` y tipos propios mediante la API pública. (RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-38, RF-47, RF-48, RF-49)
      Hecho cuando: consumidores de prueba usan únicamente `features/auth`, pueden ejecutar acciones/refetch y observar la unión pública; no se exportan SDK, atoms, transporte interno ni tipos completos de sesión de Better Auth.

      Evidencia: `src/features/auth/index.ts` exporta únicamente `useAuth`, `useSession` y tipos propios derivados de contratos públicos; no exporta `authClient`, plugin, atoms, transporte ni tipos del cliente Better Auth. `useSession` expone la unión de sesión, `isPending` y `refetch`; `useAuth` expone `signIn`/`signOut`, resultados tipados y estados pendientes. `tests/auth-public-api.test.tsx` consume solo `@/features/auth` y verifica pending → unconfirmed → unauthenticated, precondición, login válido, refetch y logout. El cliente construye su URL Auth absoluta desde el origen actual y el transporte difiere la resolución de fetch hasta la petición para permitir interceptación de MSW con el cliente público. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (15 archivos, 107 pruebas) y `pnpm build` pasaron.
- [x] T32. Asegurar fuente única, consultas iniciales idempotentes y protección frente a respuestas tardías. (RF-19, RF-22, RF-23, RF-38)
      Hecho cuando: pruebas con StrictMode/múltiples consumidores no crean fuentes paralelas ni consultas iniciales innecesarias y una consulta anterior no resucita una sesión después del logout; login/logout se serializan según el plan.

      Evidencia: el plugin inicia como máximo una consulta inicial por instancia, aunque haya consumidores múltiples, StrictMode o un remount. Cada consulta captura la versión de estado de sesión; una respuesta de consulta que finaliza después de un login/logout confirmado retorna `stale: true` y no cambia el atom. Login y logout comparten un lock: acciones solapadas devuelven error de precondición y no envían otra petición. `tests/auth-session-concurrency.test.tsx` verifica StrictMode/remount, protección ante refetch tardío y serialización en ambas direcciones. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (16 archivos, 110 pruebas) y `pnpm build` pasaron.
- [x] T33. Verificar el ciclo contractual completo mediante la API pública con simulaciones. (RF-16 a RF-25, RF-32, RF-38 a RF-49)
      Hecho cuando: el cliente React real pasa el ciclo consulta sin sesión → login → sesión → logout → consulta `401`, más errores y recuperación acordados, con backend apagado; se verifica ausencia de campos/credenciales sensibles en salidas y no se declara por ello cumplida la prueba real.
      Evidencia: `tests/auth-public-api.test.tsx` recorre con MSW la respuesta inicial incompleta y el refetch `401` que confirma ausencia, rechazo de credenciales y recuperación con login válido, refetch fallido por red seguido de refetch válido, logout fallido `503` seguido de retry `204` y consulta posterior `401`. El test importa exclusivamente `@/features/auth`; verifica que errores no publiquen mensajes del backend, la contraseña de prueba ni campos `token`, `expiresAt` o `cookie`. Todas las rutas Auth del flujo están interceptadas por MSW con errores para peticiones no previstas, por lo que esta es evidencia simulada y no se toma como verificación real de cookie en navegador. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (16 archivos, 110 pruebas) y `pnpm build` pasaron.

### Navegador, integración real y cierre

- [x] T34. Configurar Playwright Chromium, proyectos de bootstrap y script `test:e2e`. (RF-2, RF-4, RF-6, RF-32, RF-34)
      Hecho cuando: un smoke de página se ejecuta en navegador y los proyectos bootstrap-smoke/proxy-contract se invocan sin credenciales reales; auth-real requiere selección explícita y falla con diagnóstico si faltan sus prerrequisitos; el servidor usa puerto estricto sin reutilizar una app desconocida.
      Evidencia: `playwright.config.ts` define proyectos Chromium `bootstrap-smoke`, `proxy-contract` y `auth-real`; `scripts/run-playwright.mjs` incluye `auth-real` solo si se selecciona explícitamente con `--project=auth-real`. El `webServer` usa el Vite local en `localhost:5174`, `reuseExistingServer: false` y hereda el `strictPort` de Vite; elimina variables `AUTH_TEST_*` del entorno del proceso Vite. `pnpm test:e2e` ejecutó ambos proyectos predeterminados (2 tests pasaron) sin cuenta de Auth; `pnpm test:e2e --project=auth-real` falló con el diagnóstico esperado de `AUTH_TEST_EMAIL` y `AUTH_TEST_PASSWORD` ausentes, sin mostrar sus valores. Chromium se instaló con `pnpm exec playwright install chromium`. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (16 archivos, 110 pruebas) y `pnpm build` pasaron.

- [x] T35. Crear el harness de navegador exclusivo de pruebas para consumidores de Auth. (RF-16, RF-17, RF-18, RF-19, RF-22, RF-32, RF-34)
      Hecho cuando: pruebas consumen solo la API pública mediante el harness, las credenciales se reciben en memoria y el harness solo se sirve en modo de prueba; no hay pantalla/formulario de login ni exposición en el bundle de aplicación.
      Evidencia: `scripts/vite-auth-test-harness.ts` sirve `/__auth-test` solo en Vite `serve` con `INVENTORY_AUTH_E2E_HARNESS=1`; la ruta no se añade al build. `playwright.config.ts` separa el proyecto simulado `auth-harness` del proyecto `auth-real`, que sigue requiriendo selección explícita y preflight de credenciales. `tests/browser/auth-real-harness.tsx` consume únicamente `useAuth`/`useSession`; recibe credenciales por un mensaje del mismo origen, en memoria, no muestra formulario ni campos de login y expone solo un resumen saneado de estado/error. `tests/browser/auth-harness.auth-harness.spec.ts` usa rutas simuladas para comprobar el bridge y que la contraseña/cookie/token no se publiquen. `pnpm test:e2e` ejecutó los proyectos bootstrap-smoke, proxy-contract y auth-harness (3 pruebas pasaron); `pnpm test:e2e --project=auth-harness` pasó una prueba. `pnpm test:e2e --project=auth-real` sin credenciales ejecutó solo el preflight y falló con el diagnóstico esperado. Build con harness habilitado y valores centinela no incluyó marcadores ni centinelas en `dist`. `pnpm format`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (16 archivos, 110 pruebas) y `pnpm build` pasaron.

- [x] T36. Añadir pruebas de proxy en navegador contra un backend simulado controlado. (RF-10, RF-11, RF-13, RF-45, RF-46)
      Hecho cuando: se verifica método/path/query/body de Auth y negocio, navegación no interceptada y error saneado al perder el destino; la suite no requiere backend personal ni toca sus datos.
      Evidencia: `scripts/proxy-test-backend.mjs` inicia un backend HTTP de prueba y un control local, ligados solo a `127.0.0.1`; Playwright los inicia sin reutilizar procesos y configura el proxy en `http://127.0.0.1:5175` únicamente cuando se ejecuta `proxy-contract`. `tests/browser/proxy-contract.project-smoke.spec.ts` envía desde Chromium un `POST /api/auth/sign-in/email` y un `PATCH /api/backend/products`; comprueba path/query/método/body/Origin en el backend (Auth conserva el prefijo, negocio se reescribe a `/products`). También navega a `/products?source=proxy-contract` y verifica que Vite devuelve el documento SPA sin una petición adicional al backend. La prueba detiene el backend controlado y confirma respuesta `502` con código `PROXY_BACKEND_UNAVAILABLE`, cuerpo saneado, `no-store` y sin reflejar un valor centinela. `pnpm test:e2e --project=proxy-contract` pasó (1 prueba); `pnpm test:e2e` pasó (3 pruebas, sin backend personal ni credenciales). `pnpm test:run` (16 archivos, 110 pruebas), `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm build` pasaron.

- [x] T37. Verificar en navegador el bundle generado, preview y exclusión del harness. (RF-4, RF-5, RF-6)
      Hecho cuando: preview del build muestra Inventory, no contiene acceso al harness ni referencias a credenciales y funciona sin backend para la página mínima; dev/preview se ejecutan alternadamente en `5174`.
      Evidencia: `scripts/start-preview-e2e.mjs` ejecuta typecheck y build antes de iniciar el preview con la API de Vite en `localhost:5174`; Playwright usa `reuseExistingServer: false`, de modo que no reutiliza un servidor dev/preview existente. `playwright.config.ts` configura este proyecto explícito con destino API local no disponible, harness deshabilitado y credenciales centinela no reales en el proceso privado de build. `tests/browser/preview-smoke.preview-smoke.spec.ts` verifica desde Chromium el documento de producción, la vista Inventory, ausencia de solicitudes `/api/`, ausencia en todos los artefactos de `/__auth-test`, marcadores del harness, nombres de variables y valores centinela; consulta además `/__auth-test` y confirma que solo recibe el fallback de la SPA, no el harness. `pnpm test:e2e --project=preview-smoke` pasó (1 prueba); `pnpm test:e2e` pasó (3 pruebas). `pnpm build`, `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (16 archivos, 110 pruebas) y `node scripts/verify-startup-processes.mjs` pasaron, incluyendo la comprobación de puerto estricto `5174`.

- [x] T38. Comprobar consumo de health del backend real a través de la conexión local. (RF-12, RF-34)
      Hecho cuando: una prueba desde navegador consume health por el cliente HTTP y proxy y deja evidencia saneada; si el backend no está disponible se informa bloqueo sin sustituir la evidencia por mocks.
      Evidencia: la consulta no destructiva previa a `http://localhost:3000/health` respondió HTTP 200 con `{ status: "ok" }`; no había override del destino de proxy. `scripts/vite-health-test-harness.ts` sirve `/__health-test` solo en Vite `serve` cuando se selecciona explícitamente `health-real`. `tests/browser/health-real-client-harness.ts` llama al cliente compartido `httpClient` con `GET /health`, usando el tipo generado de OpenAPI, y solo publica el estado saneado. `tests/browser/health-real.health-real.spec.ts` verifica en Chromium el resultado `ok` y que el navegador hizo `GET /api/backend/health`, que Vite reenvió al backend local configurado; no instala rutas mock ni inicia backend simulado. `pnpm test:e2e --project=health-real` pasó (1 prueba). También pasaron `pnpm test:e2e` (3 pruebas), `pnpm test:e2e --project=preview-smoke` (1 prueba), `pnpm test:run` (16 archivos, 110 pruebas), `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm build`.

- [x] T39. Ejecutar el ciclo real de cookies/sesión con la cuenta previamente preparada. (RF-16, RF-17, RF-18, RF-20, RF-22, RF-23, RF-24, RF-25, RF-34, RF-38)
      Hecho cuando: un contexto aislado confirma primero ausencia, luego login, consulta válida, logout `204` y consulta `401`; la evidencia acredita cookies del navegador, no solo un request client; no se crean cuentas ni datos de negocio y se desactivan artefactos/logs que puedan registrar credenciales. Si falta origen permitido o cuenta, queda bloqueada.
      Evidencia: `tests/browser/auth-real-workflow.auth-real.spec.ts` verifica en Chromium aislado la ausencia inicial (`401`, sin cookie), login (`200`, cookie HttpOnly), consulta válida (`200`), logout con la cookie del navegador (`204`), consulta posterior (`401`) y eliminación de la cookie. No crea cuentas ni datos de negocio. `scripts/run-playwright.mjs` carga únicamente `AUTH_TEST_EMAIL`/`AUTH_TEST_PASSWORD` desde `.env` ignorado al seleccionar `auth-real`; los ejemplos versionados quedan vacíos y las credenciales no pasan a Vite. Los diagnósticos contienen solo metadatos saneados y el cleanup intenta cerrar la sesión si el flujo falla. El backend dejó de ocultar errores de sign-out mediante su T13 autorizada; el cliente envía un objeto JSON vacío `{}` para evitar el `400 BAD_REQUEST` observado con cuerpo vacío. La regresión del request falló antes del arreglo y pasó después. `pnpm test:e2e --project=auth-real` pasó (2 pruebas: preflight y ciclo completo), junto con `pnpm test:e2e` (3 pruebas), `pnpm test:run` (16 archivos, 111 pruebas), `pnpm format:check`, `pnpm lint`, `pnpm typecheck` y `pnpm build`. Snapshot OpenAPI y tipos generados actualizados con los errores públicos de logout.

- [ ] T40. Documentar instalación, configuración, pruebas y comandos efectivamente comprobados. (RF-9, RF-33, RF-34)
      Hecho cuando: README permite reproducir instalación, dev, build, preview, checks y selección de suites; explica cuenta/backend/origen y limitación Git sin secretos; AGENTS contiene solo comandos acreditados y la documentación distingue simulación de verificación real.

- [ ] T41. Verificar el cierre de fase con la matriz RF y los requisitos no funcionales. (RF-1 a RF-49)
      Hecho cuando: pasan instalación reproducible, lint, format:check, typecheck, test:run, build, smoke/proxy y comprobaciones reales obligatorias; se revisan separación de estado/imports, protección de información y documentación, con evidencia por RF y sin omitir bloqueos externos.

## Orden y dependencias

La numeración define el orden de referencia; el trabajo independiente puede prepararse cuando sus dependencias estén satisfechas. No implementar varias tareas como una sola ni delegar sin instrucción explícita.

| Tarea | Depende de                        | Motivo                                                                  |
| ----- | --------------------------------- | ----------------------------------------------------------------------- |
| T1    | Ninguna                           | La instalación requiere entorno compatible.                             |
| T2    | T1                                | Manifiesto y lockfile deben resolverse con el entorno fijado.           |
| T3    | T2                                | TypeScript y tipos deben estar disponibles.                             |
| T4    | T2, T3                            | Runner y componentes requieren dependencias y resolución de tipos.      |
| T5    | T4                                | MSW se integra al ciclo del runner.                                     |
| T6    | T2, T3                            | ESLint necesita dependencias y contexto TS.                             |
| T7    | T4, T6                            | Las restricciones se verifican programáticamente.                       |
| T8    | T7                                | Amplía la frontera de imports ya probada.                               |
| T9    | T2, T4                            | Formato se demuestra con fixtures aisladas.                             |
| T10   | T6, T9                            | Los hooks invocan comandos de calidad definidos.                        |
| T11   | T3, T4                            | El esquema se construye con pruebas de validación.                      |
| T12   | T11                               | Validación de proceso consume el esquema.                               |
| T13   | T12                               | El proxy pertenece a la configuración local validada.                   |
| T14   | T4, T5                            | El normalizador se demuestra mediante casos de error.                   |
| T15   | T11, T14                          | Transporte usa entorno validado y errores comunes.                      |
| T16   | T13, T14                          | El proxy necesita reglas y modelo saneado de errores.                   |
| T17   | T15                               | Query Client se comprueba con transporte real simulado.                 |
| T18   | T7, T9, T12                       | UI permanece detrás de fronteras y estilos configurados.                |
| T19   | T11, T12, T17, T18                | Entrada compone configuración y providers.                              |
| T20   | T19                               | Build/preview necesitan aplicación mínima compilable.                   |
| T21   | T20                               | Pruebas negativas se ejercitan con procesos de aplicación completos.    |
| T22   | T2                                | Puede acreditarse disponibilidad del backend sin implementar Auth.      |
| T23   | T22                               | Snapshot necesita endpoint OpenAPI real accesible.                      |
| T24   | T4, T23                           | Validación runtime debe corresponder a tipos generados.                 |
| T25   | T5, T14, T24                      | Transporte de Auth valida contrato y conserva clasificación de errores. |
| T26   | T25                               | El plugin necesita transporte probado.                                  |
| T27   | T26                               | Estado incompleto/refetch opera sobre el atom de consulta.              |
| T28   | T27                               | Login exige estados confirmados y validación de sesión.                 |
| T29   | T28                               | El cierre se comprueba tras establecer sesión.                          |
| T30   | T29                               | Completa errores de operaciones existentes.                             |
| T31   | T30                               | Los wrappers exponen comportamiento de plugin ya probado.               |
| T32   | T31                               | Concurrencia se verifica a través de consumidores de la API pública.    |
| T33   | T32                               | Integra todos los escenarios contractuales.                             |
| T34   | T20, T21                          | Playwright necesita servidor/bundle y control de procesos comprobado.   |
| T35   | T31, T34                          | Harness integra API pública y ejecución de navegador.                   |
| T36   | T13, T16, T34                     | Proxy real de Vite se comprueba con navegador y destino controlado.     |
| T37   | T20, T34, T35                     | Bundle final debe excluir harness y abrirse en preview.                 |
| T38   | T15, T22, T34, T36                | Health acredita cliente/proxy con backend disponible.                   |
| T39   | T22, T33, T35, T36, T38, P-Auth   | El ciclo real exige contrato probado, navegador y condiciones externas. |
| T40   | T10, T21, T33, T36, T37, T38, T39 | Solo se documentan como operativos comandos y resultados comprobados.   |
| T41   | T8, T9, T17, T32, T40             | El cierre reúne verificaciones y documentación completadas.             |

### Prerrequisitos externos

- **Entorno de T1:** disponer del runtime fijado para el proyecto sin afectar otras aplicaciones. Si no está preparado, resolver su disponibilidad antes de instalar dependencias.
- **Backend de T22/T23/T38:** servicio accesible, health y OpenAPI disponibles; no modificar el backend dentro de estas tareas para hacerlo pasar.
- **P-Auth:** origen local `http://localhost:5174` permitido por el backend y cuenta exclusiva disponible. Cualquier cambio de backend requiere su propio proceso de spec/aprobación. La cuenta se proporciona previamente; nunca se versionan credenciales.
- **Git de T10:** activar el hook del proyecto solo cuando exista Git; la configuración y sus comandos pueden verificarse aisladamente. No declarar protección activa donde no lo esté.

Un prerrequisito ausente mantiene pendientes las tareas que dependan de él. No equivale a una tarea completada ni permite sustituir una comprobación real por una simulación.

## Cobertura de requisitos

T41 verifica el cierre global; la tabla identifica la tarea que incorpora o demuestra cada comportamiento, no solo la revisión final.

| RF    | Tarea                        | Evidencia                                                           |
| ----- | ---------------------------- | ------------------------------------------------------------------- |
| RF-1  | T1, T2                       | Entorno fijado e instalación frozen reproducible sin conflictos.    |
| RF-2  | T12, T21, T34                | Desarrollo en localhost:5174.                                       |
| RF-3  | T12, T21                     | Puerto ocupado rechaza inicio sin salto automático.                 |
| RF-4  | T18, T19, T34, T37           | Main/heading Inventory visibles sin backend.                        |
| RF-5  | T12, T20, T37                | Build válido y bundle verificable.                                  |
| RF-6  | T20, T37                     | Vista mínima accesible en preview.                                  |
| RF-7  | T11, T19, T21                | Configuración obligatoria ausente impide inicialización.            |
| RF-8  | T11, T21                     | Diagnóstico de nombres sin valores sensibles.                       |
| RF-9  | T11, T40                     | Ejemplos públicos e instrucciones de entorno reproducibles.         |
| RF-10 | T13, T36                     | Auth conserva ruta/método/body en proxy.                            |
| RF-11 | T13, T36                     | API de negocio y navegación no colisionan.                          |
| RF-12 | T15, T17, T22, T38           | Consumo HTTP simulado y health real no destructivo.                 |
| RF-13 | T15, T16, T36                | Fallo sin respuesta y destino indisponible vía proxy diferenciados. |
| RF-14 | T14, T15                     | Código público recibido conservado.                                 |
| RF-15 | T14, T15                     | Field errors reconocidos conservados.                               |
| RF-16 | T28, T33, T35, T39           | Login simulado y cookie/sesión en navegador real.                   |
| RF-17 | T23, T24, T26, T31, T39      | Usuario público validado y expuesto.                                |
| RF-18 | T23, T24, T26, T31, T39      | Metadatos públicos de sesión expuestos.                             |
| RF-19 | T26, T31, T32                | Pending inicial observable por múltiples consumidores.              |
| RF-20 | T26, T31, T39                | Consulta 401 confirma unauthenticated.                              |
| RF-21 | T25, T30, T31, T33           | Red/servidor distinguibles de ausencia de sesión.                   |
| RF-22 | T29, T31, T32, T39           | Logout 204 cambia inmediatamente el estado.                         |
| RF-23 | T29, T32, T39                | Sesión cerrada no reaparece por consulta posterior/tardía.          |
| RF-24 | T23, T24, T25, T33, T39      | Contrato del backend intacto y adaptación encapsulada.              |
| RF-25 | T23, T24, T25, T33, T39      | Datos públicos derivados; no campos ficticios.                      |
| RF-26 | T3                           | Fixture incorrecta falla y control válido pasa typecheck.           |
| RF-27 | T6, T7, T8, T18              | Lint y fronteras detectan casos negativos.                          |
| RF-28 | T9                           | Format check no modifica archivos.                                  |
| RF-29 | T9                           | Format write corrige el alcance acordado.                           |
| RF-30 | T4                           | Suite con fallo produce salida no cero.                             |
| RF-31 | T4                           | Watch repite pruebas durante desarrollo.                            |
| RF-32 | T4, T5, T17, T33, T34        | Suites simuladas funcionan sin backend/cuenta real.                 |
| RF-33 | T1, T10, T40                 | Instrucciones de comandos comprobados desde la raíz.                |
| RF-34 | T22, T34, T38, T39, T40      | Prerrequisitos reales documentados y faltantes diagnosticados.      |
| RF-35 | T12, T21                     | Configuración inválida rechaza dev.                                 |
| RF-36 | T12, T21                     | Configuración inválida rechaza build.                               |
| RF-37 | T11, T19, T21                | Configuración con formato inválido bloquea inicialización.          |
| RF-38 | T28, T31, T32, T33           | Login solo desde unauthenticated confirmado.                        |
| RF-39 | T28, T33                     | Rechazo de credenciales produce error específico.                   |
| RF-40 | T28, T33                     | Login rechazado mantiene unauthenticated.                           |
| RF-41 | T30, T33                     | Logout sin confirmación conserva estado/datos anteriores.           |
| RF-42 | T30, T33                     | Logout fallido permite reintento confirmado.                        |
| RF-43 | T24, T25, T27, T33           | Sesión incompleta produce error contract.                           |
| RF-44 | T24, T27, T33                | Datos incompletos no acreditan autenticación.                       |
| RF-45 | T14, T25, T36                | Error HTTP no reconocido conserva status y mensaje genérico.        |
| RF-46 | T14, T15, T16, T25, T30, T36 | Error con respuesta HTTP no se confunde con red sin respuesta.      |
| RF-47 | T27, T33                     | Sesión incompleta pasa a unconfirmed desde cualquier estado.        |
| RF-48 | T27, T31, T33                | Unconfirmed no afirma autenticación ni ausencia confirmada.         |
| RF-49 | T26, T27, T31, T33           | Refetch recupera confirmación mediante 200 válido o 401.            |

## Condición para comenzar

Solicitar aprobación de estas tareas antes de implementar T1. La aprobación del plan no marca ninguna tarea como realizada ni autoriza por sí sola cambios en el backend.
