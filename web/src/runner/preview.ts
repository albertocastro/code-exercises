import type { ComponentType } from "react";
import { transpile } from "./transpile";
import { clearLearnerCss, evalModule, makeRequire, type LearnerFiles } from "./modules";
import { makeCapturedConsole, type ConsoleSink } from "./consoleCapture";

// Compile preview.tsx (which imports ./solution) into a renderable component.
export function compilePreview(
  previewCode: string,
  solutionCode: string,
  onConsole?: ConsoleSink,
  stylesCode?: string,
  learnerFiles?: LearnerFiles
): ComponentType {
  // Drop learner CSS from the previous compile so only stylesheets imported by
  // THIS run apply (an import removed from solution.tsx stops taking effect).
  clearLearnerCss();
  const capturedConsole = makeCapturedConsole("preview", onConsole);
  const moduleGlobals = { console: capturedConsole };
  const solutionExports = evalModule(
    transpile(solutionCode),
    makeRequire({ css: stylesCode, learnerFiles, moduleGlobals }),
    moduleGlobals
  );
  const previewExports = evalModule(
    transpile(previewCode),
    makeRequire({
      locals: { "./solution": solutionExports },
      css: stylesCode,
      learnerFiles,
      moduleGlobals,
    }),
    moduleGlobals
  );
  const Demo = previewExports.default as ComponentType | undefined;
  if (!Demo) throw new Error("preview.tsx has no default export");
  return Demo;
}
