import { useState } from "react";
import { SignupForm, type SignupData } from "./solution";

export default function Demo() {
  const [submitted, setSubmitted] = useState<SignupData | null>(null);
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Sign-up Form</h2>
        <p>Validate, then submit.</p>
      </div>
      <SignupForm onSubmit={setSubmitted} />
      <p className="exercise-muted">{submitted ? `Submitted: ${submitted.email}` : "Not submitted"}</p>
    </div>
  );
}
