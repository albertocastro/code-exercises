import { useEffect, useMemo, useRef, type ComponentProps } from "react";
import MonacoEditor, { type Monaco } from "@monaco-editor/react";
import { installHighlighting } from "./monaco-setup";
import { installTypeLibraries } from "./monaco-type-libs";
import { installAutoImports } from "./autoImports";
import { installJavaIntelliSense, setJavaSources } from "./java/intellisense";
import { applyJavaMarkers, clearJavaMarkers, fetchJavaDiagnostics } from "./java/diagnostics";

type JavaSibling = { name: string; content: string };

function languageForPath(path: string) {
  if (path.endsWith(".java")) return "java";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "typescript";
}

export function CodeEditor({
  path,
  value,
  onChange,
  readOnly,
  reveal,
  javaSiblings,
  onRunTests,
  onFormat,
}: {
  path: string;
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  reveal?: { line: number; nonce: number };
  // The exercise's OTHER Java files, so completion and javac see the whole
  // program (the mounted model only holds the file being edited).
  javaSiblings?: JavaSibling[];
  // Wired to Cmd/Ctrl+Enter inside the editor. Kept in a ref (below) so the
  // Monaco command — registered once in onMount — always calls the latest
  // callback rather than a stale closure from the first mount.
  onRunTests?: () => void;
  // Wired to Shift+Alt+F inside the editor. Same ref pattern as onRunTests.
  onFormat?: () => void;
}) {
  const editorRef = useRef<Parameters<NonNullable<ComponentProps<typeof MonacoEditor>["onMount"]>>[0] | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const onRunTestsRef = useRef(onRunTests);
  const onFormatRef = useRef(onFormat);

  useEffect(() => {
    onRunTestsRef.current = onRunTests;
  }, [onRunTests]);
  useEffect(() => {
    onFormatRef.current = onFormat;
  }, [onFormat]);

  const isJava = languageForPath(path) === "java";
  const fileName = path.replace(/^.*\//, "");
  // Stable signature so the diagnostics effect only re-fires on real changes.
  const siblingsSig = useMemo(
    () => JSON.stringify(javaSiblings ?? []),
    [javaSiblings]
  );

  useEffect(() => {
    if (!reveal || !editorRef.current) return;

    editorRef.current.revealLineInCenter(reveal.line);
    editorRef.current.setPosition({ lineNumber: reveal.line, column: 1 });
    editorRef.current.focus();
  }, [reveal]);

  // Java: keep the cross-file symbol index fresh, then debounce a real `javac`
  // compile and paint the errors as markers. Aborts the in-flight request when
  // you keep typing so only the latest edit is graded.
  useEffect(() => {
    const monaco = monacoRef.current;
    const model = editorRef.current?.getModel();
    if (!isJava || !monaco || !model) return;

    const siblings: JavaSibling[] = javaSiblings ?? [];
    setJavaSources(siblings.map((s) => s.content));

    const controller = new AbortController();
    const files = [...siblings.filter((s) => s.name !== fileName), { name: fileName, content: value }];
    const timer = setTimeout(async () => {
      try {
        const diagnostics = await fetchJavaDiagnostics(files, controller.signal);
        if (!controller.signal.aborted) applyJavaMarkers(monaco, model, fileName, diagnostics);
      } catch {
        // Docker down / offline: leave the editor clean rather than nagging.
        if (!controller.signal.aborted) clearJavaMarkers(monaco, model);
      }
    }, 800);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, fileName, isJava, siblingsSig]);

  const beforeMount = (monaco: Monaco) => {
    monacoRef.current = monaco;
    installJavaIntelliSense(monaco);
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
    // VS Code-style auto-imports: completion items + "Add import" quick-fixes for
    // well-known module exports (React hooks/types, react-dom) that aren't yet in
    // scope. Accepting either merges the symbol into the existing import statement.
    installAutoImports(monaco);
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
      language={languageForPath(path)}
      path={path}
      value={value}
      onMount={(editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        if (reveal) {
          editor.revealLineInCenter(reveal.line);
          editor.setPosition({ lineNumber: reveal.line, column: 1 });
        }
        // Cmd/Ctrl+Enter runs tests; Shift+Alt+F formats the active file (a
        // no-op on read-only files — the caller's onFormat already guards
        // that). Read from the refs so a stale onMount closure never fires an
        // outdated callback.
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
          onRunTestsRef.current?.();
        });
        editor.addCommand(monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF, () => {
          onFormatRef.current?.();
        });
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
