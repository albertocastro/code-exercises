import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import * as JsxRuntime from "react/jsx-runtime";
import userEvent from "@testing-library/user-event";
import { rtl } from "./rtl";

// The only modules an exercise is allowed to import. They're the app's own
// bundled copies, so the learner's React shares one instance with RTL. The RTL
// here is sandboxed (see rtl.ts) so tests don't touch the IDE's own DOM.
const REGISTRY: Record<string, unknown> = {
  react: React,
  "react-dom": ReactDOMClient,
  "react-dom/client": ReactDOMClient,
  "react/jsx-runtime": JsxRuntime,
  "@testing-library/react": rtl,
  "@testing-library/user-event": userEvent,
};

export function makeRequire(locals: Record<string, unknown> = {}) {
  return (name: string) => {
    if (name in locals) return locals[name];
    if (name in REGISTRY) return REGISTRY[name];
    throw new Error(`Module not available in the exercise sandbox: "${name}"`);
  };
}

// Evaluate transpiled CommonJS, injecting require/module/exports plus any extra
// globals (describe/test/expect/vi/process for test files).
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
