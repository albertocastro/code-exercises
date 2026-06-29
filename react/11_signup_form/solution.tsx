import { FormEvent, useState } from "react";

export interface SignupData {
  email: string;
  password: string;
}
export interface SignupFormProps {
  onSubmit?: (data: SignupData) => void;
}

/**
 * Build a sign-up form. See README.md.
 *
 * The tests rely on inputs named "email", "password", "confirm password", a
 * "Sign up" button, and error elements data-testid="email-error" /
 * "password-error" / "confirm-error".
 */
export function SignupForm({ onSubmit }: SignupFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  // TODO Level 1: call onSubmit({ email, password }) when the form submits.
  // TODO Level 2: validate email (looks like an email) + password (>= 8 chars);
  //   show error elements and block submit when invalid.
  // TODO Level 3: "confirm password" must match (confirm-error).
  // TODO Level 4: show errors only after the first submit attempt.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    // TODO Level 1: call onSubmit({ email, password }) here.
  };

  return (
    <form className="exercise-card" onSubmit={submit}>
      <input className="exercise-input" aria-label="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        className="exercise-input"
        type="password"
        aria-label="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        className="exercise-input"
        type="password"
        aria-label="confirm password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      <button className="exercise-button" type="submit">
        Sign up
      </button>
    </form>
  );
}
