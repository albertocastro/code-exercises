import type { ReactElement } from "react";
import * as RTL from "@testing-library/react";

// Render exercise components into an isolated sandbox node, not document.body.
// Otherwise RTL's containers + `screen` queries would collide with the IDE's
// own DOM (its buttons, etc.), and cleanup would wipe the whole app.
const sandbox = document.createElement("div");
sandbox.id = "rtl-sandbox";
sandbox.style.position = "absolute";
sandbox.style.left = "-99999px";
document.body.appendChild(sandbox);

function render(ui: ReactElement, options?: RTL.RenderOptions) {
  const container = document.createElement("div");
  sandbox.appendChild(container);
  return RTL.render(ui, { container, baseElement: sandbox, ...options });
}

// `screen` scoped to the sandbox subtree.
const screen = RTL.within(sandbox);

export function clearSandbox() {
  try {
    RTL.cleanup();
  } catch {
    /* nothing mounted */
  }
  sandbox.innerHTML = "";
}

// The module the exercise tests import as "@testing-library/react".
export const rtl = { ...RTL, render, screen };
