import { useState } from "react";

export interface StarRatingProps {
  max?: number;
  value?: number;        // controlled rating
  defaultValue?: number; // uncontrolled starting rating
  onChange?: (value: number) => void;
  readOnly?: boolean;
}

/**
 * Build a Star Rating widget. See README.md for the per-level spec.
 *
 * The tests rely on:
 *   - each star is a <button> with accessible name "1 star", "2 stars", …
 *   - a star is "filled" when its button has aria-pressed="true"
 */
export function StarRating(props: StarRatingProps) {
  const { max = 5 } = props;
  const [, setValue] = useState(props.defaultValue ?? 0);

  // TODO Level 1: render `max` star buttons; clicking star N fills 1..N.
  // TODO Level 2: previewing on hover (mouseEnter), restoring on mouseLeave.
  // TODO Level 3: support controlled `value` + `onChange`, `readOnly`,
  //   and clearing by clicking the current rating again.

  return (
    <div role="radiogroup" aria-label="rating">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button key={n} type="button" aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={false}>
          ☆
        </button>
      ))}
    </div>
  );
}
