# App Shell — brief de dirección visual

## Scope and visitor mode

Operate. Superficie de aplicación para personal de operación de pequeñas empresas. Extiende el Design System existente hacia App Shell, sin convertir la demo de primitivas en aplicación ni añadir destinos futuros a la navegación.

## Audience and task

La persona llega para orientarse, reconocer la sesión activa y acceder a los destinos de trabajo disponibles. En esta fase solo existe Inicio. Debe entender que ha llegado a Inventory y encontrar la bienvenida sin métricas simuladas.

## Content and constraints

Mostrar Inventory, Inicio, una bienvenida breve, el correo público de sesión y Cerrar sesión. Mostrar estados de comprobación, error recuperable y sesión no iniciada con su layout separado. Conservar los tokens y la tipografía del Design System; usar texto explícito para destinos y estados. No trasladar al shell la metáfora de ticket de reparación de la demostración. Compacto por debajo de 1024 px, incluido 768 px; sidebar persistente desde 1024 px, incluido 1280 px.

## Direction

Carril persistente + cabecera contextual: la navegación de trabajo permanece anclada a la izquierda y el área de contenido lleva una cabecera ligera con ubicación y cuenta. La página Inicio utiliza un canvas amplio y limpio. La señal de ruta del destino activo y la regla corta sobre la bienvenida comparten alineación y teal, de modo que la ubicación se reconoce sin añadir paneles de datos.

## Direction contract

**THESIS:** La página actual y su destino activo comparten una señal de ruta clara, manteniendo navegación y contenido familiares para una aplicación de operación.

**OWN-WORLD:** Heredar el canvas gris verdoso, las superficies blancas, la tinta grafito, el teal funcional, el sans de sistema, los bordes finos y las escalas del Design System. La sidebar usa una superficie teal-tintada de extremo a extremo; el activo y la regla de ubicación usan el teal existente. No incorporar textura, iconografía de reparación ni vocabulario de tickets.

**STORY:** La persona reconoce Inventory, ve Inicio como destino disponible, identifica su cuenta, encuentra una bienvenida breve y puede cerrar sesión. Sin datos ficticios ni promesas de capacidades pendientes.

**FIRST VIEWPORT:** A 1440 × 900, sidebar persistente a la izquierda con Inventory, Inicio activo y control de contraer. En el área de trabajo, una cabecera blanca contiene Inicio a la izquierda y correo público más Cerrar sesión a la derecha. Debajo, el título de bienvenida y una frase corta se alinean al margen del destino activo mediante una sola regla teal. A 1280 px la sidebar sigue persistente; por debajo de 1024 px se convierte en panel compacto, cerrado inicialmente. A 768 y 360 px, el acceso al panel y el contenido continúan disponibles.

**FORM:** Carril persistente + cabecera contextual; quinta de siete composiciones estructurales fundamentadas; seed key `fc219015`. Seleccionada por el usuario en la ronda de Impeccable. La navegación compacta conserva controles web familiares. Disciplina incorporada: nombres de destinos explícitos y un canvas de trabajo coherente, sin significado codificado solo en color, icono o paneles decorativos.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
