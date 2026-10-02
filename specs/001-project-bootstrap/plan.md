# Plan 001 - Project Bootstrap

## Contexto

Implementar únicamente la Spec 001 aprobada, RF-1 a RF-49. Las referencias obligatorias son `AGENTS.md`, `docs/constitution.md`, `docs/estructura.md` y la Fase 0 de `docs/ruta.md`.

El frontend todavía no tiene `package.json`, código de aplicación, lockfile ni pruebas configuradas. Se conservarán la documentación y las configuraciones de agentes existentes. Este plan no crea la aplicación ni modifica el backend; define cómo implementar y verificar el bootstrap.

La entrega comprende una vista mínima de Inventory, configuración validada, providers, navegación inicial, cliente HTTP, infraestructura de Auth, herramientas de calidad y pruebas. No comprende login visual, App Shell, wrappers completos, guards funcionales, autorización ni operaciones de negocio.

Las dependencias de backend y cuenta de prueba ya declaradas en la spec son prerrequisitos de ejecución, no decisiones funcionales por resolver. La fase no se considerará completada únicamente con simulaciones.

### Evidencia técnica utilizada

- Backend consultado en modo lectura: `src/app.ts`, `src/features/auth/auth.config.ts`, `src/features/auth/http/auth.routes.ts`, `auth.schemas.ts`, `auth.mapper.ts`, `auth.types.ts` y Spec 005 de Authentication.
- El backend instalado utiliza Better Auth `1.7.5`, monta Auth en `/api/auth` y transforma las respuestas a DTOs públicos. El usuario incluye `role` en el contrato actual.
- Se consultaron documentación vigente mediante Context7, metadatos `engines` y `peerDependencies` del registro npm y la publicación oficial de Node.js 24.
- El código distribuido de Better Auth `1.7.5` confirma los puntos de extensión `getAtoms`, `getActions` y `fetchOptions`; su cliente React deriva hooks de los atoms registrados.
- El entorno observado tiene Node.js `22.19.0` y pnpm `11.25.0`. No coincide con el entorno objetivo indicado abajo. No se ha actualizado ni instalado nada al redactar este plan.

## Módulos y responsabilidades

Las rutas siguientes son destinos de implementación previstos, no archivos creados por este plan.

| Módulo                                                                                         | Responsabilidad                                                                                                           | RF cubiertos                                                    |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `package.json`, `pnpm-lock.yaml`, `.npmrc`, `.node-version`, `tsconfig*.json`                  | Fijar entorno y dependencias, scripts, resolución estricta, TypeScript strict y aliases.                                  | RF-1, RF-5, RF-26, RF-28 a RF-31, RF-33                         |
| `vite.config.ts`                                                                               | Validar configuración antes de servir o compilar; puertos estrictos; proxy de Auth y negocio; plugins de React y estilos. | RF-2, RF-3, RF-5, RF-6, RF-10, RF-11, RF-13, RF-35, RF-36       |
| `src/shared/config/env.schema.ts`, `env.ts`, `.env.example`                                    | Esquema puro de configuración pública, validación en proceso y navegador, errores sin valores sensibles.                  | RF-7, RF-8, RF-9, RF-35 a RF-37                                 |
| `src/main.tsx`, `src/app/router/router.tsx`, `src/app/bootstrap-page.tsx`                      | Inicializar solo con configuración válida y mostrar una única vista semántica de Inventory en `/`.                        | RF-4, RF-6, RF-7, RF-37                                         |
| `src/app/providers/app-providers.tsx`, `query.provider.tsx`, `ui.provider.tsx`                 | Componer providers globales sin acceso a detalles de librerías UI.                                                        | RF-4, RF-12, RF-27                                              |
| `src/shared/ui/provider/ui-provider.tsx`, `src/shared/ui/styles.css`, `src/shared/ui/index.ts` | Encapsular el provider y los estilos de PrimeReact/PrimeIcons; API pública propia.                                        | RF-4, RF-27                                                     |
| `src/shared/api/http-client.ts`, `api-error.ts`, `query-client.ts`                             | Transporte de negocio, credenciales, timeout, normalización de errores y configuración de server state.                   | RF-12 a RF-15, RF-45, RF-46                                     |
| `src/shared/api/generated/auth-contracts.ts`, snapshot OpenAPI acotado en `tests/contracts/`   | Tipos derivados del contrato existente de Auth y comprobación no destructiva; sin generación completa de negocio.         | RF-17, RF-18, RF-24, RF-25, RF-43, RF-44                        |
| `src/features/auth/api/auth-client.ts`, `inventory-auth-plugin.ts`, `auth-contract.ts`         | Instanciar Better Auth React Client y registrar una extensión tipada para el contrato público actual.                     | RF-16 a RF-25, RF-38 a RF-44, RF-47 a RF-49                     |
| `src/features/auth/hooks/use-auth.ts`, `use-session.ts`, `types/auth.ts`, `index.ts`           | Exponer acciones y estados propios; mantener internos SDK, transporte, atoms y validación.                                | RF-17 a RF-25, RF-38 a RF-44, RF-47 a RF-49                     |
| `eslint.config.js`, configuración de Prettier, `.husky/pre-commit`, lint-staged                | Controles de tipos, formato, hooks y fronteras de imports.                                                                | RF-26 a RF-29, RF-33                                            |
| `vitest.config.ts`, `tests/setup.ts`, `tests/mocks/`, pruebas de configuración, HTTP y Auth    | Pruebas aisladas con respuestas simuladas y detección de errores de herramientas.                                         | RF-7, RF-8, RF-13 a RF-15, RF-17 a RF-32, RF-35 a RF-49         |
| `playwright.config.ts`, `tests/browser/`                                                       | Verificar arranque, proxy y cookies en navegador real mediante harness exclusivo de pruebas.                              | RF-2 a RF-6, RF-10 a RF-13, RF-16 a RF-25, RF-34, RF-38 a RF-49 |
| `README.md`, actualización futura de comandos de `AGENTS.md`                                   | Prerrequisitos, instalación, scripts comprobados, configuración y separación de pruebas simuladas/reales.                 | RF-9, RF-33, RF-34                                              |

