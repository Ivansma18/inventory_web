# Ruta oficial Frontend — Inventory / ERP / SaaS

## 1. Objetivo

Construir el frontend que acompañará al backend Inventory:

```text
Inventory
   ↓
Inventory Management System
   ↓
Purchasing + Sales
   ↓
Mini ERP
   ↓
Multi-Tenant SaaS
```

utilizando una arquitectura preparada para crecer sin acoplar las features directamente a:

```text
PrimeReact
PrimeIcons
Better Auth
Axios
otras librerías externas
```

La arquitectura seguirá:

```text
Feature-Driven Architecture
+
Vertical Slices
+
Design System propio
+
UI Library Abstraction
+
Authentication Abstraction
+
Server State / Client State Separation
+
OpenAPI Contracts
```

---

# 2. Stack oficial

## Core

```text
React
TypeScript
Vite
React Router
```

## Authentication

```text
Better Auth React Client
```

El backend utilizará Better Auth Server y el frontend utilizará su cliente React.

Pero Better Auth estará encapsulado dentro de:

```text
features/auth
```

El resto de la aplicación no dependerá directamente de la librería.

---

## Data fetching

```text
Axios
TanStack Query
```

Responsabilidades:

```text
Axios
→ transporte HTTP

TanStack Query
→ server state
→ cache
→ invalidation
→ loading
→ refetch
→ mutations
```

---

## Estado

```text
TanStack Query
→ datos provenientes del servidor

Better Auth
→ sesión y estado de autenticación

Zustand
→ estado global del cliente/UI

React Hook Form
→ estado de formularios

React Router
→ estado navegable en URL
```

---

# 3. Regla oficial de ownership del estado

```text
┌─────────────────────────────┬──────────────────────┐
│ Estado                      │ Responsable          │
├─────────────────────────────┼──────────────────────┤
│ Products                    │ TanStack Query       │
│ Inventory                   │ TanStack Query       │
│ Sales                       │ TanStack Query       │
│ Purchases                   │ TanStack Query       │
│ Session                     │ Better Auth          │
│ Authenticated user          │ Better Auth          │
│ Theme                       │ Zustand              │
│ Sidebar                     │ Zustand              │
│ UI preferences              │ Zustand              │
│ Form values                 │ React Hook Form      │
│ Filters navegables          │ React Router / URL   │
└─────────────────────────────┴──────────────────────┘
```

Regla:

```text
No duplicar estado sin necesidad.
```

Por ejemplo, nunca:

```text
Better Auth
    ↓
session
    ↓
Zustand
```

ni:

```text
TanStack Query
    ↓
products
    ↓
Zustand
```

---

# 4. Forms

```text
React Hook Form
+
Zod
```

Responsabilidades:

```text
form state
client validation
field errors
dirty state
submission
```

El backend sigue siendo la autoridad final sobre las reglas de negocio.

---

# 5. UI

```text
PrimeReact
PrimeIcons
TailwindCSS
```

pero con una regla arquitectónica obligatoria:

> Ninguna feature utilizará PrimeReact ni PrimeIcons directamente.

PrimeReact será un detalle de implementación de nuestro Design System.

---

# 6. Impeccable

Impeccable será parte oficial del proceso de desarrollo de vistas.

Toda vista significativa deberá pasar por:

```text
Requirements
     ↓
UX Flow
     ↓
Impeccable
     ↓
Layout / hierarchy / spacing
     ↓
Implementation
     ↓
Design System
     ↓
Responsive review
     ↓
Accessibility review
```

Impeccable se utilizará para trabajar:

```text
visual hierarchy
layout
spacing
density
typography
forms
tables
dashboards
navigation
empty states
loading states
error states
responsive design
interaction design
```

No será únicamente una herramienta de polish final.

---

# 7. Testing

```text
Vitest
React Testing Library
MSW
Playwright
```

---

# 8. Quality

```text
ESLint
Prettier
Husky
lint-staged
TypeScript strict
```

---

# 9. Arquitectura base

