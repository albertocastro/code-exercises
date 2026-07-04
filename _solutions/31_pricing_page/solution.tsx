import { useState } from "react";

/**
 * Reference solution for the "Pricing Page" open-ended exercise.
 *
 * This is the ORACLE the tests were written against. It is intentionally kept
 * out of the IDE (the shipped starter is a near-empty App). Layout, elements,
 * and styling here are just ONE valid way to satisfy the test-ID contract —
 * the exercise leaves all of that to the learner.
 *
 * Contract (see react/31_pricing_page/README.md):
 *   Billing   — "billing-monthly", "billing-annual"  (default: monthly)
 *   Prices    — "price-starter", "price-pro", "price-enterprise"
 *   CTAs      — "select-starter", "select-pro", "select-enterprise"
 *   Readout   — "selected-plan"   (starts "None")
 *   Featured  — "featured-plan"   (text is the featured plan name, "Pro")
 *
 * Rules:
 *   - Monthly prices are fixed: Starter 9, Pro 29, Enterprise 99.
 *   - Prices render as "$<n>" with a leading dollar sign and a whole number
 *     (no decimals, no "/mo") — e.g. "$9".
 *   - Annual toggles to the effective per-month price billed annually at
 *     20% off: annual = Math.round(monthly * 0.8) → Starter $7, Pro $23,
 *     Enterprise $79. Toggling updates ALL three price displays.
 *   - Default billing is monthly.
 *   - selected-plan starts at "None"; clicking a plan's CTA sets it to that
 *     plan's display name ("Starter" / "Pro" / "Enterprise").
 *   - featured-plan names the featured tier, "Pro".
 */

type PlanId = "starter" | "pro" | "enterprise";

const PLANS: { id: PlanId; name: string; monthly: number }[] = [
  { id: "starter", name: "Starter", monthly: 9 },
  { id: "pro", name: "Pro", monthly: 29 },
  { id: "enterprise", name: "Enterprise", monthly: 99 },
];

const FEATURED: PlanId = "pro";

/** 20%-off annual, shown as the effective monthly price. */
function annualPrice(monthly: number): number {
  return Math.round(monthly * 0.8);
}

export default function App() {
  const [annual, setAnnual] = useState(false);
  const [selected, setSelected] = useState<PlanId | null>(null);

  const selectedName =
    selected === null ? "None" : PLANS.find((p) => p.id === selected)!.name;
  const featuredName = PLANS.find((p) => p.id === FEATURED)!.name;

  return (
    <div className="exercise-pricing">
      <div className="exercise-pricing-billing">
        <button
          type="button"
          data-testid="billing-monthly"
          aria-pressed={!annual}
          onClick={() => setAnnual(false)}
        >
          Monthly
        </button>
        <button
          type="button"
          data-testid="billing-annual"
          aria-pressed={annual}
          onClick={() => setAnnual(true)}
        >
          Annual
        </button>
      </div>

      <div className="exercise-pricing-status">
        Selected plan: <span data-testid="selected-plan">{selectedName}</span>
      </div>

      <div className="exercise-pricing-tiers">
        {PLANS.map((plan) => {
          const price = annual ? annualPrice(plan.monthly) : plan.monthly;
          const isFeatured = plan.id === FEATURED;
          return (
            <div
              key={plan.id}
              className={
                "exercise-pricing-card" +
                (isFeatured ? " exercise-pricing-card-featured" : "")
              }
            >
              <h3>{plan.name}</h3>
              {isFeatured && (
                <span data-testid="featured-plan">{featuredName}</span>
              )}
              <div data-testid={`price-${plan.id}`}>${price}</div>
              <button
                type="button"
                data-testid={`select-${plan.id}`}
                onClick={() => setSelected(plan.id)}
              >
                Choose {plan.name}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
