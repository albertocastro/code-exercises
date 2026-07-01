// Build-time raw import of every exercise file, so the browser IDE can load the
// real stubs, tests, READMEs, and preview demos straight from the repo.
const RAW = {
  ...import.meta.glob("../../react/*/*.{tsx,ts,md,css}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("../../exercise_*/*.{ts,md,java}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
} as Record<string, string>;

function get(suffix: string): string | undefined {
  const key = Object.keys(RAW).find((k) => k.endsWith(suffix));
  return key ? RAW[key] : undefined;
}

function javaFilesFor(base: string) {
  return Object.keys(RAW)
    .filter((key) => key.endsWith(".java") && key.includes(base))
    .map((key) => {
      const name = key.slice(key.lastIndexOf("/") + 1);
      return { name, code: RAW[key] };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface ExerciseFiles {
  readme: string;
  solutionPath: string;
  solutionCode: string;
  testPath: string;
  testCode: string;
  previewPath?: string;
  previewCode?: string;
  perfCode?: string; // optional Tier-1 complexity spec (perf.ts)
  stylesPath?: string; // optional learner-editable CSS (styles.css)
  stylesCode?: string;
  javaSolutionPath?: string;
  javaSolutionCode?: string;
  javaTestPath?: string;
  javaTestCode?: string;
  javaMainPath?: string;
  javaMainCode?: string;
  javaSolutionFileName?: string;
  javaTestFileName?: string;
  javaMainFileName?: string;
}

export function loadExercise(categoryId: string, exerciseId: string): ExerciseFiles {
  if (categoryId === "react") {
    const base = `/react/${exerciseId}/`;
    const stylesCode = get(`${base}styles.css`);
    return {
      readme: get(`${base}README.md`) ?? "",
      solutionPath: "/solution.tsx",
      solutionCode: get(`${base}solution.tsx`) ?? "",
      testPath: "/solution.test.tsx",
      testCode: get(`${base}solution.test.tsx`) ?? "",
      previewPath: "/preview.tsx",
      previewCode: get(`${base}preview.tsx`),
      ...(stylesCode !== undefined ? { stylesPath: "/styles.css", stylesCode } : {}),
    };
  }
  const base = `/${exerciseId}/`;
  const javaFiles = javaFilesFor(base);
  const javaMain = javaFiles.find((file) => file.name === "Main.java");
  const javaTest = javaFiles.find((file) => file.name.endsWith("Test.java"));
  const javaSolution =
    javaFiles.find((file) => file.name !== "Main.java" && !file.name.endsWith("Test.java"));
  return {
    readme: get(`${base}README.md`) ?? "",
    solutionPath: "/solution.ts",
    solutionCode: get(`${base}solution.ts`) ?? "",
    testPath: "/solution.test.ts",
    testCode: get(`${base}solution.test.ts`) ?? "",
    perfCode: get(`${base}perf.ts`),
    javaSolutionPath: javaSolution ? `/${javaSolution.name}` : undefined,
    javaSolutionCode: javaSolution?.code,
    javaSolutionFileName: javaSolution?.name,
    javaTestPath: javaTest ? `/${javaTest.name}` : undefined,
    javaTestCode: javaTest?.code,
    javaTestFileName: javaTest?.name,
    javaMainPath: javaMain ? `/${javaMain.name}` : undefined,
    javaMainCode: javaMain?.code,
    javaMainFileName: javaMain?.name,
  };
}
