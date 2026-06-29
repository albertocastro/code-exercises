# React 2 — Star Rating

**Estimated time:** 25–35 minutes
**Goal:** Derived UI state, hover preview, and the controlled vs. uncontrolled pattern.

You edit `solution.tsx`. Run from the CLI (`npm start` → React → Star Rating) or:

```bash
LEVEL=1 npx vitest run react/02_star_rating
npx vitest react/02_star_rating
```

---

## Component contract

```ts
interface StarRatingProps {
  max?: number;          // number of stars, default 5
  value?: number;        // controlled rating (component does not self-update)
  defaultValue?: number; // uncontrolled starting rating, default 0
  onChange?: (value: number) => void;
  readOnly?: boolean;
}
```

The tests rely on:

- Each star is a `<button>` with accessible name **"1 star"**, **"2 stars"**, …
- A star is **filled** when its button has `aria-pressed="true"`.

---

## Level 1 — Click to rate

Render `max` stars. Clicking star N fills stars 1..N. Re-clicking another star
updates the rating.

## Level 2 — Hover preview

Hovering a star previews that fill (`mouseEnter`). Moving the mouse away
(`mouseLeave`) restores the actual rating.

## Level 3 — Controlled, readOnly, clear

- `defaultValue` sets the initial rating for uncontrolled usage.
- When `value` is provided the component is **controlled**: it shows `value` and
  fires `onChange` but does not change what it displays on its own.
- `readOnly` disables all interaction: clicks do not change the rating, clicks
  do not fire `onChange`, and hover does not preview a different fill.
- Clicking the current rating again **clears** it to `0`.