```text
src/
│
├── app/
│   ├── router/
│   │   └── router.tsx
│   │
│   ├── providers/
│   │   ├── app-providers.tsx
│   │   ├── query.provider.tsx
│   │   └── ui.provider.tsx
│   │
│   ├── layouts/
│   │   ├── app-layout.tsx
│   │   └── auth-layout.tsx
│   │
│   └── config/
│
├── features/
│   │
│   ├── auth/
│   ├── authorization/
│   ├── organizations/
│   │
│   ├── products/
│   ├── categories/
│   ├── inventory/
│   ├── stock-movements/
│   │
│   ├── suppliers/
│   ├── purchases/
│   │
│   ├── customers/
│   ├── sales/
│   │
│   ├── audit/
│   └── reports/
│
├── shared/
│   │
│   ├── api/
│   │   ├── generated/
│   │   ├── http-client.ts
│   │   └── query-client.ts
│   │
│   ├── ui/
│   ├── components/
│   ├── hooks/
│   ├── config/
│   ├── lib/
│   ├── types/
│   ├── utils/
│   └── constants/
│
├── assets/
├── main.tsx
└── vite-env.d.ts
```

---

# 10. Arquitectura general

```text
                         APP
                          │
           ┌──────────────┴─────────────┐
           │                            │
           ▼                            ▼
       Features                     App Shell
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
Feature API   Shared Components
    │             │
    ▼             ▼
TanStack       Shared UI
 Query            │
    │             ▼
    ▼         PrimeReact
HTTP Client   PrimeIcons
    │
    ▼
 Backend
```

Authentication tiene su propia frontera:

```text
Application
     ↓
features/auth
     ↓
Better Auth Client
     ↓
Better Auth Backend
```

---

# 11. Design System

PrimeReact no será utilizado directamente por las features.

Incorrecto:

```ts
import { Button } from "primereact/button";
```

dentro de:

```text
features/products
features/sales
features/inventory
```

Correcto:

```ts
import { Button } from "@/shared/ui";
```

---

# 12. `shared/ui`

Será nuestra capa de abstracción visual.

Inicialmente:

```text
shared/ui/
├── button/
├── icon/
├── input/
├── textarea/
├── select/
├── checkbox/
├── dialog/
├── drawer/
├── data-table/
├── pagination/
├── badge/
├── toast/
├── tooltip/
├── menu/
├── tabs/
├── date-picker/
├── confirm-dialog/
├── skeleton/
└── index.ts
```

Flujo:

```text
Feature
   ↓
shared/ui
   ↓
PrimeReact
```

---

# 13. Los tipos de PrimeReact tampoco deben escapar

Incorrecto:

```ts
import type { ButtonProps } from "primereact/button";

export interface AppButtonProps extends ButtonProps {}
```

Esto sigue acoplando nuestra aplicación a PrimeReact.

Preferir:

```ts
export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  children?: React.ReactNode;
}
```

Internamente:

```text
Our ButtonProps
       ↓
PrimeReact mapping
       ↓
PrimeReact Button
```

---

# 14. Regla para wrappers

Un wrapper no debe ser:

```text
PrimeReact component
+
otro nombre
```

Debe crear una API propia.

Por ejemplo:

```tsx
<Button variant="danger" />
```

y no:

```tsx
<Button severity="danger" />
```

si `severity` es terminología específica de PrimeReact.

---

# 15. PrimeIcons

Las features tampoco utilizarán PrimeIcons directamente.

Prohibido:

```tsx
<i className="pi pi-pencil" />
```

Permitido:

```tsx
<Icon name="edit" />
```

Nuestro wrapper:

```text
Icon "edit"
   ↓
PrimeIcon "pi-pencil"
```

Ejemplo:

```ts
type IconName =
  | "add"
  | "edit"
  | "delete"
  | "search"
  | "close"
  | "menu"
  | "user"
  | "settings"
  | "inventory"
  | "sales"
  | "purchase";
```

---

# 16. `shared/components`

`shared/components` contendrá composiciones genéricas construidas encima de `shared/ui`.

Ejemplos:

```text
PageContainer
PageHeader
SearchInput
FilterBar
FormField
EmptyState
ErrorState
LoadingState
ConfirmAction
MetricCard
DataView
```

Flujo:

```text
Feature
   ↓
Shared Component
   ↓
Shared UI
   ↓
PrimeReact
```

---

# 17. Componentes específicos del negocio

No deben terminar en `shared`.

Ejemplo:

```text
ProductTable
```

