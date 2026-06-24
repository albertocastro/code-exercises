import { FormEvent, useRef, useState } from "react";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}
type Filter = "all" | "active" | "completed";

export interface TodoListProps {
  initialTodos?: string[];
}

/**
 * Build a Todo List. See README.md for the per-level spec.
 *
 * The tests rely on:
 *   - the text input has accessible name "new todo"; the add button reads "Add"
 *   - each todo is an <li> with data-completed="true|false"
 *   - each todo has a checkbox and a button with name "delete …"
 *   - filter buttons read "All" / "Active" / "Completed"
 *   - the remaining count lives in data-testid="remaining"
 */
export function TodoList({ initialTodos = [] }: TodoListProps) {
  const [todos, setTodos] = useState<Todo[]>(
    initialTodos.map((t, i) => ({ id: i, text: t, completed: false }))
  );
  const [text, setText] = useState("");
  const nextId = useRef(initialTodos.length);

  const add = (e: FormEvent) => {
    e.preventDefault();
    // TODO Level 1: trim `text`, ignore empty, append a todo, clear the input.
  };
  // TODO Level 2: toggle a todo's `completed` flag from its checkbox.
  // TODO Level 3: delete a todo from its "delete" button.
  // TODO Level 4: filter (All/Active/Completed) and show the remaining count.

  return (
    <div>
      <form aria-label="add todo" onSubmit={add}>
        <input aria-label="new todo" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map((td) => (
          <li key={td.id} data-completed={td.completed}>
            <span>{td.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
