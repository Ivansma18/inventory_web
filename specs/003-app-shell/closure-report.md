# Cierre y validación — Spec 003 App Shell

**Fecha:** 2026-10-14  
**Veredicto:** **spec cumplida**. Los RF-1–RF-65 y NFR-1–NFR-10 tienen evidencia automatizada o manual; no quedan brechas abiertas.

## Comprobaciones de cierre

| Comando/comprobación | Resultado |
| --- | --- |
| `pnpm lint` | Aprobado; incluye el verificador de fronteras ESLint. |
| `pnpm format:check` | Aprobado; Prettier valida también su configuración. |
| `pnpm typecheck` | Aprobado; strict mode y aliases verificados. |
| `pnpm test:run` | 40 archivos, 282 pruebas aprobadas. |
| `pnpm build` | Aprobado; 428 módulos transformados. Aviso: chunk JS principal de 626.57 kB (188.37 kB gzip), sobre el umbral de 500 kB. |
| `pnpm test:e2e` | 56/56 aprobadas: bootstrap-smoke, proxy-contract y auth-harness. |
| `pnpm test:e2e --project=design-system --workers=1` | 7/7 aprobadas. |
| `pnpm test:e2e --project=preview-smoke` | 2/2 aprobadas; bundle y rutas de producción verificados. |
| `pnpm exec prettier --check "specs/003-app-shell/closure-report.md" "specs/003-app-shell/tasks.md"` | Aprobado. |

La primera ejecución completa de `pnpm test:e2e` tuvo un fallo aislado en `dialog.scroll`: el `window.scrollY` cambió 2 px (357→359). La prueba pasó al ejecutarla aislada y la ejecución completa posterior pasó 56/56. No se reprodujo en la suite final. En `proxy-contract`, Vite registró el `ECONNREFUSED` esperado después de que la propia prueba detuviera su backend ficticio; el caso verificó el 502 normalizado y pasó.

## Matriz funcional RF-1–RF-65