No se crearán features vacías, carpetas de formularios sin uso, stores de demostración ni bibliotecas completas de wrappers. Las dependencias previstas para etapas posteriores quedarán instaladas según la ruta, sin implementar esas etapas.

## Modelo de datos y contratos

### Configuración

| Variable                                | Alcance                        | Regla y valor de ejemplo                                                                                                               |
| --------------------------------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_APP_NAME`                         | Pública                        | Texto no vacío después de trim; obligatoria, sin default. Ejemplo: `Inventory`.                                                        |
| `VITE_API_URL`                          | Pública                        | Prefijo relativo de API, distinto de `/`, o URL absoluta HTTP(S) sin credenciales. Obligatoria, sin default. En local: `/api/backend`. |
| `API_PROXY_TARGET`                      | Solo proceso de herramientas   | Origen HTTP(S) sin credenciales, query ni fragmento. Default local documentado: `http://localhost:3000`. No se inyecta al bundle.      |
| `AUTH_TEST_EMAIL`, `AUTH_TEST_PASSWORD` | Solo proceso de pruebas reales | Credenciales de la cuenta previamente preparada. Nunca `VITE_*`, nunca documentación, fixtures versionadas ni logs.                    |

`env.schema.ts` será una función/esquema sin acceso a globals. Vite obtiene las variables mediante `loadEnv` y variables del proceso, selecciona únicamente las admitidas y valida antes de devolver configuración. `env.ts` utiliza el mismo esquema público al inicializar el navegador. Los errores contienen nombres de variables y motivos saneados, nunca el objeto completo de configuración.

Los tests unitarios usan valores explícitos de prueba; no dependen del `.env` personal. Se distinguirá la configuración pública necesaria para build de la cuenta opcional necesaria únicamente al ejecutar pruebas reales.

### Contrato HTTP local

| Petición desde el navegador | Destino del proxy local                                                  |
| --------------------------- | ------------------------------------------------------------------------ |
| `/api/auth/sign-in/email`   | `/api/auth/sign-in/email` en el backend                                  |
| `/api/auth/get-session`     | `/api/auth/get-session` en el backend                                    |
| `/api/auth/sign-out`        | `/api/auth/sign-out` en el backend                                       |
| `/api/backend/health`       | `/health` en el backend                                                  |
| `/api/backend/products?...` | `/products?...` en el backend, solo como prueba de enrutamiento simulada |
| `/products`                 | Navegación de frontend; no debe interceptarse como API                   |

Las reglas de proxy se limitan a `/api/auth` y `/api/backend` con límites de segmento. Solo la segunda elimina su prefijo; se conserva query string, método, cuerpo y headers pertinentes. No se crea una pantalla de productos ni una API de productos en esta fase.

El cliente HTTP de negocio usa `VITE_API_URL`, `withCredentials: true` y timeout inicial de 10 segundos. La ruta de Auth es independiente del prefijo de negocio; en local se resuelve en el mismo origen del frontend con base path `/api/auth`.

### Contrato público de Auth vigente

- Login: `POST /api/auth/sign-in/email`, email y contraseña; éxito `200`.
- Consulta: `GET /api/auth/get-session`; sesión válida `200`, ausencia o invalidez `401`.
- Logout: `POST /api/auth/sign-out`; éxito `204` sin body, incluido cierre sin sesión.
- Éxito de login/consulta: `{ data: { user: { id, email, role }, session: { id, createdAt } } }`.
- Roles recibidos actualmente: `ADMIN`, `MANAGER`, `OPERATOR`, `VIEWER`; conservar el dato no implica implementar autorización.
- Error público: `{ error: { code, message } }`, con campos adicionales solo si el contrato los define.
- La cookie es el transporte de sesión. No se construyen Authorization headers con tokens, no se lee la cookie HttpOnly y no se persisten credenciales en almacenamiento del navegador.

