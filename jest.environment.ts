import NodeEnvironment from "jest-environment-node";
import type { Circus } from "@jest/types";

export default class CustomEnvironment extends NodeEnvironment {
  async handleTestEvent(event: Circus.Event) {
    if (event.name === "test_start") {
      (this.global as Record<string, unknown>).__testFailed = false;
    } else if (event.name === "test_fn_failure") {
      (this.global as Record<string, unknown>).__testFailed = true;
    }
  }
}
