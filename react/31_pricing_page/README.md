# React 31 — Pricing Page (open-ended)

**Estimated time:** 40–60 minutes
**Type:** Open-ended — single suite, all-or-nothing (no levels)
**Goal:** Build a 3-tier pricing / plan comparison page with a monthly/annual
billing toggle, per-plan prices and CTAs, a selection readout, and a featured
tier. Unlike the leveled exercises, **there is no prescribed layout, component
structure, or starter scaffold.** You decide how it looks and how it's built.
The platform only checks a handful of `data-testid`s, the text they display, and
how they respond to clicks.

You edit `solution.tsx`, which **default-exports an `App` component** (no props —
the harness renders `<App />` directly). Run from the CLI (`npm start` → React →
Pricing Page) or:

```bash
npx vitest run react/31_pricing_page   # one shot, all tests
npx vitest react/31_pricing_page       # watch mode
```

The shipped starter fails every test on purpose — that's your signal to start
building.

---

## You own everything except the contract

- **Layout, elements, and styling are entirely up to you.** Toggle controls can
  be buttons, tabs, a switch — anything clickable. Prices and the readout can be
  any node whose text you control. CTAs can be any clickable element. Use one
  component or ten.
- You may **add your own files** in this folder — e.g. `styles.css`, a
  `pricing.ts` helper, extra `.tsx` components — and import them with **flat,
  same-folder paths**: `import "./styles.css"`, `import { plans } from "./pricing"`.
  (Use the **"+ Add file"** control in the IDE.)
- The tests never look at tag names, DOM structure, CSS classes, or ARIA roles.
  They query **only by `data-testid`**, read the **visible text**, and drive
  **clicks**. Hitting the contract below is the entire job.

---

## The contract — required `data-testid`s

### Billing toggle (two clickable controls)

| `data-testid`     | Meaning                                          |
| ----------------- | ------------------------------------------------ |
| `billing-monthly` | Switches all prices to the **monthly** view.     |
| `billing-annual`  | Switches all prices to the **annual** view.      |

Default billing is **monthly** — before any click, the monthly prices show.

### Price displays (readable text you render)

| `data-testid`      | Shows                                           |
| ------------------ | ----------------------------------------------- |
| `price-starter`    | Starter tier price for the current billing.     |
| `price-pro`        | Pro tier price for the current billing.         |
| `price-enterprise` | Enterprise tier price for the current billing.  |

### Plan CTAs (clickable "choose this plan" controls)

| `data-testid`      | On click, selects…       |
| ------------------ | ------------------------ |
| `select-starter`   | the Starter plan.        |
| `select-pro`       | the Pro plan.            |
| `select-enterprise`| the Enterprise plan.     |

### Selection readout & featured marker

| `data-testid`   | Shows                                                        |
| --------------- | ----------------------------------------------------------- |
| `selected-plan` | The selected plan's **name**; **`"None"`** before any pick. |
| `featured-plan` | The featured tier's **name**, which is **`"Pro"`**.         |

---

## The rules (these are what the tests pin down)

1. **Fixed monthly prices.** Starter = `9`, Pro = `29`, Enterprise = `99`.
2. **Price format is `"$<n>"`** — a leading dollar sign and a **whole number**,
   nothing else. So monthly renders `"$9"`, `"$29"`, `"$99"`. No decimals, no
   `/mo`, no thousands separators.
3. **Default is monthly.** On first render (and after clicking `billing-monthly`)
   the three displays show `"$9"`, `"$29"`, `"$99"`.
4. **Annual = 20% off, shown as the effective monthly price, rounded.**
   `annual = Math.round(monthly × 0.8)`. So:
   - Starter: `round(9 × 0.8)` = `round(7.2)` = **`$7`**
   - Pro: `round(29 × 0.8)` = `round(23.2)` = **`$23`**
   - Enterprise: `round(99 × 0.8)` = `round(79.2)` = **`$79`**

   Clicking `billing-annual` updates **all three** price displays at once;
   clicking `billing-monthly` again restores `"$9" / "$29" / "$99"`.
5. **Selection starts empty.** `selected-plan` reads **`"None"`** until a CTA is
   clicked. Clicking `select-<tier>` sets it to that tier's display name —
   `"Starter"`, `"Pro"`, or `"Enterprise"` — and clicking a different CTA moves
   the selection.
6. **Selection and billing are independent.** Toggling billing must not clear the
   selection, and selecting a plan must not change the billing view.
7. **Featured tier.** `featured-plan`'s text is the featured plan's name, `"Pro"`.

---

## Constraints

- Prices are **derived from the current billing mode** — recompute them on every
  toggle rather than storing stale values.
- Emit the exact strings the tests compare: `"$9"`, `"$29"`, `"$99"` (monthly)
  and `"$7"`, `"$23"`, `"$79"` (annual). Use `Math.round(monthly * 0.8)` for the
  annual figures so the rounding matches.
- `selected-plan` must read exactly `"None"` in the initial state, then the exact
  plan name after a pick.
- The only public surface is the default-exported `App`. Don't rely on props;
  the harness passes none.
