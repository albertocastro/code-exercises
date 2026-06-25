import "./polyfills"; // must run before libs that read process/global at import
import React from "react";
import { createRoot } from "react-dom/client";
import "./monaco-setup"; // configure local Monaco before any editor mounts
import { App } from "./App";
import { AppErrorBoundary } from "./ErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