Los tipos de transporte se obtendrán de un snapshot de `/openapi.json` del backend disponible, acotado a Auth y health, usando `openapi-typescript`. La extracción y generación se hará de forma explícita durante la implementación; no se crea un pipeline de generación de todas las features. El snapshot permite reproducir typecheck y pruebas sin backend. Se comparará con los schemas del backend consultado antes de consumirlo; no se rellenará un contrato de OpenAPI faltante con datos inventados.

La validación de respuestas se realiza sobre `unknown` y requiere los campos obligatorios del contrato. El schema runtime verifica los tipos y formatos existentes; los tipos públicos se comprueban contra los contratos generados. No se utiliza `$Infer.Session` como contrato de Inventory porque presupone campos que el backend omite. No se fabrican `expiresAt`, token, nombre u otros campos.

### Estado público de sesión

Una unión discriminada propia representará:

| Estado            | Datos publicados                                      | Confirmación                                 |
| ----------------- | ----------------------------------------------------- | -------------------------------------------- |
| `pending`         | Sin usuario/sesión confirmados en la consulta inicial | Aún pendiente                                |
| `authenticated`   | Usuario y metadatos públicos validados                | Confirmada por backend                       |
| `unauthenticated` | Usuario y sesión nulos                                | Confirmada por consulta `401` o logout `204` |
| `unconfirmed`     | Usuario y sesión nulos; error cuando corresponda      | No se afirma autenticación ni ausencia       |

El wrapper puede derivar `isPending`, `isAuthenticated` e `isUnauthenticated` de esta unión; `unconfirmed` no se convierte en `unauthenticated` por negar un booleano. Durante refetch posterior se expone además `isRefetching`; no se copia la sesión a otro store.

Transiciones que materializan la spec:

- Consulta inicial: `pending` → `authenticated`, `unauthenticated` o `unconfirmed` con error.
- Respuesta válida: publicar únicamente datos validados y limpiar el error de esa consulta.
- Consulta `401`: eliminar datos previamente publicados y confirmar `unauthenticated`.
- Respuesta incompleta: eliminar datos publicados, exponer error de contrato y pasar a `unconfirmed`, incluso desde `authenticated`.
- Login: admitir solo `unauthenticated` confirmado; desde otros estados devolver resultado de precondición y no enviar la petición.
- Login rechazado: error de credenciales y permanencia en `unauthenticated`.
- Login válido: actualizar la sesión a partir de la respuesta pública validada; permitir nueva consulta de confirmación.
- Logout confirmado `204`: publicar `unauthenticated` sin esperar una segunda petición.
- Logout fallido: conservar estado y datos anteriores junto con el error de operación; admitir reintento. Una consulta posterior `401` puede confirmar que el backend sí cerró la sesión.
- Consulta fallida por red/servidor: exponer el error, conservar la última confirmación si existe y distinguirla de ausencia; sin confirmación previa exponer `unconfirmed`. Esto es política de conservación de información ante refetch fallido, no confirmación nueva del backend.

Las operaciones tendrán un resultado propio de éxito/error y un indicador de operación pendiente; sus errores no se interpretan como datos de sesión. Se serializan login/logout y se descartan respuestas de consultas anteriores a una operación confirmada, para que una respuesta tardía no revierta un logout. No se amplía el alcance a cambio de cuenta ni gestión de múltiples sesiones.

### Modelo de errores observables

| Categoría propia | Información                                                 | Ejemplo y tratamiento                                                      |
| ---------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------- |
| `network`        | Mensaje local saneado, sin status HTTP                      | Fetch/Axios falla sin respuesta.                                           |
| `http`           | Status HTTP y código público, si está validado              | Conservar `UNAUTHORIZED`, errores de negocio y field errors reconocidos.   |
| `http` genérico  | Status HTTP; mensaje local; sin código de negocio inventado | Error vacío, HTML u otro contenido no reconocido.                          |
| `contract`       | Operación y motivo saneado, sin payload completo            | Respuesta exitosa de sesión incompleta o JSON inválido.                    |
| `credentials`    | Status/código recibido, cuando corresponda                  | Rechazo de credenciales durante login, no ausencia de sesión por consulta. |
| `precondition`   | Estado que impide la operación, sin credenciales            | Login mientras sesión pendiente, confirmada o no confirmada.               |

Los errores HTTP comunes se normalizan en `shared/api`; Auth interpreta su significado según la operación. Un `401` de consulta y un `401` de login no producen el mismo resultado público.

Conservar field errors solo cuando tengan forma validada conforme al contrato; no interpretar strings para deducir códigos. No publicar cuerpos sin validar, stacks, headers sensibles ni configuraciones de Axios.

Cuando el backend no esté accesible a través del proxy, Vite podrá responder `502`. El proxy devolverá un error saneado con código de infraestructura reservado `PROXY_BACKEND_UNAVAILABLE`. Se conservará el status y la procedencia proxy; no se etiquetará como fallo del navegador sin respuesta. RF-13 se acredita informando la indisponibilidad del destino y RF-46 distinguiendo que sí hubo respuesta HTTP del proxy. Los fallos directos sin respuesta siguen siendo `network`.

