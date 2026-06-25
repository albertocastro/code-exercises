# Authoring Exercises

Use this guide when adding or revising exercises. The goal is a learner experience where the README, starter code, tests, and preview all describe the same contract.

## Exercise Shape

Each exercise should have:

- `README.md`: learner-facing spec with clear per-level acceptance criteria.
- `solution.ts` or `solution.tsx`: starter code with the public API, minimal scaffolding, and TODOs.
- `solution.test.ts` or `solution.test.tsx`: cumulative tests gated by `LEVEL`.
- `preview.tsx` for React exercises: a small interactive demo that exercises the same props and states as the tests.
- `perf.ts` only when an algorithm exercise has a meaningful complexity target.

Register new exercises in `catalog.ts`. Keep the `levels` count in `catalog.ts`, the README, and the test file in sync.

## Level Model

Levels are cumulative. `LEVEL=2` means “run through level 2,” not “run only level 2.” Tests should keep this convention:

```ts
const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);
```

Design each level so it can be solved without reading future levels. Later levels may expand the component, but they should not silently change the meaning of earlier requirements.

## README Standards

Write the README as acceptance criteria, not just a concept list.

For each level, include:

- The new behavior introduced in that level.
- Any default values.
- The exact accessible names, roles, `data-testid`s, or attributes tests rely on.
- Edge-case behavior for bounds, empty states, duplicate values, disabled states, and no-op actions.
- Whether callbacks fire on mount, no-op clicks, controlled updates, reset actions, or blocked interactions.

Avoid ambiguous phrases unless you define them. For example, in the Counter exercise, “a step must not overshoot a bound” should explicitly say whether `8 + step(5)` at `max=10` clamps to `10` or blocks the click.

## Test Standards

Tests are the executable spec. They should cover every documented public prop and every edge case the README names.

Good test coverage includes:

- Defaults and custom prop values.
- Both directions of symmetric behavior, such as min and max clamping.
- State transitions after user actions, not only initial render.
- No-op behavior, including whether callbacks fire.
- Duplicate or repeated data when item identity matters.
- Controlled and uncontrolled behavior, when both are part of the API.
- Accessibility queries that match the intended UI contract.

Do not document behavior that tests ignore unless the behavior is intentionally advisory. Do not write tests that imply behavior absent from the README.

## Starter Code

Starter code should help, not solve the level.

Use TODOs to point at the next implementation seam, but keep wording aligned with tests. A misleading TODO is worse than no TODO.

Good starter code:

- Exports the expected types and component/function names.
- Provides the basic DOM skeleton when the level is about behavior rather than markup discovery.
- Keeps accessible names and test IDs visible when those are part of the contract.
- Avoids hidden implementation decisions that conflict with later levels.

If Level 1 is supposed to be a task, the starter should not already pass all Level 1 behavior by accident.

## React Styling

React exercises should be visually readable in both preview surfaces. Use the shared semantic classes already supported by `react/preview/index.html` and `web/src/styles.css`, such as:

- `exercise-demo`
- `exercise-title`
- `exercise-card`
- `exercise-row`
- `exercise-field`
- `exercise-input`
- `exercise-button`
- `exercise-count`
- `exercise-list`
- `exercise-list-item`
- `exercise-option`
- `exercise-tabs`
- `exercise-tablist`
- `exercise-tab`
- `exercise-panel`
- `exercise-muted`

Prefer these classes over inline styles so the standalone Vite preview and the in-browser IDE look consistent. Do not require Tailwind classes unless Tailwind is added to both preview pipelines.

Styling must not be part of test correctness unless the exercise is explicitly about styling. Keep tests focused on behavior, accessibility, state, and public API.

## Preview Demos

React `preview.tsx` files should be small but useful. They should expose the props a learner needs to debug the current and future levels.

Good previews:

- Show the component in a simple card or demo layout.
- Include controls for important props such as `initial`, `step`, `min`, `max`, or controlled values.
- Show callback output when callbacks are part of the exercise.
- Avoid behavior that contradicts the tests.

## Audit Checklist

Before shipping an exercise, answer these:

- Does `npm run test:react` or `npm test -- <exercise>` run the intended files?
- Does `LEVEL=1` run only the first cumulative slice and skip later levels?
- Does every README requirement have a test?
- Does every test expectation appear in the README or starter comments?
- Are all documented props tested at least once?
- Are edge cases explicit instead of inferred?
- Does the preview render without special dependencies?
- Does the starter fail and pass at the expected levels?
- If a level is locked in the web IDE, does reset progress return the exercise to level 1?
