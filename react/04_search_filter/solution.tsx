import { KeyboardEvent, useState } from "react";

export interface SearchListProps {
  items: string[];
  onSelect?: (item: string) => void;
  placeholder?: string;
}

/**
 * Build a searchable, keyboard-navigable list. See README.md for the spec.
 *
 * The tests rely on:
 *   - a text input with accessible name "search"
 *   - each visible item is an element with role="option"
 *   - the highlighted item has aria-selected="true"
 *   - an element with data-testid="result-count" shows the match count
 *   - "No results" text appears when nothing matches
 */
export function SearchList({ items, onSelect, placeholder }: SearchListProps) {
  const [query, setQuery] = useState("");
  const [, setActive] = useState(-1);

  // TODO Level 1: filter `items` by case-insensitive substring of `query`.
  // TODO Level 2: show "No results" + a result count (data-testid="result-count").
  // TODO Level 3: ArrowUp/ArrowDown move the highlight (wrapping); Enter calls
  //   onSelect with the highlighted item; changing the query resets the highlight.
  const filtered = items;

  const onKeyDown = (_e: KeyboardEvent) => {
    // TODO Level 3
  };

  return (
    <div>
      <input
        aria-label="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <ul role="listbox">
        {filtered.map((it) => (
          <li key={it} role="option" aria-selected={false} onClick={() => onSelect?.(it)}>
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
