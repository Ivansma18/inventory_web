# Arquitectura base oficial — Inventory Frontend

## 1. Propósito y referencias

Frontend de Inventory, preparado para evolucionar hacia gestión de inventario, compras, ventas, mini ERP y SaaS multi-tenant.

Referencias:

- `docs/ruta.md`: stack, alcance y secuencia de evolución.
- `docs/constitution.md`: principios obligatorios y decisiones acordadas.
- `AGENTS.md`: instrucciones operativas y comandos verificables.
- Specs, planes y tareas: requisitos y ejecución de cada funcionalidad.

Este documento describe la arquitectura objetivo. Las carpetas y archivos se crean conforme a la fase y necesidad correspondiente; su aparición aquí no implica que ya existan.

## 2. Stack y enfoque arquitectónico

| Responsabilidad               | Tecnología                                      |
| ----------------------------- | ----------------------------------------------- |
| UI y lenguaje                 | React y TypeScript strict                       |
| Desarrollo y build            | Vite                                            |
| Navegación y estado navegable | React Router                                    |
| Autenticación y sesión        | Better Auth React Client                        |
| Transporte HTTP de negocio    | Axios                                           |
| Server state                  | TanStack Query                                  |
| Estado global de cliente/UI   | Zustand                                         |
| Formularios y validación      | React Hook Form y Zod                           |
| Implementación visual         | PrimeReact, PrimeIcons y TailwindCSS            |
| Pruebas                       | Vitest, React Testing Library, MSW y Playwright |
| Calidad                       | ESLint, Prettier, Husky y lint-staged           |

Enfoque:

- Feature-Driven Architecture y Vertical Slices.
- Design System propio.
- Abstracción de UI y autenticación.
- Separación de UI, acceso a datos y responsables del estado.
- Contratos HTTP derivados de OpenAPI cuando estén disponibles.

## 3. Estructura general objetivo

```text
src/
├── app/
│   ├── router/
│   │   └── router.tsx
│   ├── providers/
│   │   ├── app-providers.tsx
│   │   ├── query.provider.tsx
│   │   └── ui.provider.tsx
│   ├── layouts/
│   │   ├── app-layout.tsx
│   │   └── auth-layout.tsx
│   └── config/
│
├── features/
│   ├── auth/
│   ├── authorization/
│   ├── organizations/
│   ├── products/
│   ├── categories/
│   ├── inventory/
│   ├── stock-movements/
│   ├── suppliers/
│   ├── purchases/
│   ├── customers/
│   ├── sales/
│   ├── audit/
│   └── reports/
│
├── shared/
│   ├── api/
│   │   ├── generated/
│   │   ├── http-client.ts
│   │   └── query-client.ts
│   ├── ui/
│   ├── components/
│   ├── config/
│   │   └── env.ts
│   ├── hooks/
│   ├── lib/
│   ├── types/
│   ├── utils/
│   └── constants/
│
├── assets/
├── main.tsx
└── vite-env.d.ts
```

Las features futuras se incorporan según la ruta. No se crean todas sus carpetas durante el bootstrap.

## 4. Entrada y composición de la aplicación

```text
main.tsx
   ↓
AppProviders
   ↓
Router
   ↓
Layout
   ↓
Página de feature
```

- `main.tsx`: entrada y montaje de React.
- `app/providers`: composición de providers globales.
- `app/router`: registro de rutas y composición de guards públicos.
- `app/layouts`: estructura de aplicación y experiencia de autenticación.
- `app/config`: configuración propia del ensamblaje de la aplicación.

La lógica específica de productos, ventas o inventario permanece en sus features.

## 5. Anatomía de una feature

Ejemplo de una feature suficientemente grande:

```text
features/products/
├── api/
│   ├── product.api.ts
│   ├── product.queries.ts
│   └── product.mutations.ts
├── components/
│   ├── product-table.tsx
│   ├── product-form.tsx
│   └── product-filters.tsx
├── pages/
│   ├── product-list.page.tsx
│   ├── product-create.page.tsx
│   └── product-edit.page.tsx
├── schemas/
│   └── product.schema.ts
├── hooks/
├── types/
├── utils/
└── index.ts
```

