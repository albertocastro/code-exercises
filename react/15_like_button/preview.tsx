import { LikeButton } from "./solution";

export default function Demo() {
  // ~30% of calls fail, so you can see rollback in action.
  const toggleLike = () =>
    new Promise<void>((res, rej) =>
      setTimeout(() => (Math.random() < 0.3 ? rej(new Error("flaky network")) : res()), 500)
    );
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Like Button</h2>
        <p>Optimistic — ~30% of calls fail to show rollback.</p>
      </div>
      <LikeButton initialCount={10} toggleLike={toggleLike} />
    </div>
  );
}
