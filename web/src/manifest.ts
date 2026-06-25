// Build-time raw import of every exercise file, so the browser IDE can load the
// real stubs, tests, READMEs, and preview demos straight from the repo.
const RAW = {
  ...import.meta.glob("../../react/*/*.{tsx,ts,md}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
  ...import.meta.glob("../../exercise_*/*.{ts,md}", {
    query: "?raw",
    import: "default",
    eager: true,
  }),
} as Record<string, string>;

function get(suffix: string): string | undefined {
  const key = Object.keys(RAW).find((k) => k.endsWith(suffix));
  return key ? RAW[key] : undefined;
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
}

export function loadExercise(categoryId: string, exerciseId: string): ExerciseFiles {
  if (categoryId === "react") {
    const base = `/react/${exerciseId}/`;
    return {
      readme: get(`${base}README.md`) ?? "",
      solutionPath: "/solution.tsx",
      solutionCode: get(`${base}solution.tsx`) ?? "",
      testPath: "/solution.test.tsx",
      testCode: get(`${base}solution.test.tsx`) ?? "",
      previewPath: "/preview.tsx",
      previewCode: get(`${base}preview.tsx`),
    };
  }
  const base = `/${exerciseId}/`;
  return {
    readme: get(`${base}README.md`) ?? "",
    solutionPath: "/solution.ts",
    solutionCode: get(`${base}solution.ts`) ?? "",
    testPath: "/solution.test.ts",
    testCode: get(`${base}solution.test.ts`) ?? "",
    perfCode: get(`${base}perf.ts`),
  };
}