pertenece a:

```text
features/products/components/
```

Aunque internamente utilice:

```text
DataTable
```

de:

```text
shared/ui
```

---

# 18. Anatomía de una feature

```text
products/
├── api/
│   ├── product.api.ts
│   ├── product.queries.ts
│   └── product.mutations.ts
│
├── components/
│   ├── product-table.tsx
│   ├── product-form.tsx
│   ├── product-filters.tsx
│   └── product-status.tsx
│
├── pages/
│   ├── product-list.page.tsx
│   ├── product-create.page.tsx
│   └── product-edit.page.tsx
│
├── schemas/
│   └── product.schema.ts
│
├── hooks/
├── types/
├── utils/
└── index.ts
```

No todas las carpetas son obligatorias.

La feature crece únicamente cuando lo necesita.

---

# 19. Flujo de datos oficial

```text
Page
 ↓
Feature Component
 ↓
Feature Hook
 ↓
Query / Mutation
 ↓
Feature API
 ↓
HTTP Client
 ↓
Backend
```

Ejemplo:

```text
ProductListPage
       ↓
ProductTable
       ↓
useProducts()
       ↓
productsQuery
       ↓
productApi.findMany()
       ↓
HTTP Client
       ↓
Backend
```

---

# 20. Better Auth

La autenticación tendrá una arquitectura especial.

```text
features/auth/
├── api/
│   └── auth-client.ts
│
├── hooks/
│   ├── use-auth.ts
│   └── use-session.ts
│
├── components/
│   └── login-form.tsx
│
├── pages/
│   └── login.page.tsx
│
├── schemas/
│   └── login.schema.ts
│
├── guards/
│   └── protected-route.tsx
│
└── index.ts
```

---

# 21. Better Auth Client

Únicamente el módulo Auth deberá conocer directamente:

```text
better-auth/react
```

Conceptualmente:

```ts
createAuthClient(...)
```

vivirá en:

```text
features/auth/api/auth-client.ts
```

---

# 22. Better Auth como detalle de implementación

El resto de la aplicación no hará:

```ts
import { authClient } from "@/features/auth/api/auth-client";
```

ni:

```ts
import { createAuthClient } from "better-auth/react";
```

Utilizará:

```ts
import { useSession, useAuth } from "@/features/auth";
```

Flujo:

```text
Products
Inventory
Sales
AppLayout
      │
      ▼
features/auth public API
      │
      ▼
Better Auth
```

---

# 23. Sesión

Better Auth será la fuente de verdad para:

```text
session
authenticated user
authentication status
```

No Zustand.

Nuestro wrapper podrá normalizar:

```text
useSession()

├── session
├── user
├── isAuthenticated
├── isPending
├── error
└── refetch
```

sin importar cómo Better Auth represente internamente dichos conceptos.

---

# 24. Login flow

```text
LoginPage
   ↓
LoginForm
   ↓
useAuth()
   ↓
Better Auth Client
   ↓
Better Auth Server
   ↓
Session
   ↓
App
```

---

# 25. Session flow

```text
Application
    ↓
useSession()
    ↓
features/auth
    ↓
Better Auth Client
    ↓
Backend
```

---

# 26. Authentication vs Authorization

Mantener separados:

```text
Authentication
↓
¿Quién eres?
```

Better Auth.

```text
Authorization
↓
¿Qué puedes hacer?
```

Nuestro dominio de autorización.

Flujo:

```text
Better Auth Session
       ↓
User
       ↓
Authorization
       ↓
Permissions
       ↓
UI
```

---

# 27. FASE 0 — Project Bootstrap

Crear proyecto:

```text
React
TypeScript
Vite
```

Instalar/configurar:

```text
React Router
TanStack Query
Axios
Zustand
React Hook Form
Zod

Better Auth Client

PrimeReact
PrimeIcons
TailwindCSS

Vitest
React Testing Library
MSW

ESLint
Prettier
Husky
lint-staged
```

---

# 28. TypeScript

Activar:

```text
strict
```

Aliases:

```text
@/app
@/features
@/shared
```

---

# 29. Environment

Crear:

```text
shared/config/env.ts
```

Variables iniciales:

```text
VITE_API_URL
VITE_APP_NAME
```

Validarlas con Zod.

