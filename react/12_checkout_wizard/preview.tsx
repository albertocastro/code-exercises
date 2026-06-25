import { useState } from "react";
import { CheckoutWizard, type CheckoutData } from "./solution";

export default function Demo() {
  const [done, setDone] = useState<CheckoutData | null>(null);
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Checkout Wizard</h2>
        <p>Shipping → Payment → Review.</p>
      </div>
      <CheckoutWizard onComplete={setDone} />
      <p className="exercise-muted">{done ? `Completed for ${done.name}` : "In progress"}</p>
    </div>
  );
}
