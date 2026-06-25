import { render, screen, fireEvent } from "@testing-library/react";
import { CommentTree, type Comment } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const COMMENTS: Comment[] = [
  {
    id: 1,
    text: "root one",
    replies: [
      { id: 2, text: "child a", replies: [{ id: 3, text: "grandchild" }] },
      { id: 4, text: "child b" },
    ],
  },
  { id: 5, text: "root two" },
];

// ── Level 1: Recursive render ───────────────────────────────────────────────
level(1, "recursive render", () => {
  test("renders every comment, including nested ones", () => {
    render(<CommentTree comments={COMMENTS} />);
    ["root one", "child a", "grandchild", "child b", "root two"].forEach((t) =>
      expect(screen.getByText(t)).toBeInTheDocument()
    );
  });
});

// ── Level 2: Collapse ───────────────────────────────────────────────────────
level(2, "collapse", () => {
  test("collapsing hides a comment's replies", () => {
    render(<CommentTree comments={COMMENTS} />);
    // "root one" has replies -> it has a collapse button (the first one)
    fireEvent.click(screen.getAllByRole("button", { name: "collapse" })[0]);
    expect(screen.queryByText("child a")).toBeNull();
    expect(screen.queryByText("grandchild")).toBeNull();
    expect(screen.getByText("root one")).toBeInTheDocument();
  });

  test("expanding shows them again", () => {
    render(<CommentTree comments={COMMENTS} />);
    const btn = () => screen.getAllByRole("button", { name: /collapse|expand/ })[0];
    fireEvent.click(btn());
    fireEvent.click(btn());
    expect(screen.getByText("child a")).toBeInTheDocument();
  });
});

// ── Level 3: Reply ──────────────────────────────────────────────────────────
level(3, "reply", () => {
  test("submitting a reply reports the parent id and text", () => {
    const onReply = vi.fn();
    render(<CommentTree comments={COMMENTS} onReply={onReply} />);
    fireEvent.click(screen.getByRole("button", { name: "reply to child a" }));
    fireEvent.change(screen.getByLabelText("reply box for child a"), { target: { value: "nice point" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onReply).toHaveBeenCalledWith(2, "nice point");
  });
});
