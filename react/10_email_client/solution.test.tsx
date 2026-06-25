import { render, screen, fireEvent, within } from "@testing-library/react";
import { EmailClient, type Email } from "./solution";

const MAX_LEVEL = process.env.LEVEL ? parseInt(process.env.LEVEL) : Infinity;
const level = (n: number, name: string, fn: () => void) =>
  (n <= MAX_LEVEL ? describe : describe.skip)(`Level ${n}: ${name}`, fn);

const EMAILS: Email[] = [
  { id: 1, from: "Alice", subject: "Lunch?", body: "Wanna grab lunch?" },
  { id: 2, from: "Bob", subject: "Report", body: "The report is ready." },
  { id: 3, from: "Carol", subject: "Vacation", body: "Off next week." },
];

const items = () => screen.queryAllByRole("listitem");
const unread = () => screen.getByTestId("unread-count").textContent;
const openEmail = (subject: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`— ${subject}`) }));

// ── Level 1: List + read ────────────────────────────────────────────────────
level(1, "list and read", () => {
  test("renders every email", () => {
    render(<EmailClient emails={EMAILS} />);
    expect(items()).toHaveLength(3);
    expect(screen.getByText(/Lunch\?/)).toBeInTheDocument();
  });

  test("shows the unread count", () => {
    render(<EmailClient emails={EMAILS} />);
    expect(unread()).toBe("3");
  });

  test("opening an email shows it in the reading pane", () => {
    render(<EmailClient emails={EMAILS} />);
    openEmail("Report");
    const pane = screen.getByTestId("reading-pane");
    expect(within(pane).getByText("The report is ready.")).toBeInTheDocument();
  });

  test("opening marks it read", () => {
    render(<EmailClient emails={EMAILS} />);
    openEmail("Report");
    expect(unread()).toBe("2");
    expect(items()[1]).toHaveAttribute("data-unread", "false");
  });
});

// ── Level 2: Star + mark unread ─────────────────────────────────────────────
level(2, "star and mark unread", () => {
  test("starring toggles the star state", () => {
    render(<EmailClient emails={EMAILS} />);
    const star = screen.getByRole("button", { name: "star Lunch?" });
    fireEvent.click(star);
    expect(star).toHaveAttribute("aria-pressed", "true");
    expect(items()[0]).toHaveAttribute("data-starred", "true");
    fireEvent.click(star);
    expect(star).toHaveAttribute("aria-pressed", "false");
  });

  test("mark unread returns it to unread", () => {
    render(<EmailClient emails={EMAILS} />);
    openEmail("Report");
    expect(unread()).toBe("2");
    fireEvent.click(screen.getByRole("button", { name: /mark unread/i }));
    expect(unread()).toBe("3");
    expect(items()[1]).toHaveAttribute("data-unread", "true");
  });
});

// ── Level 3: Archive + folders ──────────────────────────────────────────────
level(3, "archive and folders", () => {
  test("archiving removes the email from the inbox", () => {
    render(<EmailClient emails={EMAILS} />);
    openEmail("Lunch");
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    expect(items()).toHaveLength(2);
    expect(screen.queryByTestId("reading-pane")).toBeNull();
  });

  test("archived emails appear under the Archived folder", () => {
    render(<EmailClient emails={EMAILS} />);
    openEmail("Lunch");
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    expect(items()).toHaveLength(1);
    expect(screen.getByText(/Lunch\?/)).toBeInTheDocument();
  });

  test("switching back to Inbox shows the rest", () => {
    render(<EmailClient emails={EMAILS} />);
    openEmail("Lunch");
    fireEvent.click(screen.getByRole("button", { name: "Archive" }));
    fireEvent.click(screen.getByRole("button", { name: "Archived" }));
    fireEvent.click(screen.getByRole("button", { name: "Inbox" }));
    expect(items()).toHaveLength(2);
  });
});

// ── Level 4: Search ─────────────────────────────────────────────────────────
level(4, "search", () => {
  const search = (v: string) => fireEvent.change(screen.getByLabelText("search"), { target: { value: v } });

  test("filters by subject", () => {
    render(<EmailClient emails={EMAILS} />);
    search("report");
    expect(items()).toHaveLength(1);
    expect(screen.getByText(/Report/)).toBeInTheDocument();
  });

  test("filters by sender", () => {
    render(<EmailClient emails={EMAILS} />);
    search("carol");
    expect(items()).toHaveLength(1);
    expect(screen.getByText(/Vacation/)).toBeInTheDocument();
  });

  test("clearing search restores the list", () => {
    render(<EmailClient emails={EMAILS} />);
    search("report");
    search("");
    expect(items()).toHaveLength(3);
  });
});
