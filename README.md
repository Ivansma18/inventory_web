# Inventory Frontend

Frontend React/TypeScript de Inventory. El bootstrap de la Fase 0 está implementado: configuración validada, proxy local, infraestructura encapsulada de Auth, vista mínima y controles automatizados. Las pantallas de negocio y la experiencia visual completa de autenticación pertenecen a fases posteriores.

## Requisitos

- Node.js `24.21.0`, fijado en `.node-version` y en `package.json`.
- pnpm `12.8.1`, fijado en `package.json`.
- Chromium de Playwright para las pruebas E2E.
- Backend `inventary-api` en `http://localhost:3000` solo para comprobar health o ejecutar el ciclo real de Auth.

Comprueba las versiones antes de instalar:

```sh
node --version
pnpm --version
```

## Instalación y entorno local

Desde la raíz de este repositorio:

```sh
pnpm install --frozen-lockfile
```

Copia `.env.example` a `.env` y conserva los ejemplos locales:

```powershell
Copy-Item .env.example .env
```

```sh
cp .env.example .env
```

| Variable             | Uso                                                                                              | Ejemplo local           |
| -------------------- | ------------------------------------------------------------------------------------------------ | ----------------------- |
| `VITE_APP_NAME`      | Nombre público de la aplicación; obligatorio.                                                    | `Inventory`             |
| `VITE_API_URL`       | Prefijo de API de negocio; obligatorio.                                                          | `/api/backend`          |
| `API_PROXY_TARGET`   | Origen de backend usado por Vite; opcional, default `http://localhost:3000`.                     | `http://localhost:3000` |
| `AUTH_TEST_EMAIL`    | Cuenta exclusiva ya preparada para la prueba real de Auth; opcional para el resto de las tareas. | Vacío en el ejemplo     |
| `AUTH_TEST_PASSWORD` | Contraseña de esa cuenta; opcional para el resto de las tareas.                                  | Vacío en el ejemplo     |

`.env` está ignorado por Git. No guardes secretos en variables `VITE_*`: esas variables son configuración pública y pueden incorporarse al bundle del navegador. No publiques ni registres credenciales, cookies o tokens. El runner lee `AUTH_TEST_EMAIL` y `AUTH_TEST_PASSWORD` desde `.env` solo al seleccionar explícitamente `auth-real`; no las entrega al proceso Vite. `.env.example` contiene placeholders vacíos, nunca credenciales.

### Backend local

Para usar health o Auth real, inicia el backend desde la raíz del repositorio `inventary-api` en otra terminal:

```sh
npm run dev
```

El backend debe escuchar en `http://localhost:3000`; confirma su disponibilidad con `GET /health`. Para Auth real, usa el backend de desarrollo actualizado: conserva su `BETTER_AUTH_URL` y confía en `http://localhost:5174` como trusted origin únicamente en `development`. Esa integración está documentada y probada en `inventary-api/specs/005-authentication`. No se debe cambiar el `Origin` del navegador para eludir esa configuración.

El ciclo `auth-real` requiere una cuenta exclusiva previamente creada en el backend. No crea cuentas ni registros de inventario, ventas o compras; inicia y cierra una sesión de esa cuenta.

## Desarrollo y preview

```sh
pnpm dev
```

Vite sirve la aplicación en `http://localhost:5174`, con puerto estricto. El proxy conserva `/api/auth` y reescribe `/api/backend` hacia el backend local. Si `5174` ya está ocupado, el servidor falla en lugar de cambiar de puerto.

Para compilar y servir manualmente el bundle de producción:

```sh
pnpm build
pnpm preview
```

Preview también usa `localhost:5174`; dev y preview se ejecutan por separado, nunca al mismo tiempo en ese puerto. Es una comprobación local del bundle, no una configuración de despliegue.

## Comprobaciones

| Comando               | Resultado                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm lint`           | ESLint y comprobaciones automatizadas de fronteras de imports.                              |
| `pnpm format:check`   | Comprueba el formato sin modificar archivos.                                                |
| `pnpm format`         | Aplica formato a los archivos incluidos en los globs configurados.                          |
| `pnpm typecheck`      | TypeScript strict y verificación de sus aliases/configuración.                              |
| `pnpm test:run`       | Vitest en una ejecución.                                                                    |
| `pnpm test`           | Vitest en modo watch.                                                                       |
| `pnpm build`          | Typecheck y build de Vite.                                                                  |
| `pnpm verify:startup` | Comprueba configuración inválida y conflicto de puerto con procesos aislados.               |
| `pnpm verify:hooks`   | Verifica el comportamiento condicional de Husky/lint-staged en un repositorio Git temporal. |

### Playwright

Instala Chromium una vez:

```sh
pnpm exec playwright install chromium
```

La suite habitual no usa backend personal ni credenciales:

```sh
pnpm test:e2e
```

Ejecuta los smoke de bootstrap, el contrato del proxy contra un backend simulado y el harness de Auth con respuestas simuladas. Más verificaciones con proyectos seleccionados:

```sh
pnpm test:e2e --project=proxy-contract
pnpm test:e2e --project=auth-harness
pnpm test:e2e --project=preview-smoke
```

`preview-smoke` crea un build y sirve temporalmente el preview en el puerto `5174`; no requiere el backend personal.

Health real es una consulta GET no destructiva y requiere el backend activo, pero no una cuenta:

```sh
pnpm test:e2e --project=health-real
```

Auth real ejecuta el ciclo de cookie en Chromium aislado. Requiere el backend anterior con el trusted origin de desarrollo y la cuenta exclusiva en `.env`:

```sh
pnpm test:e2e --project=auth-real
```

El test verifica ausencia de sesión (`401`), login (`200`), cookie HttpOnly, consulta autenticada (`200`), logout (`204`) y consulta posterior (`401`). Desactiva screenshot, trace y vídeo; sus errores y observaciones muestran metadatos saneados, no los valores de las credenciales o cookies. La selección es explícita: no se ejecuta con el comando E2E por defecto.

## Git y hooks

`pnpm install` ejecuta la preparación condicional de Husky. El hook `pre-commit` llama a lint-staged cuando la raíz del paquete es también la raíz de un repositorio Git y la instalación no está desactivada por el entorno. En una descarga sin `.git`, el hook no se instala; ejecuta los comandos CLI de calidad anteriores manualmente. Los hooks complementan esos comandos y no los sustituyen.

## Alcance actual

La vista de Inventory es intencionalmente mínima. Este bootstrap no incluye pantallas de productos, inventario, compras, ventas, gestión de permisos ni login visual. La interfaz y los workflows se amplían en las fases descritas en [`docs/ruta.md`](docs/ruta.md); la arquitectura objetivo está en [`docs/estructura.md`](docs/estructura.md) y las reglas vigentes en [`docs/constitution.md`](docs/constitution.md).
