/**
 * Tip Calculator — OPEN-ENDED exercise.
 *
 * There is no scaffold. YOU own the layout, the elements, the styling, and the
 * component breakdown. The platform only checks a small set of `data-testid`s
 * and the text they show. Build whatever structure you like — you may add your
 * own `.css` / `.ts` / `.tsx` files in this folder and import them with flat,
 * same-folder paths (e.g. `import "./styles.css"`).
 *
 * The harness renders this default-exported `App`. See README.md for the full
 * spec and the exact rules the tests pin down.
 *
 * Required test IDs (this is the whole contract):
 *   Inputs  — "bill-input", "tip-input", "party-size-input"
 *   Outputs — "tip-amount", "total-amount", "per-person-amount"
 *
 * Behavior to satisfy (see README for the precise rules):
 *   - tip amount = bill × tip%          (shown to 2 decimals)
 *   - total      = bill + tip           (shown to 2 decimals)
 *   - per-person = total / party size   (shown to 2 decimals)
 *   - empty / non-numeric bill and tip%  → treat as 0
 *   - party size < 1 / empty / invalid   → treat as 1 (guards divide-by-zero)
 *
 * TODO: build it. The starter below fails every test on purpose.
 */
export default function App() {
  return <div className="exercise-tip-calc">{/* TODO: build the tip calculator */}</div>;
}
