/**
 * Pricing Page — OPEN-ENDED exercise.
 *
 * There is no scaffold. YOU own the layout, the elements, the styling, and the
 * component breakdown. The platform only checks a small set of `data-testid`s,
 * the text they show, and how they respond to clicks. Build whatever structure
 * you like — you may add your own `.css` / `.ts` / `.tsx` files in this folder
 * and import them with flat, same-folder paths (e.g. `import "./styles.css"`).
 *
 * The harness renders this default-exported `App`. See README.md for the full
 * spec and the exact rules the tests pin down.
 *
 * Required test IDs (this is the whole contract):
 *   Billing  — "billing-monthly", "billing-annual"   (default: monthly)
 *   Prices   — "price-starter", "price-pro", "price-enterprise"
 *   CTAs     — "select-starter", "select-pro", "select-enterprise"
 *   Readout  — "selected-plan"                        (starts "None")
 *   Featured — "featured-plan"                        (names the Pro tier)
 *
 * Behavior to satisfy (see README for the precise rules):
 *   - Monthly prices are fixed: Starter $9, Pro $29, Enterprise $99.
 *   - Prices render as "$<n>" (dollar sign + whole number, no decimals).
 *   - Annual = round(monthly × 0.8) per month → $7 / $23 / $79. Toggling
 *     monthly⇄annual updates ALL THREE price displays.
 *   - "selected-plan" starts "None"; clicking a plan CTA sets it to that
 *     plan's name ("Starter" / "Pro" / "Enterprise").
 *   - "featured-plan" shows the featured tier's name, "Pro".
 *
 * TODO: build it. The starter below fails every test on purpose.
 */
export default function App() {
  return <div className="exercise-pricing">{/* TODO: build the pricing page */}</div>;
}