No usar:

```ts
import.meta.env.*
```

distribuido por la aplicación.

---

# 30. HTTP Client

Crear:

```text
shared/api/http-client.ts
```

Responsabilidades:

```text
baseURL
credentials
headers
timeout
error normalization
```

No:

```text
business rules
feature-specific behavior
```

---

# 31. Query Client

Crear:

```text
shared/api/query-client.ts
```

Definir convenciones iniciales para:

```text
staleTime
retry
refetch
error handling
```

---

# 32. Better Auth Client

Crear:

```text
features/auth/api/auth-client.ts
```

aunque todavía no construyamos la pantalla de login.

Esto deja preparada la infraestructura de autenticación.

---

# 33. Providers

```text
app/providers/
├── app-providers.tsx
├── query.provider.tsx
└── ui.provider.tsx
```

Flujo:

```text
main.tsx
 ↓
AppProviders
 ↓
Router
```

---

# FASE 1 — Design System Foundation

Antes de construir Products:

```text
shared/ui
```

Crear únicamente las primitivas inicialmente necesarias:

```text
Button
Icon
Input
Textarea
Select
Dialog
DataTable
Badge
Toast
Tooltip
Skeleton
```

No construir toda la biblioteca anticipadamente.

---

# FASE 2 — App Shell + Impeccable

Diseñar con Impeccable:

```text
AppLayout
Sidebar
Header
Navigation
Content Area
```

Estados:

```text
desktop
tablet
mobile
collapsed sidebar
```

Crear:

```text
app/layouts/app-layout.tsx
```

y:

```text
app/layouts/auth-layout.tsx
```

---

# FASE 3 — Products

Backend:

```text
/products
```

Frontend:

```text
features/products
```

Pantallas:

```text
/products

/products/new

/products/:uuid/edit
```

---

## Product List

Usar:

```text
PageContainer
PageHeader
SearchInput
FilterBar
DataTable
Badge
Button
Icon
```

Agregar:

```text
pagination
search
sorting
status filters
```

Estado importante en URL:

```text
/products?page=2&search=keyboard&status=active
```

---

## Product Form

```text
React Hook Form
      ↓
Zod
      ↓
Mutation
      ↓
Backend
```

Campos:

```text
SKU
Name
Description
Purchase Price
Sale Price
```

---

# FASE 4 — Categories

Crear:

```text
features/categories
```

Pantallas:

```text
/categories
```

Componentes:

```text
CategoryTable
CategoryForm
CategorySelector
```

Integración:

```text
ProductForm
    ↓
CategorySelector
```

Products deberá consumir la API pública de Categories.

---

# FASE 5 — Inventory

Crear:

```text
features/inventory
```

Pantalla:

```text
/inventory
```

Mostrar:

```text
Product
SKU
Current Stock
Minimum Stock
Status
Last Movement
```

Estados:

```text
IN_STOCK
LOW_STOCK
OUT_OF_STOCK
```

Crear:

```text
StockStatusBadge
```

utilizando internamente:

```text
shared/ui/Badge
```

---

# FASE 6 — Stock Movements

Crear:

```text
features/stock-movements
```

Componentes:

```text
StockEntryDialog
StockExitDialog
StockAdjustmentDialog
StockMovementTable
MovementTypeBadge
```

Regla:

```text
stock nunca se edita directamente
```

La UI únicamente ofrece:

```text
Entry
Exit
Adjustment
```

---

# FASE 7 — Authentication con Better Auth

Ahora construiremos la experiencia completa.

Crear:

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

---

## Login

```text
/login
```

Diseñarlo mediante:

```text
AuthLayout
+
Impeccable
```

---

## Better Auth

Implementar:

```text
sign in
sign out
session retrieval
```

y posteriormente según requisitos:

```text
sign up
forgot password
reset password
email verification
MFA
```

---

## ProtectedRoute

Debe distinguir:

```text
session loading
authenticated
unauthenticated
```

Flujo:

```text
Route
 ↓
useSession()
 ↓
pending?
 ↓
authenticated?
 ├── yes → render
 └── no  → login
```

---

## Logout

```text
Header
 ↓
User Menu
 ↓
Logout
 ↓
useAuth()
 ↓
Better Auth Client
```

---