## Decisiones técnicas

### 1. Versiones exactas compatibles, no adopción automática de latest

- Elegida: fijar las versiones de la tabla, guardar lockfile y usar instalación reproducible con `pnpm install --frozen-lockfile` una vez generado. Activar comprobación de engines y peers requeridos; no instalar peers opcionales de otros frameworks o bases de datos sin necesidad.
- Descartada: resolver rangos flotantes en cada instalación; dificulta reproducir incompatibilidades. También se descarta TypeScript 7 en este bootstrap: `typescript-eslint` consultado declara soporte `<6.1.0`.
- RF cubiertos: RF-1, RF-5, RF-26, RF-30, RF-33.

| Grupo              | Paquetes y versiones fijadas                                                                                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entorno            | Node.js `24.21.0` LTS; pnpm `12.8.1`                                                                                                                                                   |
| Core               | `react` y `react-dom` `19.3.0`; `react-router` `8.4.0`; `typescript` `5.9.3`                                                                                                           |
| Build              | `vite` `8.3.2`; `@vitejs/plugin-react` `6.1.1`                                                                                                                                         |
| Auth               | `better-auth` `1.7.5`; `nanostores` `1.5.4` exclusivamente para la extensión de atoms de Auth                                                                                          |
| Datos              | `axios` `1.20.0`; `@tanstack/react-query` `5.104.0`; `zustand` `5.0.15`                                                                                                                |
| Formularios        | `react-hook-form` `7.89.0`; `@hookform/resolvers` `5.9.1`; `zod` `4.6.5`                                                                                                               |
| UI                 | `primereact` `10.9.7`; `primeicons` `8.0.2`; `tailwindcss` y `@tailwindcss/vite` `4.3.3`                                                                                               |
| Tipos              | `@types/react` y `@types/react-dom` `19.3.0`; `@types/node` `24.19.0`                                                                                                                  |
| Pruebas            | `vitest` `5.0.3`; `jsdom` `30.1.1`; `msw` `3.0.1`; `@playwright/test` `1.63.0`                                                                                                         |
| Testing Library    | `@testing-library/react` `16.3.3`; `@testing-library/dom` `10.4.2`; `@testing-library/jest-dom` `7.0.1`; `@testing-library/user-event` `14.6.7`                                        |
| Calidad            | `eslint` `10.11.0`; `@eslint/js` `10.0.1`; `typescript-eslint` `8.71.0`; `eslint-plugin-react-hooks` `7.1.1`; `eslint-plugin-react-refresh` `0.5.7`; `eslint-config-prettier` `10.1.8` |
| Formato y hooks    | `prettier` `3.9.9`; `husky` `9.1.7`; `lint-staged` `17.6.0`                                                                                                                            |
| Contratos acotados | `openapi-typescript` `7.13.0`                                                                                                                                                          |

Better Auth se fija a la versión instalada del backend para reducir divergencias. PrimeReact 10 es una versión estable con peers React 19 comprobados y provider documentado; no se mezclan instrucciones de su API con PrimeReact 11. Elegir una versión estable compatible no obliga a usar el major más reciente.

La selección acredita disponibilidad y compatibilidad declarada, no una instalación o build ya probados. Si la instalación descubre un conflicto real, se documentará y revisará la combinación antes de implementar sobre ella; no se usarán overrides arbitrarios ni supresión de peers para declarar RF-1 cumplido.

### 2. Configuración validada en proceso y navegador

- Elegida: esquema compartido puro y validaciones en Vite y antes de montar React. Validar en `serve`, `build` y al inicializar; errores saneados. `tsconfig` activa strict y aliases `@/app`, `@/features`, `@/shared` alineados con Vite y tests.
- Descartada: validación solo en navegador; permitiría arrancar o generar una distribución inválida, contradiciendo RF-35 y RF-36.
- RF cubiertos: RF-7, RF-8, RF-9, RF-26, RF-35, RF-36, RF-37.

### 3. Desarrollo y preview locales con puerto estricto

- Elegida: `localhost:5174` con `strictPort: true` tanto en desarrollo como en preview, ejecutados de forma alternada. Reutilizar explícitamente el proxy en preview local para comprobar el bundle con el mismo backend; no convertir preview en servidor de producción.
- Descartada: salto automático a otro puerto o uso de 5173; incumple la decisión del usuario y altera el origen permitido de Auth.
- RF cubiertos: RF-2, RF-3, RF-4, RF-5, RF-6.

### 4. Proxy con separación entre páginas y API

- Elegida: reglas `/api/auth` sin rewrite y `/api/backend` con rewrite solo de ese prefijo. Preservar Origin del navegador; `changeOrigin` ajusta Host de destino, no sustituye la autorización del origen. Tratar errores de destino con respuesta saneada del proxy.
- Descartada: proxy directo de `/products`, `/inventory` y otras rutas de páginas; haría competir navegación y backend. También se descarta modificar Origin para ocultar una configuración de trusted origins faltante.
- RF cubiertos: RF-10, RF-11, RF-12, RF-13, RF-24, RF-46.

