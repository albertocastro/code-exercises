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
  const [active, setActive] = useState(-1);

  // TODO Level 1: filter `items` by case-insensitive substring of `query`.
  // TODO Level 2: show "No results" + a result count (data-testid="result-count").
  // TODO Level 3: ArrowUp/ArrowDown move the highlight (wrapping); Enter calls
  //   onSelect with the highlighted item; changing the query resets the highlight.
  const filtered = items.filter((item) =>
    item.toLowerCase().includes(query.toLowerCase())
  );

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (filtered.length === 0) {
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((current) => (current + 1) % filtered.length);
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((current) =>
        current === -1 ? filtered.length - 1 : (current - 1 + filtered.length) % filtered.length
      );
      return;
    }

    if (e.key === "Enter" && active !== -1) {
      onSelect?.(filtered[active]);
    }
  };

  const handleChange = (value: string) => {
    setQuery(value);
    setActive(-1);
  };

  return (
    <div className="exercise-card exercise-search">
      <input
        className="exercise-input"
        aria-label="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={onKeyDown}
      />
      <ul className="exercise-list" role="listbox">
        {filtered.map((it, index) => (
          <li
            className="exercise-option"
            key={it}
            role="option"
            aria-selected={active === index}
            onClick={() => onSelect?.(it)}
          >
            {it}
          </li>
        ))}
      </ul>
      {filtered.length === 0 ? <div>No results</div> : null}
      <div data-testid="result-count">{filtered.length}</div>
    </div>
  );
}
