# React 15 — Like Button (optimistic)

**Estimated time:** 25–35 minutes
**Goal:** Optimistic UI — update immediately, reconcile with the server, roll
back on failure.

You edit `solution.tsx`. *(Tests use a mock `toggleLike`.)*

## Contract
```ts
interface LikeButtonProps {
  initialLiked?: boolean;
  initialCount?: number;
  toggleLike: (liked: boolean) => Promise<void>; // rejects on failure
}
```
One button with `aria-pressed` and a `data-testid="count"`.

## Levels
1. **Toggle + server call** — clicking calls `toggleLike(newState)` and updates.
2. **Optimistic** — reflect the change immediately, before the call resolves.
3. **Rollback** — if `toggleLike` rejects, revert to the previous state.
