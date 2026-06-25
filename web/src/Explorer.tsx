export interface FileEntry {
  id: string;
  name: string;
  readOnly: boolean;
}

const ICON: Record<string, string> = {
  solution: "›_",
  test: "✓",
  preview: "▦",
  perf: "⚡",
};

export function Explorer({
  files,
  active,
  onSelect,
}: {
  files: FileEntry[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="explorer">
      <div className="explorer-head">FILES</div>
      {files.map((f) => (
        <button
          key={f.id}
          className={`file ${active === f.id ? "active" : ""}`}
          onClick={() => onSelect(f.id)}
        >
          <span className="file-icon">{ICON[f.id] ?? "•"}</span>
          <span className="file-name">{f.name}</span>
          {f.readOnly && <span className="ro">ro</span>}
        </button>
      ))}
    </div>
  );
}
