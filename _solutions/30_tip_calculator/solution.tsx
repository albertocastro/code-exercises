import { useState } from "react";

/**
 * Reference solution for the "Tip Calculator" open-ended exercise.
 *
 * This is the ORACLE the tests were written against. It is intentionally kept
 * out of the IDE (the shipped starter is a near-empty App). Layout, elements,
 * and styling here are just ONE valid way to satisfy the test-ID contract —
 * the exercise leaves all of that to the learner.
 *
 * Contract (see react/30_tip_calculator/README.md):
 *   Inputs  — bill-input, tip-input, party-size-input
 *   Outputs — tip-amount, total-amount, per-person-amount (all "X.XX")
 *
 * Rules:
 *   - Bill and tip% parse as numbers; empty / non-numeric -> 0.
 *   - Party size is at least 1: empty / 0 / negative / non-integer / non-numeric
 *     is treated as 1 (this is the divide-by-zero guard).
 *   - tip       = bill * (tip% / 100)
 *   - total     = bill + tip
 *   - perPerson = total / partySize
 *   - Every money output is rendered to exactly 2 decimals.
 */

/** Parse a money-ish field. Empty or non-numeric becomes 0. */
function parseMoney(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Party-size guard: anything that isn't a whole number >= 1 becomes 1. */
function parseParty(raw: string): number {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

export default function App() {
  const [bill, setBill] = useState("");
  const [tipPct, setTipPct] = useState("");
  const [party, setParty] = useState("");

  const billValue = parseMoney(bill);
  const tipPctValue = parseMoney(tipPct);
  const partyValue = parseParty(party);

  const tip = billValue * (tipPctValue / 100);
  const total = billValue + tip;
  const perPerson = total / partyValue;

  const money = (n: number) => n.toFixed(2);

  return (
    <div className="exercise-tip-calc">
      <div className="exercise-tip-inputs">
        <label className="exercise-tip-field">
          <span>Bill amount</span>
          <input
            data-testid="bill-input"
            type="number"
            inputMode="decimal"
            value={bill}
            onChange={(e) => setBill(e.target.value)}
          />
        </label>

        <label className="exercise-tip-field">
          <span>Tip percentage</span>
          <input
            data-testid="tip-input"
            type="number"
            inputMode="decimal"
            value={tipPct}
            onChange={(e) => setTipPct(e.target.value)}
          />
        </label>

        <label className="exercise-tip-field">
          <span>Party size</span>
          <input
            data-testid="party-size-input"
            type="number"
            inputMode="numeric"
            value={party}
            onChange={(e) => setParty(e.target.value)}
          />
        </label>
      </div>

      <dl className="exercise-tip-outputs">
        <div className="exercise-tip-out">
          <dt>Tip</dt>
          <dd data-testid="tip-amount">{money(tip)}</dd>
        </div>
        <div className="exercise-tip-out">
          <dt>Total</dt>
          <dd data-testid="total-amount">{money(total)}</dd>
        </div>
        <div className="exercise-tip-out">
          <dt>Per person</dt>
          <dd data-testid="per-person-amount">{money(perPerson)}</dd>
        </div>
      </dl>
    </div>
  );
}
