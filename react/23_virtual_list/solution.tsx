import { useState } from "react";

export interface VirtualListProps {
  items: string[];
  itemHeight: number;
  height: number;
  overscan?: number;
}

/**
 * Build a virtualized (windowed) list. See README.md.
 *
 * The tests rely on a data-testid="viewport" scroll container whose first child
 * is a full-height spacer, and visible rows as data-testid="row".
 */
export function VirtualList({ items, itemHeight, height }: VirtualListProps) {
  const [, setScrollTop] = useState(0);
  const total = items.length * itemHeight;

  // TODO Level 1: render only the rows visible in the viewport (not all
  //   `items`), positioned absolutely; keep the spacer at the full height.
  // TODO Level 2: recompute the window from scrollTop on scroll.
  // TODO Level 3: render `overscan` extra rows above and below.

  return (
    <div
      className="virtual-list"
      data-testid="viewport"
      style={{ height, overflow: "auto" }}
      onScroll={(e) => setScrollTop((e.currentTarget as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: total, position: "relative" }}>
        {items.map((item, i) => (
          <div
            key={i}
            className="virtual-row"
            data-testid="row"
            style={{ position: "absolute", top: i * itemHeight, height: itemHeight }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
