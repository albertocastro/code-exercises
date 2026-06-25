import { TicTacToe } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Tic-Tac-Toe</h2>
        <p>Play X and O; detect wins and draws.</p>
      </div>
      <TicTacToe />
    </div>
  );
}
