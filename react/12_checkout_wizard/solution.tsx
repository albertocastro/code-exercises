import { useState } from "react";

export interface CheckoutData {
  name: string;
  address: string;
  card: string;
}
export interface WizardProps {
  onComplete?: (data: CheckoutData) => void;
}

const STEPS = ["Shipping", "Payment", "Review"];

/**
 * Build a 3-step checkout wizard. See README.md.
 *
 * The tests rely on: a data-testid="step-indicator" ("1 of 3"), a heading per
 * step (Shipping/Payment/Review), inputs named "name"/"address"/"card",
 * "Next"/"Back"/"Complete" buttons, a data-testid="review", and a
 * data-testid="step-error".
 */
export function CheckoutWizard({ onComplete }: WizardProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [card, setCard] = useState("");

  // TODO Level 1: Next/Back navigation between the three steps.
  // TODO Level 2: block Next until the current step is valid (Shipping needs
  //   name + address; Payment needs a card >= 4 chars); show step-error.
  // TODO Level 3: the Review step shows the entered data; Complete calls
  //   onComplete({ name, address, card }).

  return (
    <div className="exercise-card">
      <span data-testid="step-indicator">
        {step + 1} of {STEPS.length}
      </span>
      <h3>{STEPS[step]}</h3>

      {step === 0 && (
        <>
          <input className="exercise-input" aria-label="name" value={name} onChange={(e) => setName(e.target.value)} />
          <input
            className="exercise-input"
            aria-label="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </>
      )}
      {step === 1 && (
        <input className="exercise-input" aria-label="card" value={card} onChange={(e) => setCard(e.target.value)} />
      )}
      {step === 2 && <div data-testid="review" />}

      {/* TODO Level 1: wire Back/Next to move between steps with setStep
          (Back hidden on the first step; the last step shows "Complete"). */}
      <div className="exercise-row">
        {step > 0 && <button className="exercise-button">Back</button>}
        {step < STEPS.length - 1 ? (
          <button className="exercise-button">Next</button>
        ) : (
          <button className="exercise-button">Complete</button>
        )}
      </div>
    </div>
  );
}
