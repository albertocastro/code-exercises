# React 3 — Todo List

**Estimated time:** 30–45 minutes
**Goal:** Lists, forms, immutable array updates, and derived/filtered views.

You edit `solution.tsx`. Run from the CLI (`npm start` → React → Todo List) or:

```bash
LEVEL=1 npx vitest run react/03_todo_list
npx vitest react/03_todo_list
```

---

## Component contract

```ts
interface TodoListProps {
  initialTodos?: string[]; // seed todos (used by tests); default []
}
```

The tests rely on:

- The text input has accessible name **"new todo"**; the add button reads **"Add"**.
- Each todo is an `<li>` with `data-completed="true|false"`.
- Each todo has a **checkbox** and a button named **"delete …"**.
- Filter buttons read **"All" / "Active" / "Completed"**.
- The remaining count lives in `data-testid="remaining"`.

---

## Level 1 — Add todos

Typing text and pressing **Add** (or Enter to submit the form) appends a todo
and clears the input. Empty / whitespace-only input is ignored.

## Level 2 — Toggle complete

Each todo has a checkbox. Toggling it flips `data-completed` and the checked state.

## Level 3 — Delete

Each todo has a delete button that removes only that todo.

## Level 4 — Filter + remaining count

Add **All / Active / Completed** filters that change which todos render, and a
`data-testid="remaining"` element showing how many todos are still active.
