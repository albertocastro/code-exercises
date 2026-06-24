import { render, screen, fireEvent, within } from "@testing-library/react";
import { TodoList } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const input = () => screen.getByLabelText(/new todo/i) as HTMLInputElement;
const addBtn = () => screen.getByRole("button", { name: /^add$/i });
const items = () => screen.queryAllByRole("listitem");
const add = (text: string) => {
  fireEvent.change(input(), { target: { value: text } });
  fireEvent.click(addBtn());
};

// ── Level 1: Add todos ──────────────────────────────────────────────────────
level(1, "add todos", () => {
  test("starts empty", () => {
    render(<TodoList />);
    expect(items()).toHaveLength(0);
  });

  test("adds a todo", () => {
    render(<TodoList />);
    add("buy milk");
    expect(items()).toHaveLength(1);
    expect(screen.getByText("buy milk")).toBeInTheDocument();
  });

  test("adds multiple in order", () => {
    render(<TodoList />);
    add("first");
    add("second");
    const texts = items().map((li) => within(li).getByText(/first|second/).textContent);
    expect(texts).toEqual(["first", "second"]);
  });

  test("ignores empty / whitespace input", () => {
    render(<TodoList />);
    add("   ");
    expect(items()).toHaveLength(0);
  });

  test("clears the input after adding", () => {
    render(<TodoList />);
    add("something");
    expect(input().value).toBe("");
  });

  test("submitting the form (Enter) also adds", () => {
    render(<TodoList />);
    fireEvent.change(input(), { target: { value: "via enter" } });
    fireEvent.submit(input().closest("form")!);
    expect(screen.getByText("via enter")).toBeInTheDocument();
  });
});

// ── Level 2: Toggle complete ────────────────────────────────────────────────
level(2, "toggle complete", () => {
  test("toggling marks the todo completed", () => {
    render(<TodoList initialTodos={["a"]} />);
    const li = items()[0];
    fireEvent.click(within(li).getByRole("checkbox"));
    expect(items()[0]).toHaveAttribute("data-completed", "true");
    expect(within(items()[0]).getByRole("checkbox")).toBeChecked();
  });

  test("toggling again clears completion", () => {
    render(<TodoList initialTodos={["a"]} />);
    const box = () => within(items()[0]).getByRole("checkbox");
    fireEvent.click(box());
    fireEvent.click(box());
    expect(items()[0]).toHaveAttribute("data-completed", "false");
  });
});

// ── Level 3: Delete ─────────────────────────────────────────────────────────
level(3, "delete", () => {
  test("deletes the matching todo and keeps the rest", () => {
    render(<TodoList initialTodos={["a", "b", "c"]} />);
    fireEvent.click(within(items()[1]).getByRole("button", { name: /delete/i }));
    const texts = items().map((li) => li.textContent);
    expect(items()).toHaveLength(2);
    expect(texts.join("")).toContain("a");
    expect(texts.join("")).toContain("c");
    expect(texts.join("")).not.toContain("b");
  });
});

// ── Level 4: Filter + remaining count ───────────────────────────────────────
level(4, "filter and count", () => {
  const setup = () => {
    render(<TodoList initialTodos={["a", "b", "c"]} />);
    // complete the middle todo
    fireEvent.click(within(items()[1]).getByRole("checkbox"));
  };

  test("remaining count reflects active todos", () => {
    setup();
    expect(screen.getByTestId("remaining")).toHaveTextContent("2");
  });

  test("Active filter shows only incomplete todos", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^active$/i }));
    expect(items()).toHaveLength(2);
  });

  test("Completed filter shows only completed todos", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^completed$/i }));
    expect(items()).toHaveLength(1);
    expect(items()[0]).toHaveTextContent("b");
  });

  test("All filter shows everything", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: /^active$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^all$/i }));
    expect(items()).toHaveLength(3);
  });
});
