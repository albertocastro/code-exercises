import { describe, it, expect } from "vitest";
import { planImport, applyPlan, type ImportPlan } from "./autoImports";

// Convenience: plan then apply, so assertions read as "what the file becomes".
function add(code: string, symbol: string, module = "react", isType = false): string {
  return applyPlan(code, planImport(code, symbol, module, isType));
}
function planCase(code: string, symbol: string, module = "react", isType = false): ImportPlan["case"] {
  return planImport(code, symbol, module, isType).case;
}

describe("planImport — merge into existing named import", () => {
  it("merges into a single-line react import", () => {
    const code = `import { useState } from "react";\n\nexport function C() {}\n`;
    expect(add(code, "useRef")).toBe(
      `import { useState, useRef } from "react";\n\nexport function C() {}\n`
    );
    expect(planCase(code, "useRef")).toBe("merge");
  });

  it("merges into a multi-symbol import without disturbing the rest", () => {
    const code = `import { useState, useEffect } from "react";\n`;
    expect(add(code, "useMemo")).toBe(`import { useState, useEffect, useMemo } from "react";\n`);
  });

  it("handles a trailing comma in the named list", () => {
    const code = `import { useState, } from "react";\n`;
    expect(add(code, "useRef")).toBe(`import { useState, useRef } from "react";\n`);
  });

  it("merges alongside a default import", () => {
    const code = `import React, { useState } from "react";\n`;
    expect(add(code, "useEffect")).toBe(`import React, { useState, useEffect } from "react";\n`);
  });

  it("preserves the existing quote style (single quotes)", () => {
    const code = `import { useState } from 'react';\n`;
    expect(add(code, "useRef")).toBe(`import { useState, useRef } from 'react';\n`);
  });
});

describe("planImport — already present (no-op)", () => {
  it("does nothing when the symbol is already imported", () => {
    const code = `import { useState, useRef } from "react";\n`;
    expect(planCase(code, "useRef")).toBe("present");
    expect(add(code, "useRef")).toBe(code);
  });

  it("ignores an aliased local that matches", () => {
    const code = `import { useState as useS } from "react";\n`;
    expect(planCase(code, "useS")).toBe("present");
  });

  it("treats a matching default name as present", () => {
    const code = `import React from "react";\n`;
    expect(planCase(code, "React")).toBe("present");
  });
});

describe("planImport — new import line", () => {
  it("adds a new import at the top when none exists", () => {
    const code = `export function C() {\n  return null;\n}\n`;
    expect(add(code, "useRef")).toBe(`import { useRef } from "react";\n` + code);
    expect(planCase(code, "useRef")).toBe("new");
  });

  it("uses no semicolon when existing imports omit them", () => {
    const code = `import { foo } from "./util"\n`;
    expect(add(code, "useRef")).toBe(`import { useRef } from "react"\n` + code);
  });

  it("respects single-quote style for a brand-new line", () => {
    const code = `import { foo } from './util';\n`;
    expect(add(code, "useRef")).toBe(`import { useRef } from 'react';\n` + code);
  });
});

describe("planImport — type imports", () => {
  it("adds a `type` modifier when merging a type symbol", () => {
    const code = `import { useState } from "react";\n`;
    expect(add(code, "ReactNode", "react", true)).toBe(
      `import { useState, type ReactNode } from "react";\n`
    );
  });

  it("does not double-prefix inside an `import type {}` statement", () => {
    const code = `import type { FC } from "react";\n`;
    expect(add(code, "ReactNode", "react", true)).toBe(`import type { FC, ReactNode } from "react";\n`);
  });

  it("creates a new type import line", () => {
    const code = `export const x = 1;\n`;
    expect(add(code, "ReactNode", "react", true)).toBe(
      `import { type ReactNode } from "react";\n` + code
    );
  });
});

describe("planImport — default-only import", () => {
  it("adds a named group to a default-only import", () => {
    const code = `import React from "react";\n`;
    expect(add(code, "useState")).toBe(`import React, { useState } from "react";\n`);
    expect(planCase(code, "useState")).toBe("default");
  });
});

describe("planImport — distinct modules", () => {
  it("creates a react-dom import independently of react", () => {
    const code = `import { useState } from "react";\n`;
    expect(add(code, "createPortal", "react-dom")).toBe(
      `import { createPortal } from "react-dom";\n` + code
    );
  });
});
