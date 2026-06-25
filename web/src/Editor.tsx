import MonacoEditor, { type Monaco, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { editor } from "monaco-editor";
import { installHighlighting } from "./monaco-setup";

export function CodeEditor({
  path,
  value,
  onChange,
  readOnly,
  markers,
  goTo,
}: {
  path: string;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  markers?: editor.IMarkerData[];
  goTo?: { line: number; column: number; nonce: number } | null;
}) {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

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

  const onMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!monaco || !model) return;
    monaco.editor.setModelMarkers(model, "exercise-compile", markers ?? []);
  }, [markers, path]);

  useEffect(() => {
    const instance = editorRef.current;
    if (!instance || !goTo) return;
    instance.setPosition({ lineNumber: goTo.line, column: goTo.column });
    instance.revealPositionInCenter({ lineNumber: goTo.line, column: goTo.column });
    instance.focus();
  }, [goTo]);

  return (
    <MonacoEditor
      height="100%"
      theme="dark-plus"
      language="typescript"
      path={path}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      beforeMount={beforeMount}
      onMount={onMount}
      options={{
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        automaticLayout: true,
        tabSize: 2,
        padding: { top: 12 },
        readOnly: !!readOnly,
        glyphMargin: true,
        renderValidationDecorations: "on",
        "semanticHighlighting.enabled": true,
      }}
    />
  );
}
