# React 11 — Sign-up Form

**Estimated time:** 30–40 minutes
**Goal:** Controlled inputs, validation, and good form UX.

You edit `solution.tsx`.

## Contract
```ts
interface SignupData { email: string; password: string; }
interface SignupFormProps { onSubmit?: (data: SignupData) => void; }
```
Inputs named **email**, **password**, **confirm password**; a **Sign up** button;
errors at `data-testid="email-error" | "password-error" | "confirm-error"`.

## Levels
1. **Controlled submit** — submit calls `onSubmit({ email, password })`.
2. **Validation** — email must look valid, password ≥ 8 chars; show errors and
   block submit when invalid.
3. **Confirm password** — must match; otherwise show `confirm-error`.
4. **Deferred errors** — show errors only after the first submit attempt.
