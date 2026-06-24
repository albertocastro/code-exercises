import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Unmount and clear the DOM between tests so each test starts from a clean tree.
afterEach(() => {
  cleanup();
});
