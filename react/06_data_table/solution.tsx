import { useState } from "react";

export interface Column {
  key: string;
  label: string;
  sortable?: boolean;
}
export interface DataTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  pageSize?: number;
  selectable?: boolean;
  onSelectionChange?: (selected: Record<string, unknown>[]) => void;
}

/**
 * Build a smart data table. See README.md for the per-level spec.
 *
 * The tests rely on a real <table>: role="columnheader" headers, role="row"
 * rows, role="cell" cells; aria-sort on the active header; buttons named
 * "previous"/"next" + data-testid="page-info"; checkboxes named "select all"
 * and "select <first-column-value>".
 */
export function DataTable({ columns, rows, pageSize, selectable, onSelectionChange }: DataTableProps) {
  const [, setSortKey] = useState<string | null>(null);

  // TODO Level 1: render a header per column and a row per entry (cell =
  //   row[column.key]).
  // TODO Level 2: clicking a sortable header's button sorts by that key (asc,
  //   then desc); set aria-sort on the active header.
  // TODO Level 3: when `pageSize` is set, page the rows with prev/next buttons
  //   (disabled at the ends) and a data-testid="page-info" like "1 of 3".
  // TODO Level 4: when `selectable`, add a checkbox per row + a "select all"
  //   checkbox; call onSelectionChange with the selected rows (original order).

  return (
    <div className="exercise-card">
      <table className="exercise-table">
        <thead>
          <tr></tr>
        </thead>
        <tbody></tbody>
      </table>
    </div>
  );
}
