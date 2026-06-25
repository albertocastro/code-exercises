import { KeyboardEvent, useState } from "react";

export interface TagInputProps {
  initialTags?: string[];
  maxTags?: number;
  onChange?: (tags: string[]) => void;
}

/**
 * Build a tag / chip input. See README.md.
 *
 * The tests rely on: an input named "add tag"; each tag in an element with
 * data-testid="tag"; a per-tag remove button named "remove <tag>".
 */
export function TagInput({ initialTags = [], maxTags, onChange }: TagInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [text, setText] = useState("");

  // TODO Level 1: Enter adds the current text as a tag and clears the input
  //   (call onChange with the new array).
  // TODO Level 2: a remove button per tag, and Backspace on an empty input
  //   removes the last tag.
  // TODO Level 3: ignore duplicates and empty/whitespace (trim); respect maxTags.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!text) return;
      const next = [...tags, text];
      setTags(next);
      onChange?.(next);
      setText("");
    }
  };

  return (
    <div className="exercise-card">
      <div className="exercise-row">
        {tags.map((t) => (
          <span className="exercise-chip" key={t} data-testid="tag">
            {t}
          </span>
        ))}
        <input
          className="exercise-input"
          aria-label="add tag"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
        />
      </div>
    </div>
  );
}
