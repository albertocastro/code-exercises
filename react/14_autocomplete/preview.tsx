import { Autocomplete } from "./solution";

const ALL = ["react", "redux", "react-query", "vue", "svelte", "solid", "angular", "ember", "preact"];

export default function Demo() {
  const fetchSuggestions = (q: string) =>
    new Promise<string[]>((res) =>
      setTimeout(() => res(ALL.filter((x) => x.includes(q.toLowerCase()))), 250)
    );
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Autocomplete</h2>
        <p>Debounced async search (try "re").</p>
      </div>
      <Autocomplete fetchSuggestions={fetchSuggestions} onSelect={(v) => console.log("selected", v)} />
    </div>
  );
}
