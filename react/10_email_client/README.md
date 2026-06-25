# React 10 — Email Client

**Estimated time:** 50–70 minutes
**Goal:** Compose many interactions — selection, read/unread, starring,
folders, and search — into one stateful app, the capstone React exercise.

You edit `solution.tsx`.

---

## Component contract

```ts
interface Email {
  id: number;
  from: string;
  subject: string;
  body: string;
  read?: boolean;       // default false
  starred?: boolean;    // default false
  folder?: "inbox" | "archived"; // default "inbox"
}
interface EmailClientProps { emails: Email[]; }
```

The tests rely on: one `<li>` per visible email with `data-unread` /
`data-starred`; an **open** button reading `"<from> — <subject>"`; a
`data-testid="reading-pane"` showing the body; a `data-testid="unread-count"`;
star buttons named **"star &lt;subject&gt;"** (`aria-pressed`); **"Mark unread"**
and **"Archive"** buttons; **"Inbox"** / **"Archived"** folder buttons; and a
search input named **"search"**.

---

## Level 1 — List + read

Render the inbox. Show the **unread count**. Clicking an email opens it in the
**reading pane** and marks it **read**.

## Level 2 — Star + mark unread

Each email has a **star** toggle. The reading pane has **Mark unread** which
returns the open email to unread (and bumps the count).

## Level 3 — Archive + folders

**Inbox** / **Archived** folder buttons switch the visible list. The reading
pane's **Archive** moves the open email to *archived* and closes the pane.

## Level 4 — Search

A **search** box filters the current folder by subject or sender
(case-insensitive).
