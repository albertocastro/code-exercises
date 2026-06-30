import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CameraGrid } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const API = "/api/ex/28";

// jsdom (the CLI vitest env) has no layout engine, so getComputedStyle returns
// nothing meaningful there. The CSS rules are graded for real in the browser IDE;
// here we just skip those specific assertions.
const isJsdom = typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent);
const cssOf = (el: Element, prop: string) =>
  getComputedStyle(el).getPropertyValue(prop).trim();
const expectCss = (el: Element | null, prop: string, value: string) => {
  if (isJsdom || !el) return;
  expect(cssOf(el, prop)).toBe(value);
};

async function resetBackend(mode?: "fail" | "slow") {
  await fetch(`${API}/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

// Count fetches to the camera list so we can prove polling starts and stops.
function spyFetch() {
  const original = globalThis.fetch;
  let listCalls = 0;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (/\/cameras(\?|$)/.test(url)) listCalls += 1;
    return original(input as RequestInfo, init);
  }) as typeof fetch;
  return {
    get calls() {
      return listCalls;
    },
    restore() {
      globalThis.fetch = original;
    },
  };
}

beforeEach(async () => {
  await resetBackend();
});

// ── Level 1: Fetch + render the grid ────────────────────────────────────────
level(1, "fetch and render the grid", () => {
  test("shows a loading state while the first request is in flight", () => {
    render(<CameraGrid />);
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  test("renders one card per camera once the fetch resolves", async () => {
    render(<CameraGrid />);
    expect(await screen.findByTestId("camera-CAM-01")).toBeInTheDocument();
    expect(screen.getByTestId("camera-CAM-02")).toBeInTheDocument();
    expect(screen.getByTestId("camera-CAM-03")).toBeInTheDocument();
    expect(screen.getByTestId("camera-CAM-04")).toBeInTheDocument();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  test("each card shows the camera's name", async () => {
    render(<CameraGrid />);
    const card = await screen.findByTestId("camera-CAM-01");
    expect(card).toHaveTextContent("Front Entrance");
  });

  test("shows an error state when the request fails", async () => {
    await resetBackend("fail");
    render(<CameraGrid />);
    expect(await screen.findByTestId("error")).toBeInTheDocument();
  });
});

// ── Level 2: CSS layout + positioned status overlays ────────────────────────
level(2, "flexbox layout and positioned overlays", () => {
  test("the grid is a wrapping Flexbox row", async () => {
    render(<CameraGrid />);
    await screen.findByTestId("camera-CAM-01");
    const grid = screen.getByTestId("camera-grid");
    expectCss(grid, "display", "flex");
    expectCss(grid, "flex-wrap", "wrap");
  });

  test("the status badge is an absolutely-positioned overlay on the thumbnail", async () => {
    render(<CameraGrid />);
    const card = await screen.findByTestId("camera-CAM-01");
    const thumb = card.querySelector(".camera-thumb");
    expectCss(thumb, "position", "relative");
    expectCss(screen.getByTestId("status-CAM-01"), "position", "absolute");
  });

  test("status text reflects each camera; the LIVE dot is online-only", async () => {
    render(<CameraGrid />);
    await screen.findByTestId("camera-CAM-01");
    expect(screen.getByTestId("status-CAM-01")).toHaveTextContent("online");
    expect(screen.getByTestId("status-CAM-02")).toHaveTextContent("offline");
    expect(screen.getByTestId("live-CAM-01")).toBeInTheDocument();
    expect(screen.queryByTestId("live-CAM-02")).toBeNull();
  });
});

// ── Level 3: Live polling with a JavaScript timer ───────────────────────────
level(3, "live polling keeps statuses fresh", () => {
  test("an offline camera flips to online without a manual refresh", async () => {
    render(<CameraGrid pollMs={20} />);
    // Boots offline…
    expect(await screen.findByTestId("status-CAM-02")).toHaveTextContent("offline");
    // …and the interval poll brings it online.
    await waitFor(
      () => expect(screen.getByTestId("status-CAM-02")).toHaveTextContent("online"),
      { timeout: 2000 },
    );
  });

  test("polling stops when the component unmounts (effect cleanup)", async () => {
    const spy = spyFetch();
    try {
      const { unmount } = render(<CameraGrid pollMs={40} />);
      await screen.findByTestId("camera-CAM-01");
      await waitFor(() => expect(spy.calls).toBeGreaterThanOrEqual(2), { timeout: 2000 });
      unmount();
      const afterUnmount = spy.calls;
      // Wait several poll intervals. With cleanup, the count holds steady (at most
      // one already-dispatched poll may still land); without it, it keeps climbing.
      await new Promise((r) => setTimeout(r, 240));
      expect(spy.calls).toBeLessThanOrEqual(afterUnmount + 1);
    } finally {
      spy.restore();
    }
  });
});

// ── Level 4: Component architecture — selection + filter ────────────────────
level(4, "selection and the online-only filter", () => {
  test("clicking a card selects exactly one camera at a time", async () => {
    render(<CameraGrid />);
    const a = await screen.findByTestId("camera-CAM-01");
    const b = screen.getByTestId("camera-CAM-03");
    expect(a).toHaveAttribute("data-selected", "false");

    fireEvent.click(a);
    expect(a).toHaveAttribute("data-selected", "true");
    expect(b).toHaveAttribute("data-selected", "false");

    fireEvent.click(b);
    expect(a).toHaveAttribute("data-selected", "false");
    expect(b).toHaveAttribute("data-selected", "true");
  });

  test("the detail panel shows the selected camera's name", async () => {
    render(<CameraGrid />);
    fireEvent.click(await screen.findByTestId("camera-CAM-03"));
    expect(screen.getByTestId("detail")).toHaveTextContent("Parking Garage");
  });

  test("'Online only' hides offline cameras", async () => {
    render(<CameraGrid />);
    await screen.findByTestId("camera-CAM-02"); // offline at boot
    fireEvent.click(screen.getByTestId("online-only"));
    expect(screen.queryByTestId("camera-CAM-02")).toBeNull();
    expect(screen.getByTestId("camera-CAM-01")).toBeInTheDocument();
  });
});
