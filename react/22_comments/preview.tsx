import { CommentTree, type Comment } from "./solution";

const COMMENTS: Comment[] = [
  {
    id: 1,
    text: "Great article!",
    replies: [
      { id: 2, text: "Agreed.", replies: [{ id: 3, text: "Same here." }] },
      { id: 4, text: "Thanks for sharing." },
    ],
  },
  { id: 5, text: "I have a question…" },
];

export default function Demo() {
  return (
    <div className="exercise-demo">
      <div className="exercise-title">
        <h2>Nested Comments</h2>
        <p>Collapse subtrees and reply inline.</p>
      </div>
      <CommentTree comments={COMMENTS} onReply={(id, t) => console.log("reply to", id, t)} />
    </div>
  );
}
