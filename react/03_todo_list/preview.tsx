import { TodoList } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Todo List</h2>
        <p>Add, toggle, delete, and filter todos as levels unlock.</p>
      </div>
      <TodoList initialTodos={["Learn React", "Build a component"]} />
    </div>
  );
}