| Carpeta      | Responsabilidad                                          |
| ------------ | -------------------------------------------------------- |
| `pages`      | Componer la experiencia de una ruta                      |
| `components` | UI específica del negocio                                |
| `hooks`      | Conectar UI con consultas, mutations y flujos de feature |
| `api`        | Operaciones HTTP, queries y mutations                    |
| `schemas`    | Validación de cliente                                    |
| `types`      | Tipos propios no duplicados de contratos generados       |
| `utils`      | Transformaciones y utilidades específicas                |
| `index.ts`   | API pública de la feature                                |

Las vertical slices agrupan el trabajo alrededor de un comportamiento, como crear un producto. No requieren multiplicar carpetas sin necesidad.

## 6. Flujo de presentación y Design System

```text
Página
   ↓
Componente de feature
   ↓
Composición compartida, cuando corresponda
   ↓
Primitiva de shared/ui
   ↓
PrimeReact / PrimeIcons
```

### `shared/ui`

Primitivas reutilizables: Button, Icon, Input, Select, Dialog, DataTable, Badge y otras necesarias.

- Único lugar autorizado para importar PrimeReact y PrimeIcons.
- APIs propias, sin heredar ni exportar tipos de PrimeReact.
- Opciones limitadas a necesidades reales.
- Fuera de esta capa se utiliza `Icon`, nunca clases `pi`.
- Bases transversales de accesibilidad y consistencia visual.
- Cada primitiva visual mantiene su hoja `<componente>.css` junto al TSX y
  la importa desde su módulo. `styles.css` queda para imports globales,
  tokens y reglas base/transversales; no debe acumular estilos de primitivas.

```text
shared/ui/
├── button/
│   ├── button.tsx
│   └── button.css
├── input/
│   ├── input.tsx
│   └── input.css
└── styles.css  # imports, tokens y reglas globales/transversales
```

### `shared/components`

Composiciones genéricas construidas con `shared/ui`, como PageHeader, FormField, EmptyState o FilterBar.

Los componentes específicos, como ProductTable o StockStatusBadge, permanecen en su feature.

## 7. Flujo de datos de negocio

```text
Componente
   ↓
Hook de feature
   ↓
TanStack Query: query / mutation
   ↓
API de feature
   ↓
shared/api/http-client.ts
   ↓
Backend
```

- Los componentes no utilizan Axios directamente.
- El cliente HTTP centraliza transporte, credenciales, timeout y normalización de errores.
- Las reglas y decisiones específicas permanecen en la feature.
- TanStack Query administra caché, invalidación, refetch y estados de operaciones.
- La UI trabaja con códigos de error normalizados.
- Los contratos generados viven en `shared/api/generated`.

Los contratos HTTP, valores de formularios y modelos de presentación se mantienen conceptualmente separados. Se introducen transformaciones cuando sean necesarias, sin duplicar tipos automáticamente.

## 8. Autenticación y autorización

```text
features/auth/
├── api/
│   └── auth-client.ts
├── hooks/
│   ├── use-auth.ts
│   └── use-session.ts
├── components/
│   └── login-form.tsx
├── pages/
│   └── login.page.tsx
├── schemas/
│   └── login.schema.ts
├── guards/
│   └── protected-route.tsx
└── index.ts
```

```text
Aplicación
   ↓
API pública de Auth
   ↓
Integración encapsulada con Better Auth
   ↓
Backend de Auth
```

- Solo `features/auth` importa Better Auth directamente.
- Su cliente se prepara durante el bootstrap; las pantallas se desarrollan en la fase correspondiente.
- El resto consume `useAuth`, `useSession` y los elementos públicos necesarios.
- Se conserva el contrato del backend y se adapta su integración dentro de Auth.
- El mecanismo de adaptación se define y verifica en el plan.
- No se inventan campos ausentes ni se duplica sesión en Zustand.
- Los guards distinguen sesión pendiente, autenticado y no autenticado.

