# Evidencia T44 — E2E predeterminado y preview de producción

**Fecha:** 2026-10-14  
**Orden:** E2E predeterminado → `preview-smoke`, ejecutados secuencialmente.

## Resultados

- `pnpm test:e2e`: **56/56 pruebas aprobadas** en `bootstrap-smoke`, `proxy-contract` y `auth-harness`. Las pruebas del App Shell corrieron en el proyecto predeterminado con sesión/Auth simulados y sin credenciales privadas.
- La prueba `proxy-contract` detuvo deliberadamente su backend ficticio y verificó una respuesta 502 normalizada, sin reflejar el valor centinela. Vite registró el `ECONNREFUSED` esperado durante ese caso; el contrato pasó.
- `pnpm test:e2e --project=preview-smoke`: **2/2 pruebas aprobadas**. El bundle de producción excluye demo/harness y el shell responde con Auth simulado sin solicitudes de negocio.
- El preview construyó el bundle con 428 módulos. El aviso de chunk principal es **626.57 kB** (188.37 kB gzip), superior al umbral de 500 kB; no bloqueó build ni preview.

## Resultado

Los workflows E2E predeterminados y la verificación del bundle de producción pasan sin backend real ni credenciales privadas.
