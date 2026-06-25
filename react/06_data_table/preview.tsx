import { useState } from "react";
import { DataTable, type Column } from "./solution";

const COLUMNS: Column[] = [
  { key: "name", label: "Name", sortable: true },
  { key: "role", label: "Role", sortable: true },
  { key: "score", label: "Score", sortable: true },
];
const ROWS = [
  { name: "Ada", role: "Engineer", score: 92 },
  { name: "Grace", role: "Designer", score: 88 },
  { name: "Linus", role: "Engineer", score: 95 },
  { name: "Margaret", role: "PM", score: 90 },
  { name: "Alan", role: "Engineer", score: 84 },
];

export default function Demo() {
  const [selected, setSelected] = useState(0);
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Smart Table</h2>
        <p>Sort columns, page through rows, and select.</p>
      </div>
      <DataTable
        columns={COLUMNS}
        rows={ROWS}
        pageSize={3}
        selectable
        onSelectionChange={(s) => setSelected(s.length)}
      />
      <p className="exercise-muted">{selected} selected</p>
    </div>
  );
}