`features/authorization` administra permisos y presentación de acciones. El backend sigue siendo la autoridad para autorización.

## 9. Responsables del estado

| Estado                             | Responsable               |
| ---------------------------------- | ------------------------- |
| Datos de negocio y caché           | TanStack Query            |
| Sesión, usuario y autenticación    | Better Auth mediante Auth |
| Tema, sidebar y preferencias de UI | Zustand                   |
| Valores y estado de formularios    | React Hook Form           |
| Filtros y estado navegable         | React Router / URL        |

No copiar datos del servidor ni sesión a Zustand.

## 10. Comunicación e imports

Permitido:

```text
app → APIs públicas de features
features → shared
feature A → API pública de feature B
shared/components → shared/ui
shared/ui → PrimeReact / PrimeIcons
features/auth → Better Auth
```

Prohibido:

```text
feature A → internos de feature B
features → PrimeReact / PrimeIcons
módulos externos a Auth → cliente interno de Auth
módulos externos a Auth → Better Auth
componentes → Axios directamente
```

Las restricciones de UI y Auth se automatizan mediante ESLint.

## 11. Configuración y desarrollo local

- Variables de aplicación centralizadas en `shared/config/env.ts` y validadas con Zod.
- No distribuir acceso a `import.meta.env` por las features.
- No guardar secretos en variables `VITE_*`.
- pnpm como gestor de paquetes.
- Versiones exactas fijadas en el plan del bootstrap.

```text
Navegador: http://localhost:5174
   ↓
Proxy de desarrollo de Vite
   ↓
Backend objetivo: http://localhost:3000
```

El frontend usa puerto estricto. El proxy conserva `/api/auth`; el mapeo de negocio se define sin interferir con rutas de páginas.

Antes de cerrar la integración se verifican URL efectiva del backend, origen permitido, cookies y contrato de Auth. La topología de producción se define en la fase de despliegue.

## 12. Operaciones críticas y multi-tenancy

- Modificar stock mediante entradas, salidas y ajustes.
- Esperar confirmación del backend en operaciones críticas.
- No utilizar optimistic update al completar ventas.
- Cancelar ventas completadas mediante una acción explícita.
- Mostrar conflictos de stock y refrescar información.
- Invalidar datos afectados después de operaciones confirmadas.

Cuando se incorpore multi-tenancy, las query keys incluyen organización y el cambio de tenant evita mostrar o reutilizar datos de otra organización.

## 13. UX, accesibilidad y pruebas

Toda vista significativa sigue el flujo de Impeccable establecido en la ruta: objetivo, información, UX, implementación, estados, revisión responsive y accesibilidad.

| Área                | Verificación                                   |
| ------------------- | ---------------------------------------------- |
| Wrappers            | Contratos propios, interacción y accesibilidad |
| Features            | React Testing Library y MSW                    |
| Auth                | Adaptación del contrato y ciclo de sesión      |
| Workflows           | Playwright cuando esté configurado             |
| Arquitectura        | ESLint y revisión de imports                   |
| Tipos y compilación | Typecheck y build                              |

Las pruebas interactúan con la UI propia y evitan detalles internos de PrimeReact.

## 14. Evolución

La estructura crece según las fases de `docs/ruta.md`:

- Bootstrap y fronteras técnicas.
- Design System y App Shell.
- Features de negocio.
- Experiencia completa de Auth y autorización.
- Contratos, errores y query architecture.
- Multi-tenancy y madurez del Design System.
- UX, rendimiento, pruebas, accesibilidad y producción.

Las optimizaciones requieren mediciones y las extracciones compartidas requieren reutilización demostrada.

**Regla final:** la aplicación depende de nuestras fronteras públicas —Design System, Auth y APIs de features— para mantener localizado el impacto de cambios tecnológicos.
