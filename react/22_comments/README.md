# React 22 — Nested Comments

**Estimated time:** 35–50 minutes
**Goal:** Recursive rendering of tree data, with collapse and inline replies.

You edit `solution.tsx`.

## Contract
```ts
interface Comment { id: number; text: string; replies?: Comment[]; }
interface CommentTreeProps {
  comments: Comment[];
  onReply?: (parentId: number, text: string) => void;
}
```
Every comment's text is rendered; comments with replies get a **collapse**/**expand**
button; each comment has a **"reply to &lt;text&gt;"** button revealing a
**"reply box for &lt;text&gt;"** + **Submit**.

## Levels
1. **Recursive render** — render the whole tree, including deeply nested replies.
2. **Collapse** — hide/show a comment's replies subtree.
3. **Reply** — Reply reveals a box; Submit calls `onReply(comment.id, text)`.