# FASE 8 — Authorization

Crear:

```text
features/authorization
```

Implementar:

```text
usePermissions
PermissionGuard
Can
```

Ejemplo:

```tsx
<Can permission="product:create">
  <Button>Create Product</Button>
</Can>
```

---

## Route authorization

```text
/products/new
```

requiere:

```text
product:create
```

---

## Regla de seguridad

```text
hidden button
≠
authorization
```

El backend debe validar nuevamente.

---

# FASE 9 — Suppliers

Crear:

```text
features/suppliers
```

Vistas:

```text
/suppliers
/suppliers/new
/suppliers/:uuid
/suppliers/:uuid/edit
```

Aquí empezamos a consolidar patrones:

```text
List Page
Create Page
Detail Page
Edit Page
```

---

# FASE 10 — Purchases

Crear:

```text
features/purchases
```

Vistas:

```text
/purchases
/purchases/new
/purchases/:uuid
```

---

## Purchase Form

```text
Supplier

Items
├── Product
├── Quantity
├── Unit Cost
└── Subtotal

Subtotal
Total
```

Utilizar:

```text
React Hook Form
+
useFieldArray
```

---

## Posibles componentes reutilizables

Cuando aparezca reutilización real:

```text
MoneyInput
QuantityInput
LineItemsTable
SummaryPanel
```

podrán evolucionar hacia `shared`.

---

## Receive Purchase

Acción importante:

```text
Receive Purchase
```

requiere:

```text
confirmation
pending state
success state
error state
```

y posteriormente invalida:

```text
purchases
inventory
stock movements
reports
```

---

# FASE 11 — Customers

Crear:

```text
features/customers
```

Vistas:

```text
/customers
/customers/new
/customers/:uuid
/customers/:uuid/edit
```

Aplicar los patrones definidos anteriormente.

---

# FASE 12 — Sales

Crear:

```text
features/sales
```

Vistas:

```text
/sales
/sales/new
/sales/:uuid
```

---

## Sale Form

```text
Customer

Items
├── Product
├── Quantity
├── Unit Price
└── Subtotal

Discount
Subtotal
Total
```

---

## Concurrencia

El frontend podrá mostrar:

```text
available stock
```

pero no puede asumir que sigue siendo correcto.

Ejemplo:

```text
User A sees 10

User B buys 8

User A attempts 10

Backend
→ INSUFFICIENT_STOCK
```

La UI deberá:

```text
mostrar error
refetch stock
actualizar información
```

---

## Complete Sale

Acción crítica:

```text
Complete Sale
```

Debe esperar la respuesta del servidor.

No utilizar optimistic update.

---

## Cancel Sale

Una venta completada no deberá editarse silenciosamente.

Usar:

```text
Cancel Sale
```

como operación explícita.

---

# FASE 13 — Audit

Crear:

```text
features/audit
```

Pantalla:

```text
/audit
```

Componentes:

```text
AuditTable
AuditFilters
AuditDetailDrawer
```

Filtros:

```text
actor
action
entity
date
```

---

# FASE 14 — Reports

Crear:

```text
features/reports
```

Pantallas:

```text
/reports

/reports/inventory

/reports/sales

/reports/purchases
```

Utilizar Impeccable especialmente para:

```text
information hierarchy
dashboard density
scanability
data visualization
responsive layouts
```

---

# FASE 15 — Dashboard

Home:

```text
/
```

Evolucionar hacia:

```text
Dashboard
├── Sales today
├── Purchases
├── Current inventory
├── Low stock
├── Out of stock
├── Recent movements
├── Recent sales
└── Trends
```

Crear componentes reutilizables:

```text
MetricCard
ReportSection
ChartContainer
DateRangePicker
```

---

# FASE 16 — OpenAPI Integration

Backend:

```text
/openapi.json
```

Frontend:

```text
OpenAPI
   ↓
generated TypeScript contracts
   ↓
Feature API
   ↓
TanStack Query
```

Los contratos generados estarán en:

```text
shared/api/generated/
```

Evitar duplicar:

```text
ProductResponse
PurchaseResponse
SaleResponse
```

manualmente si ya vienen del contrato.

---

# FASE 17 — Error Model

Normalizar errores HTTP.

Por ejemplo:

```ts
interface ApiError {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
}
```

