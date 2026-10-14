# Evidencia T41 — Anuncios y transiciones de sesión

**Estado:** revisión automatizada y pasada auditiva humana aprobadas.  
**Navegador automatizado:** Playwright Chromium 153.0.8010.12, headless.  
**Lector de pantalla:** Windows Narrator + Chromium; el usuario confirmó la pasada auditiva.

## Primera pasada y correcciones

- Las pruebas mostraron que un logout confirmado desmontaba el botón enfocado sin asignar foco al estado «Sesión no iniciada». El foco ahora sigue los cambios de presentación después de la verificación inicial: heading de checking/error/signed-out, y heading principal al recuperar la vista autenticada. La comprobación inicial conserva el comportamiento no intrusivo.
- El logout pendiente usaba `disabled` nativo, que quitaba el foco del control. Ahora `Button` puede exponer `aria-disabled` mientras sigue siendo enfocable; `aria-busy` y el texto «Cerrando sesión…» comunican la operación, y el handler bloquea clic/Enter/Espacio duplicados.
- Se comprobó que el estado de error y la sesión no iniciada concurrentes se mantienen como una alerta y una región de estado independientes, sin recuperar el shell ni mostrar acciones ya inválidas.

## Evidencia automatizada

- **Checking/error/reintento/ausencia:** `status` polite/atomic y `alert` assertive/atomic aparecen de forma exclusiva en los estados correspondientes. Los reintentos pasan por checking; el éxito vuelve a enfocar el heading de la página, y 401 enfoca «Sesión no iniciada».
- **Logout:** durante la espera el botón permanece enfocado, `aria-disabled="true"` y `aria-busy="true"`; clic, Enter y Espacio no repiten la operación. El error presenta una sola alerta y mantiene el foco en el botón de reintento. El 204 enfoca el heading de sesión no iniciada.
- **Drawer abierto:** los estados checking, error y 401 retiran el panel, quitan `inert`/`aria-hidden` y enfocan el heading correspondiente.
- **Carrera logout/401:** tras confirmar ausencia y después recibir el fallo de logout, hay una región status y una alerta de operación; no aparece logout ni reintentar y el foco permanece en el heading de ausencia.
- Suites: `bootstrap-smoke` **54/54**; `test:run` **40 archivos, 282 pruebas**; `design-system` **7/7**; `preview-smoke` **2/2**. Las dos pruebas E2E actualizadas de recuperación y logout también pasaron en la última ejecución focalizada (**2/2**).
- Lint, typecheck, build y Prettier focalizado aprobados. El build conserva el aviso de chunk JavaScript de 626.57 kB (>500 kB). `pnpm format:check` global reporta 50 archivos fuera de T41; los archivos de T41 pasan Prettier focalizado.

## Confirmación auditiva humana

El usuario confirmó en Narrator + Chromium que checking, error, reintento, 401, logout pendiente/503/204, retirada del Drawer y la carrera 401→503 se anuncian una sola vez y conservan los destinos de foco previstos.
