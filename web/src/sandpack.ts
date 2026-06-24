import type { SandpackFiles } from "@codesandbox/sandpack-react";
import type { ExerciseFiles } from "./manifest";

// Sandpack's in-browser test runner exposes jest-style globals (describe/test/
// expect/jest) in a jsdom environment — but NOT vitest's `vi`, and tests read
// `process.env.LEVEL`. We adapt our untouched repo test files at load time by
// prepending a prelude rather than forking them.
export function withLevel(testCode: string, level: number, react: boolean): string {
  const env =
    `globalThis.process = globalThis.process || {};` +
    `globalThis.process.env = globalThis.process.env || {};` +
    `globalThis.process.env.LEVEL = ${JSON.stringify(String(level))};`;

  if (!react) return `${env}\n${testCode}`;

  // React tests additionally need jest-dom matchers and a `vi` alias for `jest`.
  return (
    `import "@testing-library/jest-dom";\n` +
    `${env}\n` +
    `globalThis.vi = globalThis.vi || (typeof jest !== "undefined" ? jest : undefined);\n` +
    testCode
  );
}

const RTL_DEPS: Record<string, string> = {
  "@testing-library/react": "16.1.0",
  "@testing-library/dom": "10.4.0",
  "@testing-library/jest-dom": "6.6.3",
  "@testing-library/user-event": "14.5.2",
};

export interface SandpackConfig {
  template: "react-ts" | "vanilla-ts";
  files: SandpackFiles;
  dependencies: Record<string, string>;
  hasPreview: boolean;
}

export function buildConfig(
  categoryId: string,
  files: ExerciseFiles,
  level: number
): SandpackConfig {
  if (categoryId === "react") {
    return {
      template: "react-ts",
      files: {
        [files.solutionPath]: files.solutionCode,
        [files.testPath]: withLevel(files.testCode, level, true),
        // The preview demo becomes the rendered App for SandpackPreview.
        "/App.tsx": files.previewCode ?? "export default function Demo() { return null; }",
      },
      dependencies: RTL_DEPS,
      hasPreview: true,
    };
  }
  return {
    template: "vanilla-ts",
    files: {
      [files.solutionPath]: files.solutionCode,
      [files.testPath]: withLevel(files.testCode, level, false),
    },
    dependencies: {},
    hasPreview: false,
  };
}
