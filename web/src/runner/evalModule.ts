// Evaluate transpiled CommonJS, injecting require/module/exports plus any extra
// globals (describe/test/expect/vi/process for test files).
//
// This lives in its own DOM-free module (no React/RTL imports) so the Web Worker
// test runner can import it without dragging in rtl.ts, whose top-level
// `document.createElement` would crash a worker (no DOM there).
export function evalModule(
  transpiled: string,
  requireFn: (name: string) => unknown,
  globals: Record<string, unknown> = {}
): Record<string, unknown> {
  const module = { exports: {} as Record<string, unknown> };
  const names = ["require", "module", "exports", ...Object.keys(globals)];
  const values = [requireFn, module, module.exports, ...Object.values(globals)];
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(...names, transpiled)(...values);
  return module.exports;
}
