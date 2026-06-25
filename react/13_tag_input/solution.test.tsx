import { render, screen, fireEvent } from "@testing-library/react";
import { TagInput } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const input = () => screen.getByLabelText("add tag") as HTMLInputElement;
const tags = () => screen.queryAllByTestId("tag").map((t) => t.textContent?.replace("×", ""));
const addTag = (value: string) => {
  fireEvent.change(input(), { target: { value } });
  fireEvent.keyDown(input(), { key: "Enter" });
};

// ── Level 1: Add tags ───────────────────────────────────────────────────────
level(1, "add tags", () => {
  test("Enter adds a tag and clears the input", () => {
    render(<TagInput />);
    addTag("react");
    expect(tags()).toEqual(["react"]);
    expect(input().value).toBe("");
  });

  test("adds multiple tags in order", () => {
    render(<TagInput />);
    addTag("react");
    addTag("vue");
    expect(tags()).toEqual(["react", "vue"]);
  });

  test("reports changes via onChange", () => {
    const onChange = vi.fn();
    render(<TagInput onChange={onChange} />);
    addTag("svelte");
    expect(onChange).toHaveBeenLastCalledWith(["svelte"]);
  });
});

// ── Level 2: Remove tags ────────────────────────────────────────────────────
level(2, "remove tags", () => {
  test("the remove button deletes that tag", () => {
    render(<TagInput initialTags={["a", "b", "c"]} />);
    fireEvent.click(screen.getByRole("button", { name: "remove b" }));
    expect(tags()).toEqual(["a", "c"]);
  });

  test("Backspace on an empty input removes the last tag", () => {
    render(<TagInput initialTags={["a", "b"]} />);
    fireEvent.keyDown(input(), { key: "Backspace" });
    expect(tags()).toEqual(["a"]);
  });

  test("Backspace with text does not remove a tag", () => {
    render(<TagInput initialTags={["a"]} />);
    fireEvent.change(input(), { target: { value: "x" } });
    fireEvent.keyDown(input(), { key: "Backspace" });
    expect(tags()).toEqual(["a"]);
  });
});

// ── Level 3: Dedupe / trim / max ────────────────────────────────────────────
level(3, "dedupe, trim, max", () => {
  test("ignores duplicates", () => {
    render(<TagInput />);
    addTag("react");
    addTag("react");
    expect(tags()).toEqual(["react"]);
  });

  test("trims whitespace and ignores empty", () => {
    render(<TagInput />);
    addTag("   ");
    expect(tags()).toEqual([]);
    addTag("  react  ");
    expect(tags()).toEqual(["react"]);
  });

  test("respects maxTags", () => {
    render(<TagInput maxTags={2} />);
    addTag("a");
    addTag("b");
    addTag("c");
    expect(tags()).toEqual(["a", "b"]);
  });
});
