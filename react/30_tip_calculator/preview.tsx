import App from "./solution";

// Live preview for the open-ended Tip Calculator. The harness renders your
// default-exported App exactly as-is — there are no props. Everything you see
// here is whatever you build in solution.tsx (plus any files you add).
export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Tip Calculator</h2>
        <p>
          Build any layout you like. The only contract is the six test IDs:
          bill-input, tip-input, party-size-input, and the tip-amount,
          total-amount, per-person-amount outputs.
        </p>
      </div>
      <App />
    </div>
  );
}
