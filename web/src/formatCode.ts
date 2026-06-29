function parserFor(path: string) {
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "babel";
  return "typescript";
}

export async function formatCode(source: string, path: string) {
  const [{ format }, babelPlugin, estreePlugin, typescriptPlugin] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
    import("prettier/plugins/typescript"),
  ]);

  return format(source, {
    parser: parserFor(path),
    plugins: [typescriptPlugin.default, babelPlugin.default, estreePlugin.default],
    printWidth: 90,
    tabWidth: 2,
    semi: true,
    trailingComma: "es5",
  });
}
