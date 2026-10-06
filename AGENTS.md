# AGENTS.md - Inventory Frontend

## Proyecto

Frontend del backend Inventory, con evolución hacia gestión de inventario,
compras, ventas, mini ERP y SaaS multi-tenant. La Fase 0 de bootstrap está
implementada; las funciones de negocio de la ruta siguen siendo fases futuras.
La arquitectura combina Feature-Driven Architecture, Vertical Slices y un
Design System propio.

La fuente de referencia es `docs/ruta.md`; `README.md` contiene pasos
reproducibles de instalación, desarrollo, comprobaciones y requisitos de las
pruebas reales.

## Stack implementado

- Core: React, TypeScript, Vite y React Router.
- Autenticación: Better Auth React Client encapsulado en `features/auth`.
- Datos: Axios y TanStack Query.
- Estado: Better Auth para sesión; Zustand para estado de cliente/UI;
  React Hook Form para formularios; React Router/URL para estado navegable.
- Formularios: React Hook Form y Zod.
- UI: PrimeReact, PrimeIcons y TailwindCSS detrás del Design System.
- Pruebas: Vitest, React Testing Library, MSW y Playwright.
- Calidad: TypeScript strict, ESLint, Prettier, Husky y lint-staged.

## Comandos verificados

Ejecutar desde la raíz del frontend, con Node.js `24.21.0` y pnpm `12.8.1`.
Instalación reproducible: `pnpm install --frozen-lockfile`.

- Desarrollo: `pnpm dev` (`http://localhost:5174`, puerto estricto).
- Build/preview: `pnpm build`; `pnpm preview` sirve el build en `5174`.
- Calidad: `pnpm lint`, `pnpm format:check`, `pnpm typecheck`.
- Formato con escritura: `pnpm format`.
- Unit tests: `pnpm test:run`; modo interactivo: `pnpm test`.
- E2E predeterminado, con mocks/backend aislado: `pnpm test:e2e`.
- Real backend: `pnpm test:e2e --project=health-real` y
  `pnpm test:e2e --project=auth-real`; este último requiere backend, trusted
  origin de development y cuenta privada configurada en `.env`.
- E2E adicionales verificados: `pnpm test:e2e --project=preview-smoke`,
  `pnpm test:e2e --project=proxy-contract` y
  `pnpm test:e2e --project=auth-harness`.
- Comprobaciones de proceso/hooks: `pnpm verify:startup` y
  `pnpm verify:hooks`.

Las suites simuladas no requieren backend ni credenciales. La prueba `auth-real`
solo corre al seleccionar su proyecto expresamente. Consultar `README.md` para
configuración segura, cuenta/backend, alcance de cada suite y operación de Git.
Husky solo puede instalar hooks dentro de la raíz de un repositorio Git; si no
hay `.git`, usar los comandos CLI de calidad.

## Estilo y convenciones

- Organizar `src/app` para router, providers, layouts y configuración.
- Organizar `src/features` por dominio y vertical slice.
- Usar `src/shared/ui` para primitivas del Design System y
  `src/shared/components` para composiciones genéricas de aplicación.
- Centralizar el cliente HTTP y los contratos generados en `src/shared/api`;
  validar variables de entorno en `src/shared/config/env.ts`.
- Mantener los componentes específicos de negocio dentro de su feature.
- Seguir los nombres de la ruta: archivos en kebab-case y componentes
  en PascalCase; por ejemplo, `product-table.tsx` y `ProductTable`.
- Las features grandes pueden separar `api`, `components`, `pages`,
  `schemas`, `hooks`, `types` y `utils`, con API pública en `index.ts`.

## Reglas

- Leer `docs/ruta.md`, `docs/constitution.md` y `docs/estructura.md` antes
  de implementar. Leer la spec activa cuando exista y consultar la
  arquitectura al cambiar límites o dependencias entre módulos.
- Seguir la fase y el alcance de la tarea solicitada según la ruta.
- Importar Better Auth directamente solo desde `src/features/auth`, con el
  cliente en `features/auth/api/auth-client.ts`. El resto de la aplicación
  consume la API pública de Auth, por ejemplo `useAuth` y `useSession`.
- Mantener separadas autenticación y autorización; la autorización del
  backend sigue siendo autoritativa.
- Importar PrimeReact y PrimeIcons únicamente dentro de `src/shared/ui`.
  Fuera del Design System, usar el componente `Icon`, nunca clases `pi`.
- Definir APIs propias para los wrappers. No exportar, heredar ni filtrar
  tipos de PrimeReact hacia sus consumidores.
- Exponer solo las opciones necesarias para la aplicación.
- Si falta un comportamiento genérico, extender `shared/ui`; si pertenece
  al negocio, componer primitivas dentro de la feature.
- Acceder a otras features mediante sus APIs públicas, nunca sus internos.
- Asignar el estado a su responsable: TanStack Query para server state,
  Better Auth para sesión, Zustand para estado de cliente/UI, React Hook
  Form para formularios y React Router/URL para estado navegable. No copiar
  server state ni session state a Zustand.
- Mantener el flujo de datos separado de la UI: componente → hook de feature
  → TanStack Query → API de feature → cliente HTTP → backend. Los
  componentes no deben utilizar Axios directamente.
- Usar React Hook Form y Zod para formularios y validación de cliente.
  El backend es autoritativo para reglas de negocio y autorización.
- Derivar contratos HTTP de OpenAPI cuando esté disponible y mantener los
  generados en `shared/api/generated`; evitar duplicarlos manualmente.
- Incluir el contexto de organización en las query keys multi-tenant y
  evitar mostrar o reutilizar caché de otro tenant.
- Esperar confirmación del backend para operaciones críticas. No usar
  optimistic update al completar una venta; modificar stock mediante
  movimientos y cancelar ventas completadas mediante una acción explícita.
  Ante conflictos de stock, mostrar el error y refrescar los datos.
- No incluir secretos en variables `VITE_*` ni registrar contraseñas,
  tokens de sesión, cookies o secretos.
- Usar tokens y convenciones visuales compartidos.
- Crear abstracciones según necesidades reales; mover componentes a
  shared después de demostrar reutilización.
- Reforzar mediante ESLint las fronteras de importación: features no
  importan PrimeReact ni PrimeIcons; solo `features/auth` importa Better Auth.

## Flujo de interfaz

- Utilizar la skill `impeccable` al crear o mejorar vistas.
- Definir objetivo del usuario, información necesaria y flujo antes
  de implementar.
- Construir las vistas con el Design System.
- Implementar los estados aplicables de loading, error, empty, success e
  interacción, con feedback y confirmaciones para las operaciones pertinentes.
- Revisar responsive, navegación por teclado, foco, labels, errores,
  contraste y permisos.
- Validar el workflow completo antes de considerar finalizada una vista.

## Al terminar cualquier tarea

- Ejecutar las verificaciones configuradas que correspondan al cambio:
  lint, typecheck, pruebas y build.
- Probar los contratos de los wrappers cuando cambie su comportamiento.
  Los tests de features deben interactuar con la UI propia, no con
  detalles internos de PrimeReact.
- Cubrir los flujos de autenticación afectados; usar MSW para simular APIs
  y Playwright para workflows E2E cuando corresponda y esté configurado.
- Comprobar las fronteras de importación y la separación de estados.
- Informar los cambios, las verificaciones realizadas y los bloqueos.
  Si una verificación no está configurada, indicarlo explícitamente.
