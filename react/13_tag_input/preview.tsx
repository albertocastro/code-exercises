import { TagInput } from "./solution";

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Tag Input</h2>
        <p>Type and press Enter; Backspace removes the last.</p>
      </div>
      <TagInput initialTags={["react", "typescript"]} onChange={(t) => console.log(t)} />
    </div>
  );
}
