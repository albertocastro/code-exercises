import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import { installHighlighting } from "./monaco-setup";

export function CodeEditor({
  path,
  value,
  onChange,
}: {
  path: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const beforeMount = (monaco: Monaco) => {
    // Treat .ts/.tsx uniformly and allow JSX so the editor doesn't flag valid
    // component code. We don't run Monaco's type-checker here (tests are the
    // source of truth), so silence semantic diagnostics to keep it clean.
    const ts = monaco.languages.typescript.typescriptDefaults;
    ts.setCompilerOptions({
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      esModuleInterop: true,
      allowNonTsExtensions: true,
    });
    ts.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
    // Apply Shiki TextMate highlighting (VS Code grammars) for real JSX colors.
    installHighlighting(monaco)
      .then(() => monaco.editor.setTheme("dark-plus"))
      .catch(() => {});
  };

  return (
    <MonacoEditor
      height="100%"
      theme="vs-dark"
      language="typescript"
      path={path}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      beforeMount={beforeMount}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        "semanticHighlighting.enabled": true,
      }}
    />
  );
}
