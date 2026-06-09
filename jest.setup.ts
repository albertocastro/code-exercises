type ConsoleFn = (...args: unknown[]) => void;
const methods = ["log", "warn", "error"] as const;
type Method = (typeof methods)[number];

let logs: Array<{ method: Method; args: unknown[] }> = [];
const originals = {} as Record<Method, ConsoleFn>;

beforeEach(() => {
  logs = [];
  for (const method of methods) {
    originals[method] = console[method].bind(console);
    jest.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logs.push({ method, args });
    });
  }
});

afterEach(() => {
  jest.restoreAllMocks();
  const failed = (global as Record<string, unknown>).__testFailed === true;
  if (failed && logs.length > 0) {
    originals.log(`\n── console: ${expect.getState().currentTestName} ──`);
    for (const { method, args } of logs) {
      originals[method](...args);
    }
  }
});