La UI debería trabajar con códigos:

```text
SKU_ALREADY_EXISTS
PRODUCT_NOT_FOUND
INSUFFICIENT_STOCK
UNAUTHORIZED
FORBIDDEN
```

y no interpretar strings del backend.

---

# FASE 18 — Query Architecture

Crear factories de query keys.

Ejemplo:

```text
productKeys.all

productKeys.lists()

productKeys.list(filters)

productKeys.detail(uuid)
```

Lo mismo para:

```text
inventory
purchases
sales
customers
```

---

# FASE 19 — Multi-Tenancy

Crear:

```text
features/organizations
```

Modelo frontend:

```text
User
 ↓
Organization
 ↓
Membership
 ↓
Permissions
```

---

## Organization Selector

Header:

```text
[ ACME Company ▼ ]
```

Cambio:

```text
Organization A
        ↓
Organization B
```

debe provocar aislamiento correcto de datos.

---

## Query keys

Incluir contexto del tenant:

```text
[
  "products",
  organizationId,
  filters
]
```

Evitar que cache del Tenant A aparezca temporalmente en Tenant B.

---

# FASE 20 — Membership Management

Vistas:

```text
/settings/members

/settings/roles
```

Dependiendo del modelo RBAC.

Integración:

```text
Better Auth
    ↓
User identity
    ↓
Organization membership
    ↓
Authorization
```

---

# FASE 21 — Design System Maturity

Cuando la aplicación crezca, `shared/ui` puede evolucionar:

```text
shared/ui/
│
├── actions/
│   ├── button/
│   └── icon-button/
│
├── forms/
│   ├── input/
│   ├── textarea/
│   ├── select/
│   ├── checkbox/
│   ├── date-picker/
│   ├── money-input/
│   └── quantity-input/
│
├── feedback/
│   ├── toast/
│   ├── badge/
│   ├── skeleton/
│   └── progress/
│
├── overlays/
│   ├── dialog/
│   ├── drawer/
│   ├── tooltip/
│   └── confirm-dialog/
│
├── navigation/
│   ├── tabs/
│   ├── menu/
│   └── breadcrumb/
│
├── data-display/
│   ├── data-table/
│   ├── pagination/
│   └── card/
│
└── icon/
```

Sólo cuando el tamaño del proyecto lo justifique.

---

# FASE 22 — UX Hardening con Impeccable

No revisar únicamente páginas.

Analizar workflows completos:

```text
Login

Create Product

Adjust Stock

Receive Purchase

Create Sale

Complete Sale

Cancel Sale

Organization Switch
```

Evaluar:

```text
number of interactions
hierarchy
clarity
feedback
errors
confirmation
responsive
keyboard navigation
information density
```

---

# FASE 23 — Performance

Introducir según mediciones:

```text
route lazy loading

code splitting

prefetching

virtualization

query cache tuning

memoization cuando corresponda
```

No optimizar anticipadamente.

---

# FASE 24 — Testing

## Design System

Probar especialmente:

```text
Button
Select
Dialog
DataTable
DatePicker
ConfirmDialog
```

porque constituyen nuestra frontera con PrimeReact.

---

## Authentication

Tests para:

```text
login success

login error

session loading

authenticated state

unauthenticated state

logout

protected routes
```

Better Auth deberá poder ser mockeado detrás de nuestra abstracción.

---

## Features

React Testing Library + MSW.

Ejemplo:

```text
ProductListPage
       ↓
Search
       ↓
API
       ↓
Updated table
```

---

# FASE 25 — E2E

Playwright.

## Flujo Inventory

```text
Login
 ↓
Create Category
 ↓
Create Product
 ↓
Stock Entry
 ↓
Verify Inventory
```

---

## Flujo Purchase

```text
Login
 ↓
Create Supplier
 ↓
Create Purchase
 ↓
Receive Purchase
 ↓
Verify Inventory Increased
```

---

## Flujo Sales

```text
Login
 ↓
Create Customer
 ↓
Create Sale
 ↓
Complete Sale
 ↓
Verify Inventory Decreased
```

---

## Authorization

```text
Login as Viewer
 ↓
Products
 ↓
cannot create
 ↓
restricted route blocked
```

---

## Multi-Tenant

