import type { ComponentType } from "react";
import { transpile } from "./transpile";
import { evalModule, makeRequire } from "./modules";

// Compile preview.tsx (which imports ./solution) into a renderable component.
export function compilePreview(previewCode: string, solutionCode: string): ComponentType {
  const solutionExports = evalModule(transpile(solutionCode), makeRequire());
  const previewExports = evalModule(
    transpile(previewCode),
    makeRequire({ "./solution": solutionExports })
  );
  const Demo = previewExports.default as ComponentType | undefined;
  if (!Demo) throw new Error("preview.tsx has no default export");
  return Demo;
}
