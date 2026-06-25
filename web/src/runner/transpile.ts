import { transform } from "sucrase";

// Turn the learner's TS/TSX (a string from Monaco) into runnable CommonJS that
// we evaluate in the browser. Automatic JSX runtime -> requires react/jsx-runtime.
export function transpile(code: string, filePath = "module.tsx"): string {
  return transform(code, {
    transforms: ["typescript", "jsx", "imports"],
    jsxRuntime: "automatic",
    production: true,
    filePath,
  }).code;
}
