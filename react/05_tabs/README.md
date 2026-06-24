# React 5 — Tabs

**Estimated time:** 30–45 minutes
**Goal:** Composition with `ReactNode`, conditional rendering, ARIA roles, and
accessible keyboard interaction.

You edit `solution.tsx`. Run from the CLI (`npm start` → React → Tabs) or:

```bash
LEVEL=1 npx vitest run react/05_tabs
npx vitest react/05_tabs
```

---

## Component contract

```ts
interface TabItem { label: string; content: React.ReactNode; }
interface TabsProps { tabs: TabItem[]; defaultIndex?: number; }
```

---

## Level 1 — Switch panels

Render a trigger per tab. Show the panel of the active tab only (default the
first, or `defaultIndex`). Clicking a trigger activates its panel.

> Level 1 is checked by visible text only — no ARIA required yet.

## Level 2 — ARIA roles

Triggers become `role="tab"` with `aria-selected` on the active one. Wrap them in
`role="tablist"`. The active panel is `role="tabpanel"`, and **only** the active
panel is in the DOM.

## Level 3 — Keyboard navigation

On the tablist: **ArrowRight / ArrowLeft** move the active tab (wrapping at the
ends), **Home / End** jump to the first / last tab.
