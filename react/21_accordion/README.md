# React 21 — Accordion (compound component)

**Estimated time:** 35–45 minutes
**Goal:** The compound-component pattern (shared state via context) plus ARIA.

You edit `solution.tsx` (exports `Accordion` + `AccordionItem`).

## Usage
```tsx
<Accordion allowMultiple={false}>
  <AccordionItem title="A">…</AccordionItem>
  <AccordionItem title="B">…</AccordionItem>
</Accordion>
```
Each item's header is a button (name = title) with `aria-expanded`; panel
content is only present when expanded.

## Levels
1. **Toggle items** — each header expands/collapses its own panel.
2. **Single-open** — opening one item closes the others (coordinate via context).
3. **allowMultiple** — when set, multiple panels may stay open.
