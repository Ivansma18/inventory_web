# Validación de cierre — Spec 001 Project Bootstrap

**Fecha:** 2026-10-06  
**Veredicto:** spec cumplida para el alcance aprobado de Fase 0.  
**Entorno:** Node.js `24.21.0`, pnpm `12.8.1`, Chromium; backend existente `inventary-api` en `http://localhost:3000`.

La matriz se basa en las suites ejecutadas y en las verificaciones específicas registradas en las tareas. Los checks de cierre pasaron: instalación frozen, lint, format check, typecheck, 111 pruebas unitarias, startup/hooks y build. Playwright pasó con 3 E2E predeterminadas, preview (1), health real (1) y Auth real (2). El backend respondió health HTTP 200 y OpenAPI documentó sign-out `204/400/403/500`. La API que ya estaba escuchando no fue iniciada ni detenida por esta validación; Playwright dejó libre el puerto `5174`.

## Matriz de requisitos funcionales

| RF    | Evidencia                                                                                                                                                       | Resultado | Brecha |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------ |
| RF-1  | `pnpm install --frozen-lockfile` con Node/pnpm fijados; lockfile permaneció sin cambios.                                                                        | Pasa      | —      |
| RF-2  | `pnpm test:e2e`: Vite inició en `http://localhost:5174`; pasó `inventory.bootstrap-smoke.spec.ts`.                                                              | Pasa      | —      |
| RF-3  | `pnpm verify:startup`: el listener aislado en 5174 provoca rechazo sin salto de puerto.                                                                         | Pasa      | —      |
| RF-4  | `inventory.bootstrap-smoke.spec.ts` verifica `main`, heading Inventory y copy; `preview-smoke` vuelve a comprobar la vista.                                     | Pasa      | —      |
| RF-5  | `pnpm build` completó typecheck y build de Vite; 249 módulos transformados.                                                                                     | Pasa      | —      |
| RF-6  | `pnpm test:e2e --project=preview-smoke` sirve el bundle y pasa el smoke; también existe evidencia directa de `pnpm preview` en T20.                             | Pasa      | —      |
| RF-7  | `env-schema.test.ts`, `app-bootstrap.test.tsx` y `pnpm verify:startup` comprueban configuración obligatoria y bloqueo de inicialización.                        | Pasa      | —      |
| RF-8  | `env-schema.test.ts` y startup comprueban diagnóstico de variable inválida sin divulgar su valor.                                                               | Pasa      | —      |
| RF-9  | `README.md` contiene `.env.example`, valores requeridos y ejemplos locales sin credenciales.                                                                    | Pasa      | —      |
| RF-10 | `vite-proxy.test.ts` y el E2E `proxy-contract` comprueban que Auth conserva `/api/auth`, método, body y Origin.                                                 | Pasa      | —      |
| RF-11 | `vite-proxy.test.ts` y `proxy-contract` comprueban rewrite acotado de `/api/backend` y que rutas de página no se interceptan.                                   | Pasa      | —      |
| RF-12 | `pnpm test:e2e --project=health-real`: GET real a `/health` a través de HTTP client y proxy; resultado `ok`.                                                    | Pasa      | —      |
| RF-13 | `api-error.test.ts`, `http-client.test.ts`, `vite-proxy.test.ts` y `proxy-contract` verifican red y destino upstream no disponible con respuesta saneada `502`. | Pasa      | —      |
| RF-14 | `api-error.test.ts` verifica conservación del código público y status HTTP.                                                                                     | Pasa      | —      |
| RF-15 | `api-error.test.ts` conserva `fieldErrors` validados y descarta los malformados.                                                                                | Pasa      | —      |
| RF-16 | `auth-real`: login `200` en Chromium aislado y cookie HttpOnly recibida en el navegador.                                                                        | Pasa      | —      |
| RF-17 | `auth-contract.test.ts`, `auth-session-plugin.test.tsx` y `auth-real` validan/exponen el usuario público recibido.                                              | Pasa      | —      |
| RF-18 | Contrato generado y `auth-real` verifican metadatos públicos de sesión, incluido `createdAt` ISO.                                                               | Pasa      | —      |
| RF-19 | `auth-session-plugin.test.tsx` observa `pending` antes de resolver la consulta inicial.                                                                         | Pasa      | —      |
| RF-20 | `auth-session-plugin.test.tsx` y `auth-real` confirman `unauthenticated` por respuesta `401`.                                                                   | Pasa      | —      |
| RF-21 | `auth-session-plugin.test.tsx`, `auth-public-api.test.tsx` y `api-error.test.ts` distinguen red/servidor de ausencia de sesión.                                 | Pasa      | —      |
| RF-22 | `auth-session-plugin.test.tsx` comprueba transición inmediata por `204`; `auth-real` recibe `204` y actualiza el estado.                                        | Pasa      | —      |
| RF-23 | `auth-real` verifica GET posterior `401` y cookie eliminada; la prueba de concurrencia descarta una respuesta de sesión obsoleta.                               | Pasa      | —      |
| RF-24 | Snapshot OpenAPI real, tipos generados, `openapi-contract.test.ts` y OpenAPI activo del backend concuerdan.                                                     | Pasa      | —      |
| RF-25 | `auth-contract.test.ts` y Auth real validan/proyectan solo los campos públicos disponibles; no fabrican token ni `expiresAt`.                                   | Pasa      | —      |
| RF-26 | `pnpm typecheck` pasa; `verify-typescript-config.mjs` comprueba strict, aliases y rechazo de fixtures con tipos inválidos.                                      | Pasa      | —      |
| RF-27 | `pnpm lint` pasa; `verify-eslint-config.mjs` rechaza imports arquitectónicos inválidos y acepta controles.                                                      | Pasa      | —      |
| RF-28 | `pnpm format:check` pasa sin escribir; `verify-prettier-config.mjs` prueba check sobre fixture malformada.                                                      | Pasa      | —      |
| RF-29 | `pnpm format` se ejecutó en T9; su fixture aislada demuestra write corrector y check posterior.                                                                 | Pasa      | —      |
| RF-30 | `pnpm test:run`: 16 archivos y 111 pruebas pasaron; T4 verificó exit no-cero con una fixture fallida.                                                           | Pasa      | —      |
| RF-31 | T4 verificó `pnpm test` en watch y una reejecución al cambiar una fixture.                                                                                      | Pasa      | —      |
| RF-32 | `pnpm test:run` usa MSW; `pnpm test:e2e` pasó con backend simulado controlado y harness Auth simulado, sin cuenta personal.                                     | Pasa      | —      |
| RF-33 | README y AGENTS listan instalación y comandos verificados; se validó que los nombres pnpm corresponden a scripts de `package.json`.                             | Pasa      | —      |
| RF-34 | README separa prerrequisitos de health real y Auth real; el preflight real de Auth pasó con cuenta privada.                                                     | Pasa      | —      |
| RF-35 | `pnpm verify:startup`: Vite rechaza configuración pública inválida antes de arrancar.                                                                           | Pasa      | —      |
| RF-36 | `pnpm verify:startup`: build con configuración pública inválida es rechazado.                                                                                   | Pasa      | —      |
| RF-37 | `vite-config.test.ts`, `app-bootstrap.test.tsx` y startup comprueban bloqueo de valores malformados antes de inicializar.                                       | Pasa      | —      |
| RF-38 | `auth-session-plugin.test.tsx` y `auth-public-api.test.tsx` impiden login desde pending, authenticated o unconfirmed.                                           | Pasa      | —      |
| RF-39 | `auth-session-plugin.test.tsx` simula rechazo `401` como error de credenciales diferenciado.                                                                    | Pasa      | —      |
| RF-40 | `auth-session-plugin.test.tsx` y ciclo público MSW mantienen el estado `unauthenticated` tras credenciales rechazadas.                                          | Pasa      | —      |
| RF-41 | `auth-session-plugin.test.tsx` y `auth-public-api.test.tsx` conservan sesión/datos al fallar logout; sin falso cierre.                                          | Pasa      | —      |
| RF-42 | `auth-public-api.test.tsx` reintenta logout tras `503`, confirma `204` y consulta posterior `401`.                                                              | Pasa      | —      |
| RF-43 | `auth-contract.test.ts` y `auth-session-plugin.test.tsx` clasifican respuestas incompletas como error de contrato.                                              | Pasa      | —      |
| RF-44 | `auth-session-plugin.test.tsx` elimina datos incompletos y no los publica como sesión autenticada.                                                              | Pasa      | —      |
| RF-45 | `api-error.test.ts` comprueba cuerpos vacíos/HTML/desconocidos como HTTP genérico con status conservado y sin body crudo.                                       | Pasa      | —      |
| RF-46 | `api-error.test.ts`, `http-client.test.ts` y `vite-proxy.test.ts` distinguen respuesta HTTP del fallo sin respuesta.                                            | Pasa      | —      |
| RF-47 | `auth-session-plugin.test.tsx` pone sesión en `unconfirmed` por respuesta incompleta desde estado inicial o autenticado.                                        | Pasa      | —      |
| RF-48 | Las pruebas de `unconfirmed` verifican user/session nulos y ambos indicadores de confirmación falsos.                                                           | Pasa      | —      |
| RF-49 | `auth-session-plugin.test.tsx` comprueba refetch disponible y recuperación por respuesta válida `200` o `401`.                                                  | Pasa      | —      |

