import confetti from "canvas-confetti";

// A small celebration on submit; a bigger one when an exercise is fully done.
export function celebrate(big = false) {
  const duration = big ? 1700 : 950;
  const end = Date.now() + duration;
  const colors = ["#4fc1ff", "#4ec9b0", "#dcdcaa", "#f48771", "#c586c0"];
  const shapes: confetti.Shape[] = ["square", "circle", "star"];

  const burst = (origin: confetti.Origin, angle = Math.random() * 360) => {
    confetti({
      particleCount: big ? 22 : 12,
      angle,
      spread: big ? 150 : 115,
      startVelocity: big ? 42 : 32,
      decay: 0.91,
      ticks: big ? 280 : 210,
      gravity: 0.65,
      drift: (Math.random() - 0.5) * 1.6,
      scalar: big ? 0.95 : 0.8,
      colors,
      shapes,
      origin,
      zIndex: 9999,
      disableForReducedMotion: true,
    });
  };

  const frame = () => {
    // Random viewport bursts make the effect visibly full-screen instead of a
    // wide strip falling from the top.
    burst({ x: Math.random(), y: Math.random() * 0.9 + 0.05 });

    if (big && Math.random() > 0.45) {
      const fromLeft = Math.random() > 0.5;
      burst({ x: fromLeft ? -0.04 : 1.04, y: Math.random() * 0.8 + 0.1 }, fromLeft ? 35 : 145);
    }

    if (Date.now() < end) requestAnimationFrame(frame);
  };

  frame();
}
