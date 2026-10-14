# Evidencia T42 — Fronteras, estado y formato

**Fecha:** 2026-10-14  
**Alcance:** imports, API pública de Auth, ownership de estado, CSS del Design System y formato del repositorio.

## Revisión de arquitectura

- `pnpm lint` aprobó ESLint y `verify-eslint-config.mjs`, incluidos los controles de fronteras.
- El barrido de imports encontró PrimeReact/PrimeIcons únicamente en `src/shared/ui`; las rutas `src/app` y `src/features` no importan esos paquetes ni usan clases `pi`.
- Las únicas importaciones de `better-auth` están en `src/features/auth`. Los consumidores de sesión y operaciones importan la API pública desde `@/features/auth`; no se encontraron imports a sus internos.
- `src/shared/ui/index.ts` exporta contratos propios (`ButtonProps`, `DrawerProps`, `IconName`, etc.) y no expone tipos de PrimeReact.
- Las 12 primitivas visuales de `shared/ui` importan su CSS co-localizado. `ui-provider` no es una primitiva visual; `styles.css` contiene imports, tokens y reglas globales/transversales, sin selectores de componentes.
- `src/app/state/shell-preferences.ts` persiste solo `sidebarCollapsed`; `partialize` mantiene fuera sesión, identidad y datos Auth. `tests/app-shell/shell-preferences.test.ts` comprueba que el JSON persistido contiene únicamente esa preferencia.

## Formato y verificaciones

- La primera ejecución de `pnpm format:check` reportó 50 archivos con formato pendiente. `pnpm format` aplicó el formato del proyecto; después, `pnpm format:check` pasó y verificó la configuración de Prettier.
- El formateo cambió únicamente presentación de código; no se introdujeron cambios de comportamiento en esas superficies.
- Markdown se validó focalizadamente con Prettier.
- `pnpm lint`: aprobado.
- `pnpm typecheck`: aprobado.
- `pnpm test:run`: **40 archivos, 282 pruebas aprobadas**.
- `pnpm test:e2e --project=design-system --workers=1`: **7/7**.
- `pnpm build`: aprobado; mantiene el aviso de chunk JavaScript de 626.57 kB (>500 kB).

## Resultado

Las fronteras y la separación de estado revisadas corresponden a la Constitución y la arquitectura del proyecto; el formato queda limpio según el comando global configurado.
