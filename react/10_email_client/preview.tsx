import { EmailClient, type Email } from "./solution";

const EMAILS: Email[] = [
  { id: 1, from: "Ada Lovelace", subject: "Re: Analytical Engine", body: "The notes are ready for review." },
  { id: 2, from: "GitHub", subject: "Your weekly digest", body: "5 repositories had activity this week." },
  { id: 3, from: "Grace Hopper", subject: "Lunch on Friday?", body: "Want to grab lunch and debug ideas?" },
  { id: 4, from: "Newsletter", subject: "10 React tips", body: "Tip #1: build small, test often." },
];

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Email Client</h2>
        <p>Read, star, archive, switch folders, and search.</p>
      </div>
      <EmailClient emails={EMAILS} />
    </div>
  );
}
