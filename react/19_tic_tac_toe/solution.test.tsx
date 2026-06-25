import { render, screen, fireEvent } from "@testing-library/react";
import { TicTacToe } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const cell = (i: number) => screen.getByTestId(`cell-${i}`);
const status = () => screen.getByTestId("status").textContent;
const play = (...cells: number[]) => cells.forEach((i) => fireEvent.click(cell(i)));

// ── Level 1: Placing marks ──────────────────────────────────────────────────
level(1, "placing marks", () => {
  test("alternates X and O and shows the turn", () => {
    render(<TicTacToe />);
    expect(status()).toBe("Turn: X");
    fireEvent.click(cell(0));
    expect(cell(0)).toHaveTextContent("X");
    expect(status()).toBe("Turn: O");
    fireEvent.click(cell(1));
    expect(cell(1)).toHaveTextContent("O");
    expect(status()).toBe("Turn: X");
  });

  test("a taken cell cannot be overwritten", () => {
    render(<TicTacToe />);
    fireEvent.click(cell(0)); // X
    fireEvent.click(cell(0)); // ignored
    expect(cell(0)).toHaveTextContent("X");
    expect(status()).toBe("Turn: O");
  });
});

// ── Level 2: Win detection ──────────────────────────────────────────────────
level(2, "win detection", () => {
  test("declares a winner on three in a row", () => {
    render(<TicTacToe />);
    play(0, 3, 1, 4, 2); // X: 0,1,2  O: 3,4
    expect(status()).toBe("Winner: X");
  });

  test("no moves after the game is won", () => {
    render(<TicTacToe />);
    play(0, 3, 1, 4, 2); // X wins
    fireEvent.click(cell(5));
    expect(cell(5)).toHaveTextContent("");
  });
});

// ── Level 3: Draw + reset ───────────────────────────────────────────────────
level(3, "draw and reset", () => {
  test("declares a draw on a full board with no winner", () => {
    render(<TicTacToe />);
    play(0, 1, 2, 5, 3, 6, 4, 8, 7); // X:0,2,3,4,7  O:1,5,6,8 -> no line wins
    expect(status()).toBe("Draw");
  });

  test("reset clears the board", () => {
    render(<TicTacToe />);
    play(0, 1, 2);
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(cell(0)).toHaveTextContent("");
    expect(status()).toBe("Turn: X");
  });
});
