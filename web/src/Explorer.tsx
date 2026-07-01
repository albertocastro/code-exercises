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
  styles: "#",
  main: "▶",
};

export function Explorer({
  files,
  active,
  collapsed,
  onToggle,
  onSelect,
}: {
  files: FileEntry[];
  active: string;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={`explorer ${collapsed ? "collapsed" : ""}`}>
      <div className="explorer-head">
        {!collapsed && <span>FILES</span>}
        <button
          className="explorer-toggle"
          title={collapsed ? "Show files" : "Hide files"}
          onClick={onToggle}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>
      {!collapsed &&
        files.map((f) => (
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