### 5. Cliente HTTP y Query Client de negocio mínimos

- Elegida: Axios encapsulado; Query Client con `staleTime` inicial de 30 segundos, sin retries automáticos iniciales ni de mutations y sin refetch al foco durante bootstrap. Valores técnicos iniciales revisables con las features, no reglas de negocio. Health se ejecuta desde una comprobación de integración, no desde una nueva feature.
- Descartada: peticiones desde componentes, stores de caché paralelos o reintentos automáticos de login/logout; mezclan responsabilidades o pueden ocultar el resultado de una operación.
- RF cubiertos: RF-12, RF-13, RF-14, RF-15, RF-32, RF-45, RF-46.

### 6. Extensión de Better Auth para su contrato público reducido

- Elegida: crear un plugin de cliente interno de Auth con los puntos documentados `getAtoms` y `getActions`. Registrar un único atom propio de sesión pública, por ejemplo `inventorySession`, y acciones de login, consulta y logout usando el `$fetch` que Better Auth entrega al plugin. El cliente React genera el hook del atom; los wrappers propios exponen `useSession` y `useAuth`.
- El atom registrado en la extensión es la única fuente activa de estado de sesión de Inventory. No montar ni consumir el hook estándar de sesión ni sus acciones estándar desde la aplicación; no copiar su estado a Zustand, TanStack Query, un contexto o estado local de componentes. La consulta inicial y las acciones actualizan ese mismo atom.
- El transporte recibe el envelope original del backend; el plugin valida y proyecta sus datos, sin modificar las respuestas del servidor. Las acciones usan métodos explícitos, `credentials: include` y timeout de 10 segundos; logout trata `204` como confirmación sin intentar parsear un body.
- Configurar el parser mediante `fetchOptions` para conservar las fechas ISO como strings: el parser por defecto de Better Auth 1.7.5 convierte fechas a `Date`, mientras que el contrato público define `createdAt` como string. El body vacío de `204` se representa como null. El transporte encapsulado puede usar `customFetchImpl` para distinguir respuestas exitosas malformadas de errores HTTP sin JSON antes del parsing del SDK; conserva el status original y no convierte fallos de parsing en falsos errores de red. Ninguna transformación agrega campos de sesión ni cambia el contrato del servidor.
- La suscripción inicial será idempotente para múltiples consumidores y React StrictMode. Compartir consultas en curso y evitar que respuestas anteriores a login/logout sobrescriban confirmaciones posteriores. Los controles de estado se hacen en las acciones, no solo en una futura UI.
- Descartada: utilizar directamente el `useSession` estándar con el DTO envuelto o forzar tipos completos del SDK mediante casts; su forma y metadatos no coinciden. Se descarta parchear `node_modules`, importar internos distribuidos del SDK o añadir campos ficticios. También se descarta reemplazar Better Auth por una gestión de sesión independiente.
- RF cubiertos: RF-16 a RF-25, RF-38 a RF-44, RF-47 a RF-49.

El prototipo contractual de esta extensión se verificará primero con MSW: hooks generados, inicialización, `$fetch`, status `401`, body ausente `204` y ciclo completo. Solo después se conecta al backend. No se declara compatible únicamente porque TypeScript compile. Si los puntos públicos no permiten cumplir el contrato con la versión fijada, se detiene esa implementación y se informa el bloqueo; no se cambia la spec ni el backend silenciosamente.

### 7. UI mínima y providers detrás de sus fronteras

- Elegida: una página con `<main>`, título de Inventory y texto estático de bootstrap. AppProviders compone QueryProvider, UiProvider y router. El provider real y los imports CSS de PrimeReact/PrimeIcons viven en `shared/ui`; el provider de app consume su API propia.
- PrimeReact utiliza su modo styled y tema empaquetado en la versión 10 dentro de `shared/ui/styles.css`. Tailwind 4 se integra con su plugin Vite para utilidades; no usar el preset Tailwind de PrimeReact 10 que presupone otra configuración de Tailwind. Evitar aplicar resets incompatibles a componentes sin revisar su efecto; los tokens y wrappers completos pertenecen a la Fase 1.
- Durante la implementación revisar la vista mínima con Impeccable, semántica, legibilidad y responsive sin convertirla en dashboard. No montar Auth en la página estática para que su apertura no requiera backend disponible.
- Descartada: diseñar App Shell, login, catálogo de wrappers o estados interactivos de negocio en esta fase; amplía el alcance aprobado.
- RF cubiertos: RF-4, RF-6, RF-27.

### 8. Calidad verificable, incluidos casos negativos

