import { useState } from "react";

export interface Email {
  id: number;
  from: string;
  subject: string;
  body: string;
  read?: boolean;
  starred?: boolean;
  folder?: "inbox" | "archived";
}
export interface EmailClientProps {
  emails: Email[];
}

/**
 * Build a mini email client. See README.md for the per-level spec.
 *
 * The tests rely on: one <li> per visible email with data-unread / data-starred;
 * an "open" button reading "<from> — <subject>"; a data-testid="reading-pane"
 * (with the body); a data-testid="unread-count"; star buttons named
 * "star <subject>"; "Mark unread" / "Archive" buttons; "Inbox"/"Archived" folder
 * buttons; and a search input named "search".
 */
export function EmailClient({ emails }: EmailClientProps) {
  const [list] = useState<Email[]>(() =>
    emails.map((e) => ({ folder: "inbox", read: false, starred: false, ...e }))
  );
  const [openId, setOpenId] = useState<number | null>(null);
  const open = list.find((e) => e.id === openId) ?? null;

  // TODO Level 1: show data-testid="unread-count" (unread inbox emails); opening
  //   an email marks it read.
  // TODO Level 2: a star button per email (aria-label `star <subject>`,
  //   aria-pressed) + a "Mark unread" button in the reading pane.
  // TODO Level 3: "Inbox"/"Archived" folder buttons + an "Archive" action that
  //   moves the open email to the archived folder.
  // TODO Level 4: a search input (aria-label "search") filtering the current
  //   folder by subject or sender.

  return (
    <div className="exercise-card email-client">
      <ul className="exercise-list">
        {list.map((e) => (
          <li className="exercise-list-item" key={e.id} data-unread={!e.read} data-starred={!!e.starred}>
            <button className="email-open" onClick={() => setOpenId(e.id)}>
              {e.from} — {e.subject}
            </button>
          </li>
        ))}
      </ul>
      {open && (
        <div data-testid="reading-pane" className="email-reading">
          <h3>{open.subject}</h3>
          <p className="exercise-muted">{open.from}</p>
          <p>{open.body}</p>
        </div>
      )}
    </div>
  );
}
