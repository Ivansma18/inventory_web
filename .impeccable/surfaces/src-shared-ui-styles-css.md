---
version: 1
slug: "src-shared-ui-styles-css"
primary_target: "src/shared/ui/styles.css"
related_targets: []
---

# Design System Foundation

## Scope and visitor mode

Operate: shared visual direction for the eleven Design System primitives and their development-only component showcase.

## Audience and task

Inventory serves small-business operations staff. In this phase, developers and design/QA reviewers use the showcase to inspect standard controls, real component states, and interaction behavior without backend data.

## Content and constraints

Keep examples generic to Inventory. Do not introduce App Shell, business screens, repair workflows, backend access, or unsupported product claims. Preserve keyboard use, visible focus, accessible text, reduced motion, and responsive behavior to 360 px.

## Direction

Service Ticket Signal: the visual grammar of a small repair-shop work ticket translated into a generic, state-readable component system.

## Direction contract

**THESIS:** Service Ticket Signal gives every sample a one-glance rhythm: identifier, current state, next action; familiar controls remain standard web UI.

**OWN-WORLD:** A cool light-neutral canvas carries graphite ink, muted teal for steady state, amber for pending and brick for errors. UI sans sets labels; tabular figures and monospaced IDs add precision. Keep groups compact but separated, with crisp 1 px borders and a narrow status band plus visible text label. Use offset high-contrast keyboard focus. Motion is brief and nonessential; disable it under `prefers-reduced-motion`.

**STORY:** Reviewers browse the primitive index, test real examples, and see state changes. Future operators get the same direct reading without inheriting a repair-shop fiction.

**FIRST VIEWPORT:** Put the page heading first, a primitive index beside functional examples on desktop. At 360 px, make the index horizontal and stack examples; only DataTable may scroll locally. No business navigation, dashboard, or fake repair records.

**FORM:** Service Ticket Signal; fourth of seven grounded candidates; seed key `4f3d7c41`. The ticket grammar informs hierarchy and status treatment only—not layout, repair vocabulary, textures, or new product capabilities.

**FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
