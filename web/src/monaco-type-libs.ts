import type { Monaco } from "@monaco-editor/react";

import csstype from "../../node_modules/csstype/index.d.ts?raw";
import propTypes from "../../node_modules/@types/prop-types/index.d.ts?raw";
import react from "../../node_modules/@types/react/index.d.ts?raw";
import reactGlobal from "../../node_modules/@types/react/global.d.ts?raw";
import reactJsxRuntime from "../../node_modules/@types/react/jsx-runtime.d.ts?raw";

const libs = [
  ["file:///node_modules/csstype/index.d.ts", csstype],
  ["file:///node_modules/@types/prop-types/index.d.ts", propTypes],
  ["file:///node_modules/@types/react/global.d.ts", reactGlobal],
  ["file:///node_modules/@types/react/index.d.ts", react],
  ["file:///node_modules/@types/react/jsx-runtime.d.ts", reactJsxRuntime],
] as const;

let installed = false;

export function installTypeLibraries(monaco: Monaco) {
  if (installed) return;
  installed = true;

  for (const [path, source] of libs) {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(source, path);
  }
}