- Elegida: ESLint flat config con restricciones para imports raíz y subpaths de PrimeReact/PrimeIcons fuera de `shared/ui`, Better Auth fuera de `features/auth`, Axios fuera del transporte HTTP y deep imports externos de features. Incluir imports de tipos y CSS; para imports relativos, comprobar el destino resuelto o añadir una regla local acotada si los patrones no bastan.
- Probar la configuración mediante `ESLint.lintText` con nombres de archivo representativos; no dejar archivos deliberadamente inválidos en `src`. Typecheck y herramientas se prueban con fixtures aisladas con fallo conocido. Prettier check no escribe; format sí escribe dentro de globs documentados.
- Husky y lint-staged ejecutan verificaciones de archivos preparados cuando exista repositorio Git. Actualmente no hay `.git` en el frontend: la ausencia se informa y no se considera un hook instalado. No inicializar Git como efecto oculto; los comandos de calidad funcionan independientemente del hook y su activación se documenta al disponer de Git.
- Descartada: comprobar solo que la configuración existe o que el código limpio pasa; no acredita que detecte los incumplimientos exigidos por RF-26 a RF-30.
- RF cubiertos: RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-33.

### 9. Pruebas aisladas y navegador real sin pantalla de login

- Elegida: Vitest/jsdom/Testing Library con MSW en Node para contratos y hooks; Playwright Chromium para smoke de ejecución, proxy y ciclo real de cookies. El harness bajo `tests/browser` monta consumidores de la API pública de Auth sin formularios ni rutas de negocio, y solo se sirve en modo de prueba local. Se excluye del build de aplicación.
- El harness permite ejecutar acciones y observar estados mediante la API pública de la feature. Las credenciales se reciben en memoria desde el proceso de pruebas, no mediante variables públicas. Desactivar trace, vídeo, capturas y logging de payloads en la suite real de Auth; los errores y reportes no deben incluir los argumentos de credenciales.
- Las pruebas reales usan la cuenta existente en un contexto de navegador aislado. Confirmar primero ausencia de sesión, ejecutar login, consulta, logout y consulta `401`; cerrar la sesión de prueba en cleanup cuando sea posible. No registrar usuarios ni modificar productos. Documentar efectos limitados a creación/cierre de esa sesión de prueba.
- Descartada: construir una pantalla de login para poder probarla, validar cookies solo con mocks o usar un request client aislado como única evidencia del comportamiento del navegador.
- RF cubiertos: RF-2 a RF-6, RF-10 a RF-25, RF-32, RF-34, RF-38 a RF-49.

### 10. Scripts y documentación reproducibles

- Elegida: scripts en la tabla siguiente, ejecutables desde la raíz y sin sintaxis dependiente de Bash. Una suite de pruebas sin casos falla; la suite real sin credenciales falla explícitamente al invocarla, no se marca pasada mediante skip. Las comprobaciones simuladas no requieren backend.
- Descartada: comandos nominales sin ejecución demostrada, ausencia de tests tratada como éxito o uso de `.env` personal como dependencia de la suite aislada.
- RF cubiertos: RF-1, RF-5, RF-6, RF-9, RF-26 a RF-34.