| RF | Evidencia | Resultado | Brecha |
| --- | --- | --- | --- |
| RF-1 | `tests/browser/app-layout.bootstrap-smoke.spec.ts`; `inventory.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-2 | `app-layout.bootstrap-smoke.spec.ts`; `app-header.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-3 | `tests/app-shell/pages.test.tsx`; `app-pages.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-4 | `pages.test.tsx` y `inventory.bootstrap-smoke.spec.ts` comprueban ausencia de métricas/tabla ficticia | Pasa | — |
| RF-5 | `pages.test.tsx`; `session-state.test.tsx`; encabezados nivel 1 en E2E | Pasa | — |
| RF-6 | `tests/app-shell/router.test.tsx`; catálogo de navegación de un solo destino en `app-layout.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-7 | `router.test.tsx`; Inicio resuelto en `/` | Pasa | — |
| RF-8 | `inventory.bootstrap-smoke.spec.ts`; `preview-smoke.preview-smoke.spec.ts` | Pasa | — |
| RF-9 | `tests/app-shell/router.test.tsx`; `navigation-keyboard.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-10 | `router.test.tsx`; `app-layout.bootstrap-smoke.spec.ts` verifica `aria-current` y su ausencia en 404 | Pasa | — |
| RF-11 | `navigation-history.bootstrap-smoke.spec.ts` verifica entrada directa y recarga | Pasa | — |
| RF-12 | `navigation-history.bootstrap-smoke.spec.ts` verifica Atrás/Adelante | Pasa | — |
| RF-13 | `tests/app-shell/pages.test.tsx`; `navigation-history.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-14 | `pages.test.tsx`; retorno a Inicio desde 404 en E2E | Pasa | — |
| RF-15 | `app-layout.bootstrap-smoke.spec.ts`; `shell-preferences.test.ts` | Pasa | — |
| RF-16 | `navigation-keyboard.bootstrap-smoke.spec.ts`; revisión Narrator + Chromium en `review-t40.md` | Pasa | — |
| RF-17 | `app-layout.bootstrap-smoke.spec.ts` y `navigation-keyboard.bootstrap-smoke.spec.ts` comprueban Tooltip por foco/puntero | Pasa | — |
| RF-18 | `shell-preferences.test.ts`; `shell-preferences.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-19 | `shell-preferences.test.ts`; valor predeterminado expandido | Pasa | — |
| RF-20 | `shell-preferences.test.ts` cubre JSON inválido y fallos de lectura/escritura | Pasa | — |
| RF-21 | `app-layout.bootstrap-smoke.spec.ts` comprueba panel compacto inicialmente cerrado | Pasa | — |
| RF-22 | `app-layout.bootstrap-smoke.spec.ts`; `navigation-keyboard.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-23 | `drawer.contract.bootstrap-smoke.spec.ts`; `drawer.test.tsx` | Pasa | — |
| RF-24 | `drawer.contract.bootstrap-smoke.spec.ts` prueba Tab y Mayús+Tab | Pasa | — |
| RF-25 | `drawer.contract.bootstrap-smoke.spec.ts` verifica inert/aria-hidden y bloqueo exterior | Pasa | — |
| RF-26 | `drawer.contract.bootstrap-smoke.spec.ts` prueba botón, Escape y fondo | Pasa | — |
| RF-27 | `drawer.contract.bootstrap-smoke.spec.ts` verifica retorno al activador | Pasa | — |
| RF-28 | `app-layout.bootstrap-smoke.spec.ts` verifica cierre al elegir Inicio | Pasa | — |
| RF-29 | `app-layout.bootstrap-smoke.spec.ts` verifica foco en el heading al navegar desde 404 | Pasa | — |
| RF-30 | `app-layout.bootstrap-smoke.spec.ts` comprueba que abrir/cerrar conserva la preferencia | Pasa | — |
| RF-31 | `session-recovery.bootstrap-smoke.spec.ts`; `session-boundary.test.tsx` | Pasa | — |
| RF-32 | `session-boundary.test.tsx` y `session-recovery.bootstrap-smoke.spec.ts` verifican que no aparece contenido protegido antes de confirmar sesión | Pasa | — |
| RF-33 | `tests/app-shell/public-identity.test.tsx`; `app-header.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-34 | `public-identity.test.tsx` verifica fallback «Usuario» sin relajar el contrato HTTP | Pasa | — |
| RF-35 | `tests/app-shell/router.test.tsx`; `session-recovery.bootstrap-smoke.spec.ts` verifica prioridad de 401 sobre 404 | Pasa | — |
| RF-36 | `session-state.test.tsx`; `auth-layout.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-37 | `session-state.test.tsx` verifica ausencia de navegación, enlaces de login y formularios | Pasa | — |
| RF-38 | `auth-session-plugin.test.tsx`; `session-boundary.test.tsx`; `session-recovery.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-39 | `session-boundary.test.tsx`; acción Reintentar en `session-recovery.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-40 | `auth-session-plugin.test.tsx`; `session-focus.bootstrap-smoke.spec.ts` verifica retirada tras 401 | Pasa | — |
| RF-41 | `logout.test.tsx`; `logout-workflow.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-42 | `logout.test.tsx` y E2E verifican la solicitud única al contrato de logout | Pasa | — |
| RF-43 | `logout.test.tsx`; `logout-workflow.bootstrap-smoke.spec.ts` comprueba texto, aria-busy y foco pendiente | Pasa | — |
| RF-44 | `button.test.tsx`; `logout-workflow.bootstrap-smoke.spec.ts` verifica que Enter/clic no duplican la solicitud | Pasa | — |
| RF-45 | `logout.test.tsx`; E2E confirma signed-out tras 204 | Pasa | — |
| RF-46 | `logout.test.tsx`; `logout-workflow.bootstrap-smoke.spec.ts` mantiene el shell tras 503 | Pasa | — |
| RF-47 | `logout.test.tsx`; `logout-error.bootstrap-smoke.spec.ts` verifica alerta accesible | Pasa | — |
| RF-48 | `logout.test.tsx`; `logout-unauthenticated.test.tsx`; reintento E2E | Pasa | — |
| RF-49 | `navigation-history.bootstrap-smoke.spec.ts` y `logout-workflow.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-50 | `app-layout.bootstrap-smoke.spec.ts`; `navigation-keyboard.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-51 | `navigation-keyboard.bootstrap-smoke.spec.ts`; `button.test.tsx`; Drawer contract E2E | Pasa | — |
| RF-52 | `navigation-keyboard.bootstrap-smoke.spec.ts` verifica outline visible | Pasa | — |
| RF-53 | `button.test.tsx`; navegación compacta/persistente E2E verifica aria-expanded | Pasa | — |
| RF-54 | `session-state.test.tsx`; `session-focus.bootstrap-smoke.spec.ts`; confirmación auditiva en `review-t41.md` | Pasa | — |
| RF-55 | `session-boundary.test.tsx`; recuperación a página autenticada en `session-recovery.bootstrap-smoke.spec.ts` | Pasa | — |
| RF-56 | `app-layout.bootstrap-smoke.spec.ts` verifica modo compacto a 360 px | Pasa | — |
| RF-57 | `app-layout.bootstrap-smoke.spec.ts` verifica sidebar persistente a 1280 px y preferencia | Pasa | — |
| RF-58 | `app-layout.bootstrap-smoke.spec.ts` verifica cierre y foco al activador para Inicio activo | Pasa | — |
| RF-59 | `app-layout.bootstrap-smoke.spec.ts` verifica URL y una sola solicitud de documento | Pasa | — |
| RF-60 | `app-layout.bootstrap-smoke.spec.ts` prueba retirada del Drawer al cruzar 1024 px | Pasa | — |
| RF-61 | La misma prueba verifica retirada de inert/aria-hidden y desbloqueo de scroll | Pasa | — |
| RF-62 | `app-layout.bootstrap-smoke.spec.ts` verifica foco en enlace activo o heading 404 | Pasa | — |
| RF-63 | `session-focus.bootstrap-smoke.spec.ts` comprueba cierre del Drawer en checking/error/401 | Pasa | — |
| RF-64 | `session-focus.bootstrap-smoke.spec.ts` comprueba que el exterior queda desbloqueado | Pasa | — |
| RF-65 | `session-focus.bootstrap-smoke.spec.ts` comprueba foco en el heading de cada estado | Pasa | — |

## Requisitos no funcionales

| NFR | Evidencia | Resultado | Brecha |
| --- | --- | --- | --- |
| NFR-1 | `app-layout`, `app-pages`, `auth-layout`, navegación y E2E responsive en 360/768/1280; overflow medido | Pasa | — |
| NFR-2 | Contratos Drawer, teclado y foco visible; pasada humana Narrator + Chromium en `review-t40.md` y `review-t41.md` | Pasa | — |
| NFR-3 | Confirmación humana de zoom nativo al 200 % en `review-t39.md` | Pasa | — |
| NFR-4 | `drawer.layout.bootstrap-smoke.spec.ts` y prueba de movimiento reducido de App Shell | Pasa | — |
| NFR-5 | Textos y errores en español en `session-state`, `logout` e E2E | Pasa | — |
| NFR-6 | Dirección Impeccable y revisión T39; tokens, CSS local, ESLint, Prettier | Pasa | — |
| NFR-7 | `shell-preferences.test.ts` y E2E muestran que solo se persiste sidebarCollapsed | Pasa | — |
| NFR-8 | `preview-smoke` verifica que demo/harness/centinelas no entren al bundle; `proxy-contract` verifica 502 normalizado sin devolver el centinela | Pasa | — |
| NFR-9 | Auth plugin, session-boundary y concurrencia logout/401; Auth sigue autoritativo | Pasa | — |
| NFR-10 | `pnpm test:e2e` y preview-smoke usan fixtures Auth; no requieren backend real ni credenciales privadas | Pasa | — |

## Casos límite y criterios de finalización

| Caso/criterio | Evidencia | Resultado |
| --- | --- | --- |
| Comprobación inicial pendiente, error de red/HTTP/contrato, retry, 401 y recuperación | `session-recovery.bootstrap-smoke.spec.ts`, `session-boundary.test.tsx`, `auth-session-plugin.test.tsx` | Pasa |
| Identidad ausente/incompleta y texto largo | `public-identity.test.tsx`, `app-header.bootstrap-smoke.spec.ts` | Pasa |
| Logout fallido, activaciones repetidas, retry, 204 e historial | `logout.test.tsx`, `logout-race.test.tsx`, `logout-workflow.bootstrap-smoke.spec.ts` | Pasa |
| Storage inválido/bloqueado, carga persistida y fallback en memoria | `shell-preferences.test.ts`, `shell-preferences.bootstrap-smoke.spec.ts` | Pasa |
| URL 404 autenticada y visitante sin sesión | `router.test.tsx`, `app-pages.bootstrap-smoke.spec.ts`, `navigation-history.bootstrap-smoke.spec.ts` | Pasa |
| Cambio de modalidad con Drawer abierto; panel y scroll-lock limpios | `app-layout.bootstrap-smoke.spec.ts`, `drawer.contract.bootstrap-smoke.spec.ts` | Pasa |
| Destino activo en compacto y navegación sin recarga | `app-layout.bootstrap-smoke.spec.ts` | Pasa |
| Estado de sesión reemplaza shell con Drawer abierto; carrera 401/logout | `session-focus.bootstrap-smoke.spec.ts`, `logout-race.test.tsx`, confirmación en `review-t41.md` | Pasa |
| Flujo autenticado → Inicio → logout → información de ausencia | `inventory.bootstrap-smoke.spec.ts`, `logout-workflow.bootstrap-smoke.spec.ts` | Pasa |
| Lint, formato, tipos, suite unitaria, build y E2E de producción | Resultados de comandos de cierre indicados arriba | Pasa; conserva aviso de chunk |
| Zoom, responsive, Impeccable y lector de pantalla | `review-t39.md`, `review-t40.md`, `review-t41.md` | Pasa; confirmaciones humanas registradas |

### Inventario de casos límite

| Caso límite de la spec | Evidencia | Resultado |
| --- | --- | --- |
| Comprobación inicial pendiente | `session-recovery.bootstrap-smoke.spec.ts` | Pasa |
| Sesión ausente o expirada (`401`) | `session-recovery.bootstrap-smoke.spec.ts`; `session-boundary.test.tsx` | Pasa |
| Fallo de red o servidor | `session-recovery.bootstrap-smoke.spec.ts`; `auth-session-plugin.test.tsx` | Pasa |
| Respuesta de sesión inválida | `session-recovery.bootstrap-smoke.spec.ts`; `auth-session-plugin.test.tsx` | Pasa |
| Nombre/correo público ausente | `public-identity.test.tsx` verifica fallback «Usuario»; contrato incompleto rechazado | Pasa |
| Nombre/correo demasiado largo | `app-header.bootstrap-smoke.spec.ts`; `review-t39.md` | Pasa |
| Fallo de logout | `logout.test.tsx`; `logout-workflow.bootstrap-smoke.spec.ts` | Pasa |
| Activación repetida durante logout pendiente | `logout.test.tsx`; `logout-workflow.bootstrap-smoke.spec.ts` | Pasa |
| Atrás/Adelante tras logout confirmado | `navigation-history.bootstrap-smoke.spec.ts`; `logout-workflow.bootstrap-smoke.spec.ts` | Pasa |
| Preferencia inválida o almacenamiento bloqueado | `shell-preferences.test.ts`; `shell-preferences.bootstrap-smoke.spec.ts` | Pasa |
| Cambio de ancho con Drawer abierto | `app-layout.bootstrap-smoke.spec.ts` en ambos sentidos del breakpoint | Pasa |
| Zoom nativo al 200 % | Confirmación manual del usuario en `review-t39.md` | Pasa |
| URL de aplicación inexistente | `app-pages.bootstrap-smoke.spec.ts`; `navigation-history.bootstrap-smoke.spec.ts` | Pasa |
| Inicio como único destino disponible | `router.test.tsx`; `app-layout.bootstrap-smoke.spec.ts` | Pasa |
| Recomprobación posterior queda pendiente | `session-focus.bootstrap-smoke.spec.ts`; `session-boundary.test.tsx` | Pasa |
| Recomprobación posterior falla | `session-focus.bootstrap-smoke.spec.ts`; `session-boundary.test.tsx` | Pasa |
| Visitante sin sesión en URL 404 | `router.test.tsx`; `session-recovery.bootstrap-smoke.spec.ts` | Pasa |
| Logout falla después de una comprobación concurrente `401` | `logout-race.test.tsx`; confirmación Narrator + Chromium en `review-t41.md` | Pasa |
| Selección del destino ya activo en navegación compacta | `app-layout.bootstrap-smoke.spec.ts` | Pasa |
| Checking/error/ausencia reemplaza App Shell con Drawer abierto | `session-focus.bootstrap-smoke.spec.ts`; confirmación en `review-t41.md` | Pasa |

### Criterios de finalización de la spec

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| Evidencia para cada RF | Matriz RF-1–RF-65 de este informe | Pasa |
| Calidad, tipos, pruebas y compilación sin errores | Comprobaciones de cierre de este informe | Pasa; se registra aviso no bloqueante de chunk |
| Sesión confirmada → Inicio → logout → sesión no iniciada | `inventory.bootstrap-smoke.spec.ts`; `logout-workflow.bootstrap-smoke.spec.ts` | Pasa |
| Pending, ausencia, errores y reintento | `session-recovery.bootstrap-smoke.spec.ts`; `session-boundary.test.tsx` | Pasa |
| Fallo logout conserva estado y permite reintento | `logout-workflow.bootstrap-smoke.spec.ts`; `logout.test.tsx` | Pasa |
| Preferencia persiste tras recarga/nueva página | `shell-preferences.bootstrap-smoke.spec.ts`; `shell-preferences.test.ts` | Pasa |
| Navegación, foco, zoom y estados responsive | `app-layout.bootstrap-smoke.spec.ts`; `review-t39.md`; `review-t40.md` | Pasa |
| Revisión auditiva de lector de pantalla | Confirmaciones del usuario en `review-t40.md` y `review-t41.md` | Pasa |
| Revisión Impeccable | Brief `app-shell-direction.md`; revisión T39 | Pasa |
| Evidencia/bloqueos documentados | `review-t39.md`–`review-t44.md` y este informe | Pasa; no quedan bloqueos |
| Recomprobación posterior pendiente/error | `session-focus.bootstrap-smoke.spec.ts`; `session-boundary.test.tsx` | Pasa |
| Recuperación tras comprobación posterior exitosa | `session-recovery.bootstrap-smoke.spec.ts`; `session-boundary.test.tsx` | Pasa |
| Prioridad de sesión ante una URL 404 | `router.test.tsx`; `session-recovery.bootstrap-smoke.spec.ts` | Pasa |
| Ausencia confirmada prevalece sobre fallo concurrente de logout | `logout-race.test.tsx` | Pasa |
| Compacto a 360 px y persistente a 1280 px | `app-layout.bootstrap-smoke.spec.ts` | Pasa |
| Selección activa cierra sin recarga y devuelve foco | `app-layout.bootstrap-smoke.spec.ts` | Pasa |
| Modalidad y sesión limpian panel/bloqueo y asignan destino de foco | `app-layout.bootstrap-smoke.spec.ts`; `session-focus.bootstrap-smoke.spec.ts` | Pasa |

Las dudas abiertas de `spec.md` no bloquean implementación; el punto de transición y tablet se definieron en `plan.md` y verificaron a 768/1024 px. No se requieren cambios operativos en `AGENTS.md` ni README: los comandos utilizados ya estaban documentados.

## Veredicto del validator

**Spec cumplida.** RF-1–RF-65 y NFR-1–NFR-10 tienen evidencia; esta validación no encuentra brechas abiertas. Se conserva como advertencia de build el chunk de 626.57 kB, y se documentó la primera falla E2E no reproducible de `dialog.scroll` junto con sus ejecuciones posteriores aprobadas.
