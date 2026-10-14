# Evidencia T39 — Revisión responsive, zoom y movimiento reducido

**Fecha:** 2026-10-14  
**Alcance:** App Shell autenticado, identidad de usuario y navegación en 360, 768 y 1280 px.  
**Dirección revisada:** `app-shell-direction.md`, carril persistente y cabecera contextual.

## Primera pasada agrupada

- Se cargó el contexto Impeccable para `src/app/router/router.tsx`; el detector `impeccable detect --json src/app` devolvió `[]`.
- En 360 y 768 px la navegación usa modalidad compacta; a 1280 px usa sidebar persistente. Las pruebas de navegador verifican una sola navegación, regiones visibles y ausencia de desbordamiento horizontal.
- La identidad larga conserva el texto completo para tecnologías de asistencia y en `title`, aunque se trunque visualmente; la acción de cuenta sigue visible en 360, 768 y 1280 px.
- **Hallazgo:** al reducir el viewport CSS a 180 px —equivalente de layout a una pantalla de 360 px con zoom del 200 %, no una medición de zoom nativo— el `min-inline-size: 20rem` global del `body` forzaba `scrollWidth: 320 px`, desplazando la cabecera y sus acciones fuera del viewport.
- Contraste calculado a partir de los colores renderizados del tema: identidad 14.18:1; encabezado de Inicio 13.07:1; texto secundario 5.88:1; destino activo 6.34:1; anillo de foco 6.47:1 sobre blanco y 5.96:1 sobre el canvas. Cumplen 4.5:1 para texto normal y 3:1 para texto grande.
- Con `prefers-reduced-motion: reduce`, el enlace de navegación conserva transición de 0.1 ms o menos y el panel sigue abriendo y cerrando.

## Corrección y confirmación acotada

- Se retiró el ancho mínimo global del `body`, ya innecesario para las superficies que fijan su propio ancho mínimo.
- En el App Shell por debajo de 20rem CSS, la identidad ocupa una fila y las acciones otra; se redujeron el padding horizontal de la cabecera y el espacio entre controles para mantenerlos dentro del viewport.
- La prueba de 180 px confirma `documentElement.scrollWidth <= 180`, identidad completa accesible y controles de navegación/logout dentro de los límites.
- La segunda pasada quedó cubierta por `pnpm test:e2e --project=bootstrap-smoke --workers=1`: **54/54**, incluidos los casos 360/768/1280, identidad larga, contraste, viewport equivalente a 200 % y movimiento reducido. `pnpm test:e2e --project=design-system --workers=1`: **7/7**.

## Verificaciones de calidad

- `pnpm test:run`: **40 archivos, 281 pruebas aprobadas**.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- `pnpm build`: aprobado; conserva el aviso existente de chunk JavaScript de 626 kB (>500 kB).
- Prettier focalizado en los cuatro archivos de código modificados: aprobado.
- `pnpm format:check` se ejecutó y reportó 52 archivos del repositorio; el test de este cambio se formateó focalizadamente después. Los demás hallazgos son archivos ajenos al alcance T39.

## Confirmación manual de zoom nativo

El usuario confirmó que verificó el **zoom nativo real del navegador al 200 %** y que la navegación, identidad y acción de logout funcionan correctamente. Con esta confirmación, queda cubierto el último criterio manual de T39.
