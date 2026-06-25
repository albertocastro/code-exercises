import { useState } from "react";

export interface AutocompleteProps {
  fetchSuggestions: (query: string) => Promise<string[]>;
  onSelect?: (value: string) => void;
  delayMs?: number;
}

/**
 * Build a debounced async autocomplete. See README.md.
 *
 * The tests rely on an input named "search", results as role="option" (active
 * one has aria-selected="true"), data-testid="loading" and data-testid="empty".
 */
export function Autocomplete({ fetchSuggestions, onSelect, delayMs = 300 }: AutocompleteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);

  // TODO Level 1: debounce `query` by delayMs, then call fetchSuggestions and
  //   render the results. (Don't fetch for an empty query.)
  // TODO Level 2: ArrowUp/Down highlight an option; Enter or click selects it
  //   (set the input to the value and call onSelect).
  // TODO Level 3: show data-testid="loading" while fetching and
  //   data-testid="empty" when there are no matches.
  // TODO Level 4: ignore stale responses — only apply the latest request.

  return (
    <div className="exercise-card exercise-search">
      <input
        className="exercise-input"
        aria-label="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="exercise-list" role="listbox">
        {results.map((r) => (
          <li
            className="exercise-option"
            key={r}
            role="option"
            aria-selected={false}
            onClick={() => onSelect?.(r)}
          >
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
