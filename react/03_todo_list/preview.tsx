import { TodoList } from "./solution";

export default function Demo() {
  return (
    <div>
      <h2>Todo List</h2>
      <TodoList initialTodos={["Learn React", "Build a component"]} />
    </div>
  );
}
