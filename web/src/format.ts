import { format } from "prettier/standalone";
import estreePlugin from "prettier/plugins/estree";
import typescriptPlugin from "prettier/plugins/typescript";

export async function formatCode(source: string, path: string) {
  return format(source, {
    filepath: path,
    parser: "typescript",
    plugins: [typescriptPlugin, estreePlugin],
    tabWidth: 2,
    endOfLine: "lf",
  });
}