| Comando previsto                    | Comportamiento                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`    | Instalación reproducible una vez generado el lockfile.                               |
| `pnpm dev`                          | Vite en localhost:5174, configuración validada y puerto estricto.                    |
| `pnpm lint`                         | ESLint sobre fuentes y herramientas; exit no cero ante errores.                      |
| `pnpm format`                       | Prettier write sobre globs documentados, sin tocar archivos generados ni artefactos. |
| `pnpm format:check`                 | Prettier check sobre el mismo alcance, sin escribir.                                 |
| `pnpm typecheck`                    | TypeScript sin emisión para aplicación, herramientas y pruebas.                      |
| `pnpm test`                         | Vitest watch con suites simuladas.                                                   |
| `pnpm test:run`                     | Vitest run; finaliza con resultado de pruebas.                                       |
| `pnpm build`                        | Typecheck y Vite build con validación previa de configuración.                       |
| `pnpm preview`                      | Preview del build existente en localhost:5174, de forma alternada con dev.           |
| `pnpm test:e2e`                     | Playwright para comprobaciones de bootstrap; no workflows de negocio.                |
| `pnpm test:e2e --project=auth-real` | Solo ciclo real de Auth, con prerrequisitos y credenciales privadas.                 |

Playwright separará los proyectos `bootstrap-smoke`, `proxy-contract` y `auth-real`. El proyecto real se invocará explícitamente; la ejecución habitual de smoke no dependerá de una cuenta. La selección de proyectos por defecto se fijará en configuración/CLI para que no se ejecute Auth real accidentalmente. El comando específico de cierre de fase incluirá los tres proyectos y conservará evidencia del resultado de cada uno.

`README.md` documentará instalación de Chromium, versiones, ejemplos públicos de entorno, preparación externa de la cuenta, backend activo, configuración de trusted origin, efectos de las pruebas y comandos de cierre. `AGENTS.md` se actualizará durante implementación solo con comandos comprobados.

## Estrategia de pruebas

Diseñar fixtures y expectativas antes de implementar cada comportamiento. Las siguientes filas cubren todos los RF; ninguna requiere depender de detalles DOM de PrimeReact.

| RF                  | Prueba                                                                                   | Nivel                  | Evidencia esperada                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- |
| RF-1                | Instalación con entorno fijado y lockfile; repetir frozen installation.                  | Proceso                | Sin conflictos de peers requeridos; lockfile no cambia.                                                 |
| RF-2, RF-3          | Arrancar en 5174; repetir con listener de prueba ocupando ese puerto.                    | Proceso + navegador    | URL acordada; segundo arranque falla sin saltar de puerto.                                              |
| RF-4                | Abrir `/` con configuración válida y backend apagado.                                    | Componente + navegador | Main y heading Inventory visibles, sin error de arranque ni dependencia de Auth.                        |
| RF-5, RF-6          | Ejecutar build y abrir preview de ese bundle.                                            | Proceso + navegador    | Build exitoso; vista mínima visible, sin artefactos de harness.                                         |
| RF-7, RF-8          | Omitir cada variable pública obligatoria y usar valores inválidos.                       | Unitario + componente  | Inicialización bloqueada; nombres y mensajes saneados, sin valores secretos.                            |
| RF-9                | Seguir instrucciones de entorno desde directorio limpio de comprobación.                 | Manual/documental      | Variables y ejemplos suficientes para arrancar sin valores personales documentados.                     |
| RF-10               | Enviar operaciones Auth a backend simulado y comprobar path, método y body.              | Proxy + navegador      | `/api/auth` se conserva exactamente.                                                                    |
| RF-11               | Navegar a `/products` y pedir `/api/backend/products` contra backend simulado.           | Proxy + navegador      | Página no proxyada; petición API llega a `/products`; query string preservada.                          |
| RF-12               | Consultar `/api/backend/health` del backend real sin mutaciones.                         | Integración real       | Resultado de health consumible desde el navegador/cliente HTTP.                                         |
| RF-13               | Backend ausente: fallo sin respuesta y fallo de destino vía proxy.                       | MSW + proxy            | Error de red o indisponibilidad vía HTTP 502 claramente observable; no éxito ni espera infinita.        |
| RF-14, RF-15        | Devolver código público y field errors con forma admitida.                               | Unitario + MSW         | Código, status y campos se conservan sin dependencia de texto del mensaje.                              |
| RF-16               | Login real con cuenta exclusiva; siguiente petición autenticada.                         | Navegador real         | Cookie aplicada por navegador y sesión válida; sin publicar cookie ni contraseña.                       |
| RF-17, RF-18        | Consulta válida simulada y real.                                                         | Hook + navegador       | Usuario y metadatos públicos coinciden con contrato, incluido role recibido.                            |
| RF-19               | Retardar consulta inicial antes de responder.                                            | Hook + MSW             | Pending observable antes de resolución.                                                                 |
| RF-20               | Consulta 401 inicial y posterior a sesión válida.                                        | Hook + MSW             | Unauthenticated confirmado; datos previos eliminados.                                                   |
| RF-21               | Login, consulta y logout con fallos de red y servidor.                                   | Hook + MSW             | Error observable distinguible de consulta sin sesión.                                                   |
| RF-22, RF-23        | Logout 204 seguido de consulta; repetir en navegador real.                               | Hook + navegador       | Estado cambia inmediatamente; consulta posterior no autentica con sesión cerrada.                       |
| RF-24, RF-25        | Contrato reducido con envelope, sin token ni expiresAt; comprobar snapshot.              | Contrato + MSW         | No se cambia respuesta backend ni se fabrican campos; proyección pública validada.                      |
| RF-26               | Fixture con error de tipos y código válido de control.                                   | Proceso                | Typecheck falla para fixture inválida y pasa para válido.                                               |
| RF-27               | Fixtures virtuales con imports raíz, subpaths, CSS, tipos y deep imports externos.       | ESLint programático    | Incumplimientos detectados; import interno autorizado pasa.                                             |
| RF-28, RF-29        | Fixture mal formateada: check y luego write en área aislada.                             | Proceso                | Check no modifica; write corrige; segunda comprobación pasa.                                            |
| RF-30, RF-31        | Suite fixture con fallo; modo run y smoke de watch.                                      | Proceso                | Exit no cero al fallar; watch repite con cambio y se detiene explícitamente.                            |
| RF-32               | Ejecutar suite simulada con backend apagado y sin credenciales reales.                   | Integración aislada    | Todas sus pruebas se ejecutan de forma independiente.                                                   |
| RF-33, RF-34        | Recorrer comandos y checklist de README/AGENTS; invocar suite real sin prerrequisitos.   | Manual + proceso       | Comandos reproducibles; ausencia de cuenta/backend produce diagnóstico sin marcar la suite como pasada. |
| RF-35, RF-36, RF-37 | Ejecutar dev y build con entorno inválido; inicializar navegador con fixture inválida.   | Proceso + componente   | Rechazo en los tres puntos y error saneado.                                                             |
| RF-38               | Invocar login desde pending, authenticated y unconfirmed.                                | Hook + MSW             | Sin petición de login; error de precondición. Solo unauthenticated confirmado lo admite.                |
| RF-39, RF-40        | Login 401 desde unauthenticated.                                                         | Hook + MSW             | Error credentials y permanencia en unauthenticated; no sesión nueva.                                    |
| RF-41, RF-42        | Logout de sesión válida falla; reintentar con 204 o consultar 401.                       | Hook + MSW             | Estado previo y error conservados al fallo; recuperación coherente al confirmar backend.                |
| RF-43, RF-44        | Omitir cada campo obligatorio y devolver JSON inválido con éxito HTTP.                   | Contrato + hook        | Error contract, sin publicar payload incompleto ni datos fabricados.                                    |
| RF-45, RF-46        | Responder error vacío/HTML/desconocido y provocar fallo sin respuesta.                   | HTTP + MSW             | Error HTTP conserva status; network no tiene respuesta HTTP; sin mostrar cuerpo crudo.                  |
| RF-47, RF-48, RF-49 | Sesión incompleta inicialmente y después de authenticated; repetir con 200 válido y 401. | Hook + MSW             | Unconfirmed, ambos booleanos de confirmación falsos, refetch disponible y salida correcta del estado.   |

### Acreditación adicional de requisitos no funcionales

- Assert de ausencia de token, expiresAt, cookie y contraseña en datos públicos, errores y reportes; `createdAt` conserva el formato string definido por el contrato a través del parser del cliente.
- Análisis de imports y revisión de stores: ninguna sesión en Zustand/TanStack Query; atoms y tipos SDK confinados a Auth.
- Render de múltiples consumidores y StrictMode para comprobar fuente única y ausencia de consultas iniciales duplicadas innecesarias.
- Prueba de respuesta tardía de consulta tras logout para evitar resurrección del estado anterior.
- Comprobación de ausencia del harness y referencias a credenciales de prueba en el bundle de aplicación.
- Revisión de legibilidad, semántica y responsive de la vista mínima con Impeccable durante implementación.

### Cierre de fase

1. Ejecutar instalación reproducible y los comandos de lint, format:check, typecheck, test:run y build.
2. Comprobar dev, conflicto de puerto, preview y pruebas de proxy; no reutilizar ni detener los procesos de las otras aplicaciones.
3. Ejecutar el ciclo de Auth real con backend y cuenta exclusivos preparados; conservar evidencia saneada del resultado.
4. Comparar la matriz anterior con las pruebas y comprobaciones realizadas; registrar bloqueos sin declarar RF como cumplidos por intención.
5. Actualizar instrucciones con comandos efectivamente comprobados. La evidencia simulada no sustituye las comprobaciones reales obligatorias.

Este orden es una estrategia de validación, no una división en tareas de implementación.

## Riesgos y dudas abiertas

- **Dudas funcionales:** ninguna nueva; no se cambia la spec aprobada.
- **Entorno:** actualizar a Node.js y pnpm fijados es prerrequisito de implementación. El Node actualmente instalado no satisface engines de todas las versiones seleccionadas. Este plan no modifica el entorno global ni el runtime de otra aplicación.
- **Backend:** confirmar puerto efectivo y `BETTER_AUTH_URL`. La configuración consultada solo permite su propio origen; aceptar `http://localhost:5174` exige un cambio separado y aprobado en el backend. No se reescribe Origin ni se cambia su contrato para evitar esta dependencia.
- **Cuenta:** debe existir una cuenta exclusiva antes del ciclo real. Su falta bloquea esa comprobación; no autoriza crearla automáticamente ni exponer sus credenciales.
- **OpenAPI:** obtener snapshot real requiere backend disponible. Los tipos generados no se sustituyen por DTOs manuales silenciosamente; un contrato que difiera de los schemas consultados se informa antes de continuar.
- **Plugin de Auth:** los puntos de extensión están documentados y presentes en 1.7.5, pero el comportamiento completo debe acreditarse mediante pruebas del cliente React. No hay prototipo ejecutado todavía.
- **Git/Husky:** el frontend aún no es repositorio Git. Se configura el comportamiento previsto, se verifica calidad por CLI y se documenta la activación del hook al disponer de Git; no se presenta como protección ya activa.
- **Preview:** es una comprobación local del bundle, no configuración de hosting de producción. El puerto 5174 no puede estar ocupado simultáneamente por dev y preview.
- **Versiones:** la matriz está fijada con metadatos consultados, no con instalación real. Los cambios posteriores de versiones relevantes requieren actualizar esta decisión y repetir los checks afectados.

### Fuentes técnicas de referencia

- [Better Auth: client](https://www.better-auth.com/docs/concepts/client).
- [Better Auth: plugins](https://www.better-auth.com/docs/concepts/plugins).
- [Better Auth: integración Hono](https://www.better-auth.com/docs/integrations/hono).
- [Vite: configuración y loadEnv](https://vite.dev/config/).
- [Vite: server proxy](https://vite.dev/config/server-options.html#server-proxy).
- [Vite: preview](https://vite.dev/config/preview-options.html).
- [PrimeReact 10: configuración](https://primereact.org/configuration/).
- [Node.js 24: publicación oficial consultada](https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt).
- Versiones y engines: registro npm para cada paquete de la matriz; confirmar esa resolución al generar el lockfile.