## Requisitos no funcionales

| Área                   | Estado | Evidencia                                                                                                                                                                                                                                        |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Arquitectura e imports | Pasa   | `pnpm lint`, reglas ESLint positivas/negativas, `features/auth` solo mediante su API pública y Better Auth encapsulado dentro de Auth.                                                                                                           |
| Ownership del estado   | Pasa   | Sesión vive en atoms del plugin Better Auth/Auth; `useSession` la consume. La feature no copia sesión a Zustand ni a TanStack Query.                                                                                                             |
| Secretos y privacidad  | Pasa   | `.env` está ignorado; `.env.example` tiene credenciales vacías; las variables `AUTH_TEST_*` se cargan solo para el proyecto explícito y se excluyen del entorno Vite. Auth real desactiva captura/trace/video y observa solo metadatos saneados. |
| Contratos              | Pasa   | Snapshot OpenAPI de Auth/health y tipos generados validados contra `/openapi.json`; sign-out registra error público sin cambiar la respuesta exitosa `204`.                                                                                      |
| Aislamiento de pruebas | Pasa   | Unitarias usan MSW; proxy E2E usa backend controlado; los smoke no dependen de una cuenta personal. Health/Auth reales se separan por selección de proyecto.                                                                                     |
| Datos y side effects   | Pasa   | Auth real usa cuenta existente, inicia y cierra sesión; no crea usuarios ni modifica datos de negocio. La sesión final respondió `401`.                                                                                                          |
| UX mínima y semántica  | Pasa   | Chromium verifica `main` y heading `Inventory`; T19 registra revisión Impeccable desktop/mobile y ausencia de overflow.                                                                                                                          |
| Entorno reproducible   | Pasa   | Instalación frozen y verificaciones con Node `24.21.0`/pnpm `12.8.1`; startup verifica el puerto estricto y no reutiliza procesos existentes.                                                                                                    |
| Hooks Git              | Pasa   | `pnpm verify:hooks` pasó en un repositorio temporal aislado; si no existe `.git`, el hook no se declara activo y permanecen los checks CLI.                                                                                                      |

## Casos límite y criterios de cierre

Pasaron la validación los casos de configuración ausente/inválida, puerto `5174` ocupado, backend upstream no disponible, errores HTTP genéricos y errores de red, respuesta de sesión incompleta, credenciales rechazadas, logout fallido y retry, sesión tardía tras logout, ausencia de cookie y consulta posterior al logout. `health-real` y `auth-real` pasaron contra el backend local activo sin detenerlo; el frontend no dejó listener en `5174`. La instalación, calidad, pruebas, build, smoke/proxy, preview y verificaciones reales obligatorias quedan acreditados arriba.

**Brechas de los RF-1–RF-49:** ninguna. Las funciones de negocio, login visual, autorización y despliegue siguen fuera del alcance de esta spec, conforme a la sección “Fuera de alcance”.
