import { useState } from "react";

type Mark = "X" | "O" | null;

/**
 * Build Tic-Tac-Toe. See README.md.
 *
 * The tests rely on a data-testid="status" ("Turn: X" / "Winner: O" / "Draw"),
 * nine cells data-testid="cell-0".."cell-8", and a "Reset" button.
 */
export function TicTacToe() {
  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [xNext, setXNext] = useState(true);

  // TODO Level 2: detect a winner ("Winner: X"/"Winner: O") and stop further moves.
  // TODO Level 3: detect a draw ("Draw") and add a Reset button.
  const status = `Turn: ${xNext ? "X" : "O"}`;

  const play = (i: number) => {
    if (board[i]) return;
    const b = [...board];
    b[i] = xNext ? "X" : "O";
    setBoard(b);
    setXNext((x) => !x);
  };

  return (
    <div className="exercise-card">
      <div data-testid="status">{status}</div>
      <div className="ttt-board">
        {board.map((c, i) => (
          <button className="ttt-cell" key={i} data-testid={`cell-${i}`} onClick={() => play(i)}>
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
