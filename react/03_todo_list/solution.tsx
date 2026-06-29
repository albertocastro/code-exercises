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
  const [filter, setFilter] = useState<Filter>("all");
  const nextId = useRef(initialTodos.length);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setTodos((current) => [
      ...current,
      { id: nextId.current++, text: trimmed, completed: false },
    ]);
    setText("");
  };
  const toggleTodo = (id: number) => {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: number) => {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  };

  const visibleTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  const remaining = todos.filter((todo) => !todo.completed).length;

  return (
    <div className="exercise-card">
      <form className="exercise-row" aria-label="add todo" onSubmit={add}>
        <input
          className="exercise-input"
          aria-label="new todo"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="exercise-button" type="submit">Add</button>
      </form>
      <div className="exercise-row">
        <button className="exercise-button" type="button" onClick={() => setFilter("all")}>
          All
        </button>
        <button className="exercise-button" type="button" onClick={() => setFilter("active")}>
          Active
        </button>
        <button className="exercise-button" type="button" onClick={() => setFilter("completed")}>
          Completed
        </button>
        <span data-testid="remaining">{remaining}</span>
      </div>
      <ul className="exercise-list">
        {visibleTodos.map((td) => (
          <li className="exercise-list-item" key={td.id} data-completed={td.completed}>
            <input
              type="checkbox"
              checked={td.completed}
              onChange={() => toggleTodo(td.id)}
            />
            <span>{td.text}</span>
            <button
              className="exercise-button"
              type="button"
              aria-label={`delete ${td.text}`}
              onClick={() => deleteTodo(td.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
