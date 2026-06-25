import { useState } from "react";

export interface Item {
  id: number;
  name: string;
  category: string;
  price: number;
}
export interface FilterListProps {
  items: Item[];
}

/**
 * Build a faceted filter. See README.md for the per-level spec.
 *
 * The tests rely on: a search input named "search"; one <li> per visible item;
 * category checkboxes named after the category (aria-label); a
 * data-testid="count"; a "Clear all" button; and facet labels like
 * "Electronics (2)".
 */
export function FilterList({ items }: FilterListProps) {
  const [query, setQuery] = useState("");

  // TODO Level 1: filter items by case-insensitive name substring of `query`.
  // TODO Level 2: category checkboxes (aria-label = category) — OR within
  //   categories, AND with the search.
  // TODO Level 3: a data-testid="count" of visible items + a "Clear all" button.
  // TODO Level 4: show each facet's count "(N)" reflecting the current search.

  return (
    <div className="exercise-card">
      <input
        className="exercise-input"
        aria-label="search"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="exercise-list">
        {items.map((i) => (
          <li className="exercise-list-item" key={i.id}>
            {i.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
