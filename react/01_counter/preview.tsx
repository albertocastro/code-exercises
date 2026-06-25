import { useState } from "react";
import { Counter } from "./solution";

// Interactive harness: tweak the props the tests use (step, min, max, initial)
// and watch the component + the onChange log. Handy for debugging higher levels.
export default function Demo() {
  const [initial, setInitial] = useState(0);
  const [step, setStep] = useState(1);
  const [min, setMin] = useState<string>("");
  const [max, setMax] = useState<string>("");
  const [log, setLog] = useState<number[]>([]);

  const field = (label: string, value: number | string, set: (v: string) => void) => (
    <label className="exercise-field">
      {label}
      <input
        className="exercise-input"
        type="number"
        value={value}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );

  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Counter</h2>
        <p>Try the props that each level unlocks.</p>
      </div>
      <div className="exercise-row">
        {field("initial", initial, (v) => setInitial(Number(v) || 0))}
        {field("step", step, (v) => setStep(Number(v) || 1))}
        {field("min", min, setMin)}
        {field("max", max, setMax)}
      </div>
      <Counter
        key={`${initial}-${step}-${min}-${max}`}
        initial={initial}
        step={step}
        min={min === "" ? undefined : Number(min)}
        max={max === "" ? undefined : Number(max)}
        onChange={(v) => setLog((l) => [v, ...l].slice(0, 6))}
      />
      <p className="exercise-muted">
        onChange log: [{log.join(", ")}]
      </p>
    </div>
  );
}
