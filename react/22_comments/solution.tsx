export interface Comment {
  id: number;
  text: string;
  replies?: Comment[];
}
export interface CommentTreeProps {
  comments: Comment[];
  onReply?: (parentId: number, text: string) => void;
}

/**
 * Build a nested comment thread (recursive). See README.md.
 *
 * The tests rely on every comment's text being rendered; a collapse/expand
 * button (named "collapse"/"expand") on comments with replies; and a per-comment
 * "reply to <text>" button revealing a "reply box for <text>" + Submit that
 * calls onReply(comment.id, text).
 */
function CommentNode({ comment }: { comment: Comment; onReply?: CommentTreeProps["onReply"] }) {
  // TODO Level 1: render comment.text, then RECURSIVELY render comment.replies
  //   (each as a <CommentNode>) inside a <ul className="comment-children"> so the
  //   whole nested tree appears.
  // TODO Level 2: a collapse/expand button (only for comments with replies)
  //   that hides/shows the nested replies.
  // TODO Level 3: a "Reply" button that reveals a reply box; Submit calls
  //   onReply(comment.id, text).
  return (
    <li className="comment">
      <div className="comment-text">{comment.text}</div>
      {/* TODO Level 1: recursively render comment.replies here */}
    </li>
  );
}

export function CommentTree({ comments }: CommentTreeProps) {
  return (
    <ul className="exercise-list comment-root">
      {comments.map((c) => (
        <CommentNode key={c.id} comment={c} />
      ))}
    </ul>
  );
}
