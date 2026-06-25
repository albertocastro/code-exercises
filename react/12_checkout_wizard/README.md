# React 12 — Checkout Wizard

**Estimated time:** 35–50 minutes
**Goal:** Multi-step flow with state carried across steps and per-step validation.

You edit `solution.tsx`.

## Contract
```ts
interface CheckoutData { name: string; address: string; card: string; }
interface WizardProps { onComplete?: (data: CheckoutData) => void; }
```
Steps: **Shipping** (name, address) → **Payment** (card) → **Review**. The tests
rely on a `data-testid="step-indicator"`, a heading per step, **Next/Back/Complete**
buttons, a `data-testid="review"`, and a `data-testid="step-error"`.

## Levels
1. **Navigation** — Next/Back move through the steps.
2. **Validation** — block Next until the current step is valid; show `step-error`.
3. **Review + complete** — Review shows the entered data; Complete reports it
   via `onComplete`.
