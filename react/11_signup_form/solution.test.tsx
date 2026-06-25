import { render, screen, fireEvent } from "@testing-library/react";
import { SignupForm } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const fill = (email: string, password: string, confirm = password) => {
  fireEvent.change(screen.getByLabelText("email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("password"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("confirm password"), { target: { value: confirm } });
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: /sign up/i }));

// ── Level 1: Controlled fields + submit ─────────────────────────────────────
level(1, "controlled submit", () => {
  test("submits the entered email and password", () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    fill("ada@dev.io", "password1");
    submit();
    expect(onSubmit).toHaveBeenCalledWith({ email: "ada@dev.io", password: "password1" });
  });
});

// ── Level 2: Validation ─────────────────────────────────────────────────────
level(2, "email + password validation", () => {
  test("rejects an invalid email", () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    fill("not-an-email", "password1");
    submit();
    expect(screen.getByTestId("email-error")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("rejects a short password", () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    fill("ada@dev.io", "short");
    submit();
    expect(screen.getByTestId("password-error")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("accepts a valid form", () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    fill("ada@dev.io", "password1");
    submit();
    expect(onSubmit).toHaveBeenCalled();
  });
});

// ── Level 3: Confirm password ───────────────────────────────────────────────
level(3, "confirm password", () => {
  test("rejects a mismatched confirmation", () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    fill("ada@dev.io", "password1", "password2");
    submit();
    expect(screen.getByTestId("confirm-error")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("accepts a matching confirmation", () => {
    const onSubmit = vi.fn();
    render(<SignupForm onSubmit={onSubmit} />);
    fill("ada@dev.io", "password1", "password1");
    submit();
    expect(onSubmit).toHaveBeenCalled();
  });
});

// ── Level 4: Errors only after submit ───────────────────────────────────────
level(4, "deferred error display", () => {
  test("shows no errors on a pristine form", () => {
    render(<SignupForm />);
    expect(screen.queryByTestId("email-error")).toBeNull();
    expect(screen.queryByTestId("password-error")).toBeNull();
  });

  test("shows errors after an empty submit", () => {
    render(<SignupForm />);
    submit();
    expect(screen.getByTestId("email-error")).toBeInTheDocument();
    expect(screen.getByTestId("password-error")).toBeInTheDocument();
  });
});