```text
Login
 ↓
Tenant A
 ↓
view Product A
 ↓
switch Tenant B
 ↓
Product A unavailable
```

---

# FASE 26 — Accessibility

Nuestro Design System debe resolver gran parte de:

```text
focus
keyboard navigation
labels
aria
error descriptions
disabled states
contrast
dialog focus trapping
```

No repetir esta lógica en cada feature.

---

# FASE 27 — Observability

Registrar errores de frontend.

Correlacionar con backend mediante:

```text
requestId
```

Ejemplo:

```text
Something went wrong.

Reference:
req_018934...
```

No registrar:

```text
password
session token
cookies
secrets
```

---

# FASE 28 — Security Hardening

Reglas:

```text
Frontend
≠
security boundary
```

Nunca guardar secretos en:

```text
VITE_*
```

Evitar:

```text
tokens persistidos innecesariamente
session duplicada
unsanitized HTML
authorization únicamente visual
```

Better Auth gestionará sesión según su modelo configurado.

---

# FASE 29 — Production Deployment

Entornos:

```text
development
staging
production
```

Pipeline:

```text
install
 ↓
lint
 ↓
typecheck
 ↓
unit tests
 ↓
integration tests
 ↓
build
 ↓
E2E
 ↓
deploy
```

---

# 30. Reglas oficiales de dependencias

## UI

Permitido:

```text
Feature
  ↓
shared/components
  ↓
shared/ui
  ↓
PrimeReact
```

También:

```text
Feature
  ↓
shared/ui
```

Prohibido:

```text
Feature
  ↓
PrimeReact
```

---

# 31. Icons

Permitido:

```text
Feature
 ↓
Icon
 ↓
PrimeIcons
```

Prohibido:

```text
Feature
 ↓
PrimeIcons
```

---

# 32. Authentication

Permitido:

```text
Application
 ↓
features/auth
 ↓
Better Auth
```

Prohibido:

```text
Products
 ↓
Better Auth

Sales
 ↓
Better Auth

Inventory
 ↓
Better Auth
```

---

# 33. Data

Permitido:

```text
Feature
 ↓
Feature Query
 ↓
Feature API
 ↓
HTTP Client
```

Evitar:

```text
React Component
 ↓
Axios
```

directamente.

---

# 34. Feature communication

Una feature puede consumir la API pública de otra:

```ts
import { ProductSelector } from "@/features/products";
```

Evitar:

```ts
import { something } from "@/features/products/internal/...";
```

Cada:

```text
index.ts
```

funciona como frontera pública.

---

# 35. ESLint architectural boundaries

Estas reglas deberán automatizarse.

Por ejemplo:

```text
features/**
```

no puede importar:

```text
primereact/*
primeicons/*
better-auth/*
```

con la excepción:

```text
features/auth/**
```

para Better Auth.

`shared/ui/**` podrá importar:

```text
primereact/*
primeicons/*
```

---

# 36. Secuencia oficial completa

```text
00. Project Bootstrap

01. Design System Foundation

02. App Shell + Impeccable

03. Products

04. Categories

05. Inventory

06. Stock Movements

07. Authentication + Better Auth

08. Authorization

09. Suppliers

10. Purchases

11. Customers

12. Sales

13. Audit

14. Reports

15. Dashboard

16. OpenAPI Contracts

17. API Error Model

18. Query Architecture

19. Multi-Tenancy

20. Membership Management

21. Design System Maturity

22. UX Hardening + Impeccable

23. Performance

24. Testing

25. E2E

26. Accessibility

27. Observability

28. Security Hardening

29. Production Deployment
```

---

# 37. Desarrollo backend/frontend en paralelo

Orden recomendado:

```text
BACKEND                         FRONTEND

Bootstrap                  →    Bootstrap

Products                   →    Products

Categories                 →    Categories

Inventory                  →    Inventory

Stock Movements            →    Stock Movements

Better Auth Server         →    Better Auth Client

Authorization              →    Authorization UI

Suppliers                  →    Suppliers

Purchases                  →    Purchases

Customers                  →    Customers

Sales                      →    Sales

Audit                      →    Audit

Reports                    →    Dashboard / Reports

Organizations              →    Multi-Tenant UI
```

No recomiendo construir primero todo el backend y después todo el frontend.

