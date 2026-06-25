# React 13 — Tag Input

**Estimated time:** 25–40 minutes
**Goal:** Keyboard-driven input, array state, and edge cases.

You edit `solution.tsx`.

## Contract
```ts
interface TagInputProps {
  initialTags?: string[];
  maxTags?: number;
  onChange?: (tags: string[]) => void;
}
```
Input named **add tag**; each tag in `data-testid="tag"`; a per-tag remove
button named **"remove &lt;tag&gt;"**.

## Levels
1. **Add** — Enter adds the text as a tag and clears the input.
2. **Remove** — a remove button per tag; Backspace on an empty input removes the
   last tag.
3. **Dedupe / trim / max** — ignore duplicates and empty/whitespace; respect `maxTags`.
