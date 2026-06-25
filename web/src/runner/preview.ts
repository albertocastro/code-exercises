import type { ComponentType } from "react";
import { transpile } from "./transpile";
import { evalModule, makeRequire } from "./modules";
import { makeCapturedConsole, type ConsoleSink } from "./consoleCapture";

// Compile preview.tsx (which imports ./solution) into a renderable component.
export function compilePreview(
  previewCode: string,
  solutionCode: string,
  onConsole?: ConsoleSink
): ComponentType {
  const capturedConsole = makeCapturedConsole("preview", onConsole);
  const solutionExports = evalModule(transpile(solutionCode), makeRequire(), {
    console: capturedConsole,
  });
  const previewExports = evalModule(
    transpile(previewCode),
    makeRequire({ "./solution": solutionExports }),
    { console: capturedConsole }
  );
  const Demo = previewExports.default as ComponentType | undefined;
  if (!Demo) throw new Error("preview.tsx has no default export");
  return Demo;
}
