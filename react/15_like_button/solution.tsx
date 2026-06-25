import { useState } from "react";

export interface LikeButtonProps {
  initialLiked?: boolean;
  initialCount?: number;
  /** Server call; rejects on failure. */
  toggleLike: (liked: boolean) => Promise<void>;
}

/**
 * Build a like button with optimistic updates. See README.md.
 *
 * The tests rely on a single button with aria-pressed and a
 * data-testid="count".
 */
export function LikeButton({ initialLiked = false, initialCount = 0, toggleLike }: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  // TODO Level 1: clicking calls toggleLike(newLiked) and updates liked + count.
  // TODO Level 2: update optimistically — reflect the change immediately, before
  //   the server call resolves.
  // TODO Level 3: if the call rejects, roll the change back.
  const onClick = async () => {
    const next = !liked;
    try {
      await toggleLike(next);
      setLiked(next);
      setCount((c) => c + (next ? 1 : -1));
    } catch {
      /* TODO Level 3: handle failure */
    }
  };

  return (
    <button className="exercise-button" aria-pressed={liked} onClick={onClick}>
      {liked ? "♥" : "♡"} <span data-testid="count">{count}</span>
    </button>
  );
}
