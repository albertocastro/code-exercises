import App from "./solution";

// Live preview for the open-ended Pricing Page. The harness renders your
// default-exported App exactly as-is — there are no props. Everything you see
// here is whatever you build in solution.tsx (plus any files you add).
export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Pricing Page</h2>
        <p>
          Build any 3-tier pricing layout you like. The only contract is the
          test IDs: a billing-monthly / billing-annual toggle, the
          price-starter / price-pro / price-enterprise displays, the
          select-starter / select-pro / select-enterprise CTAs, a selected-plan
          readout, and a featured-plan marker.
        </p>
      </div>
      <App />
    </div>
  );
}
