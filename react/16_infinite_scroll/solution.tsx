import { useRef, useState } from "react";

export interface InfiniteListProps {
  fetchPage: (page: number) => Promise<string[]>;
  pageSize?: number;
}

/**
 * Build an infinite-scrolling list. See README.md.
 *
 * The tests rely on items as role="listitem", a data-testid="sentinel" element
 * you observe, and a data-testid="end" when the list is exhausted.
 */
export function InfiniteList({ fetchPage, pageSize = 10 }: InfiniteListProps) {
  const [items] = useState<string[]>([]);
  const sentinel = useRef<HTMLDivElement>(null);

  // TODO Level 1: load the first page (fetchPage(0)) on mount and render it.
  // TODO Level 2: observe the sentinel with an IntersectionObserver; when it
  //   intersects, load and append the next page.
  // TODO Level 3: when a page returns fewer than pageSize items, stop loading
  //   and show data-testid="end".

  return (
    <div className="exercise-card">
      <ul className="exercise-list">
        {items.map((it, i) => (
          <li className="exercise-list-item" key={i}>
            {it}
          </li>
        ))}
      </ul>
      <div data-testid="sentinel" ref={sentinel} />
    </div>
  );
}
