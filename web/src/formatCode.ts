function parserFor(path: string) {
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".ts") || path.endsWith(".tsx")) return "typescript";
  if (path.endsWith(".js") || path.endsWith(".jsx")) return "babel";
  return "typescript";
}

export async function formatCode(source: string, path: string) {
  const parser = parserFor(path);

  // CSS uses Prettier's postcss parser, which needs no estree/babel/ts plugins.
  // Loading only the postcss plugin keeps the format path lean for stylesheets.
  if (parser === "css") {
    const [{ format }, postcssPlugin] = await Promise.all([
      import("prettier/standalone"),
      import("prettier/plugins/postcss"),
    ]);
    return format(source, {
      parser: "css",
      plugins: [postcssPlugin.default],
      printWidth: 90,
      tabWidth: 2,
    });
  }

  const [{ format }, babelPlugin, estreePlugin, typescriptPlugin] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/babel"),
    import("prettier/plugins/estree"),
    import("prettier/plugins/typescript"),
  ]);

  return format(source, {
    parser,
    plugins: [typescriptPlugin.default, babelPlugin.default, estreePlugin.default],
    printWidth: 90,
    tabWidth: 2,
    semi: true,
    trailingComma: "es5",
  });
}
