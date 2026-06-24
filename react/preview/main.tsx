import React from "react";
import { createRoot } from "react-dom/client";

// Every exercise ships a preview.tsx default-exporting a <Demo/>. We glob them
// all and mount the one named by VITE_EXERCISE (set by the CLI when it launches
// the dev server, defaulting to the counter).
const previews = import.meta.glob("../*/preview.tsx");
const exercise = import.meta.env.VITE_EXERCISE || "01_counter";
const key = `../${exercise}/preview.tsx`;

const root = createRoot(document.getElementById("root")!);
const loader = previews[key];

if (!loader) {
  root.render(
    <div>
      <h2>Unknown exercise: {exercise}</h2>
      <p>Available: {Object.keys(previews).map((k) => k.split("/")[1]).join(", ")}</p>
    </div>
  );
} else {
  loader().then((mod) => {
    const Demo = (mod as { default: React.ComponentType }).default;
    root.render(
      <React.StrictMode>
        <Demo />
      </React.StrictMode>
    );
  });
}
