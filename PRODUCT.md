# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Personal de operación de pequeñas empresas que consulta existencias y gestiona las operaciones diarias de inventario, compras y ventas. Responsables de diseño y desarrollo revisan las primitivas mediante la demostración de desarrollo.

## Product Purpose

Inventory es el frontend de un sistema de gestión de inventario cuya ruta evoluciona hacia compras, ventas, mini ERP y SaaS multi-tenant. El resultado esperado es que el personal operativo pueda completar esas tareas desde una aplicación web; las pantallas de negocio todavía no forman parte de la fase implementada.

## Positioning

No se ha definido un mecanismo diferencial ni una promesa competitiva. La interfaz no debe inventar ventajas o claims más allá del alcance documentado.

## Operating Context

Uso diario en navegador por personal que necesita consultar y administrar operaciones de inventario, compras y ventas. La fase actual establece primitivas y una demostración de desarrollo revisable sin backend ni credenciales.

## Capabilities and Constraints

- La Fase 0 de bootstrap está implementada; la Fase 1 establece once primitivas compartidas y una demostración solo de desarrollo.
- Las capacidades de negocio indicadas por la ruta son futuras; la demostración usa datos ficticios y no accede al backend.
- La UI se implementa con contratos propios en `src/shared/ui`; PrimeReact y PrimeIcons permanecen encapsulados.
- El backend conserva la autoridad sobre reglas de negocio y autorización.

## Brand Commitments

No hay logo, paleta, tipografía, referencia visual ni otras restricciones de marca confirmadas. No inventar marca ni activos comerciales.

## Evidence on Hand

Las fuentes de alcance son `docs/ruta.md`, `docs/constitution.md`, `docs/estructura.md` y las specs aprobadas. No hay logos, datos reales, testimonios, benchmarks ni precios disponibles. Los datos de la demostración deben ser ficticios.

## Product Principles

- Representar con claridad los estados operativos confirmados y pendientes.
- Mantener las decisiones de negocio y los datos del servidor bajo sus responsables definidos.
- Ofrecer primitivas reutilizables sin acoplar a sus consumidores a la biblioteca visual subyacente.

## Accessibility & Inclusion

La base compartida debe permitir uso por teclado, foco visible, nombres y errores accesibles, contraste conforme a los requisitos aprobados, movimiento reducido y uso a un ancho de 360 píxeles.
