import confetti from "canvas-confetti";

// A small celebration on submit; a bigger one when an exercise is fully done.
export function celebrate(big = false) {
  const base = { spread: 70, origin: { y: 0.6 } };
  confetti({ ...base, particleCount: big ? 140 : 70 });
  if (big) {
    setTimeout(() => confetti({ spread: 60, angle: 60, particleCount: 100, origin: { x: 0, y: 0.7 } }), 150);
    setTimeout(() => confetti({ spread: 60, angle: 120, particleCount: 100, origin: { x: 1, y: 0.7 } }), 300);
  }
}