Preferir:

```text
Backend feature
      ↓
Frontend feature
      ↓
Integration
      ↓
Tests
      ↓
next feature
```

---

# 38. Arquitectura objetivo final

```text
                         APPLICATION
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
      Features          Authentication        App Shell
         │                    │
         │                    ▼
         │              features/auth
         │                    │
         │                    ▼
         │               Better Auth
         │
   ┌─────┴─────┐
   │           │
   ▼           ▼
UI layer    Data layer
   │           │
   ▼           ▼
shared/ui   TanStack Query
   │           │
   ▼           ▼
PrimeReact  Feature APIs
PrimeIcons      │
               ▼
           HTTP Client
               │
               ▼
             Backend
```

---

# 39. Criterio para cambiar PrimeReact

Nuestro objetivo arquitectónico será que, si algún día:

```text
PrimeReact
```

se reemplaza por:

```text
Material UI
Radix
Mantine
custom components
etc.
```

las features:

```text
Products
Inventory
Sales
Purchases
Reports
Customers
```

no tengan que modificarse de forma significativa.

Idealmente cambia:

```text
shared/ui
```

y no el negocio.

---

# 40. Criterio para cambiar Better Auth

La misma filosofía se aplicará a Authentication.

Actualmente:

```text
Application
 ↓
features/auth
 ↓
Better Auth
```

Si algún día se reemplaza Better Auth:

```text
Application
 ↓
features/auth
 ↓
New Auth Provider
```

idealmente:

```text
Products
Inventory
Sales
Reports
AppLayout
```

no cambian.

---

# 41. Principios oficiales

1. La arquitectura principal es Feature-Driven.

2. Las features representan capacidades funcionales del producto.

3. PrimeReact es un detalle de implementación.

4. PrimeIcons es un detalle de implementación.

5. Better Auth es un detalle de implementación del módulo Authentication.

6. Las features nunca utilizan PrimeReact directamente.

7. Las features nunca utilizan PrimeIcons directamente.

8. Sólo `features/auth` utiliza Better Auth directamente.

9. Los wrappers de UI tienen una API propia.

10. Los tipos de PrimeReact no deben escapar de `shared/ui`.

11. `shared/ui` contiene primitivas.

12. `shared/components` contiene composiciones reutilizables.

13. Componentes específicos del negocio permanecen en su feature.

14. TanStack Query administra server state.

15. Better Auth administra authentication/session state.

16. Zustand administra client/UI state.

17. React Hook Form administra form state.

18. React Router/URL administra estado navegable.

19. No se duplica server state en Zustand.

20. No se duplica session state en Zustand.

21. Los componentes no utilizan Axios directamente.

22. Cada feature tiene su API pública.

23. Las features no dependen de detalles internos de otras features.

24. OpenAPI será la fuente preferida para contratos HTTP.

25. El frontend mejora UX, pero el backend sigue siendo autoritativo.

26. Ocultar una acción no equivale a autorización.

27. Las operaciones críticas esperan confirmación del backend.

28. Impeccable forma parte obligatoria del desarrollo de vistas significativas.

29. El Design System debe resolver consistencia visual y accesibilidad transversal.

30. Las abstracciones crecen cuando aparece una necesidad real.

---

# 42. Regla final

La arquitectura completa puede resumirse así:

```text
             PRODUCT / BUSINESS UI
                      │
                Feature Layer
                 /         \
                /           \
               ▼             ▼
        Presentation       Data
             │              │
             ▼              ▼
        Shared UI      TanStack Query
             │              │
             ▼              ▼
        PrimeReact      Feature API
        PrimeIcons          │
                            ▼
                       HTTP Client
                            │
                            ▼
                          Backend


Authentication:

Application
     │
     ▼
features/auth
     │
     ▼
Better Auth
     │
     ▼
Backend Auth
```

La aplicación deberá depender de nuestras propias fronteras:

```text
shared/ui
features/auth
feature APIs
```

y no directamente de las tecnologías que utilizamos para implementarlas.

De esta manera podemos cambiar:

```text
PrimeReact

Better Auth

HTTP implementation

UI implementation
```

con un impacto localizado y controlado, mientras la mayor parte de las features continúa funcionando sin cambios estructurales.
