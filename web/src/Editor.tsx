import { useEffect, useRef, type ComponentProps } from "react";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import { installHighlighting } from "./monaco-setup";
import { installTypeLibraries } from "./monaco-type-libs";

export function CodeEditor({
  path,
  value,
  onChange,
  readOnly,
  reveal,
}: {
  path: string;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  reveal?: { line: number; nonce: number };
}) {
  const editorRef = useRef<Parameters<NonNullable<ComponentProps<typeof MonacoEditor>["onMount"]>>[0] | null>(null);

  useEffect(() => {
    if (!reveal || !editorRef.current) return;

    editorRef.current.revealLineInCenter(reveal.line);
    editorRef.current.setPosition({ lineNumber: reveal.line, column: 1 });
    editorRef.current.focus();
  }, [reveal]);

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
      allowSyntheticDefaultImports: true,
      allowNonTsExtensions: true,
    });
    ts.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    installTypeLibraries(monaco);
    // Apply Shiki TextMate highlighting (VS Code grammars) for real JSX colors.
    installHighlighting(monaco)
      .then(() => monaco.editor.setTheme("dark-plus"))
      .catch(() => {});
  };

  return (
    <MonacoEditor
      key={path}
      height="100%"
      theme="dark-plus"
      language="typescript"
      path={path}
      value={value}
      onMount={(editor) => {
        editorRef.current = editor;
        if (reveal) {
          editor.revealLineInCenter(reveal.line);
          editor.setPosition({ lineNumber: reveal.line, column: 1 });
        }
      }}
      onChange={(v) => {
        if (readOnly) return;
        onChange(v ?? "");
      }}
      beforeMount={beforeMount}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        readOnly: !!readOnly,
        "semanticHighlighting.enabled": true,
      }}
    />
  );
}
