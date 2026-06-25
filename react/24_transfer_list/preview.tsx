import { TransferList } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Transfer List</h2>
        <p>Select items and move them between the lists.</p>
      </div>
      <TransferList initialLeft={["React", "Vue", "Svelte", "Solid"]} initialRight={["Angular"]} />
    </div>
  );
}
