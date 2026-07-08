// Standalone production server for the Web IDE.
//
// The Web IDE has historically been served ONLY by the Vite dev server, whose
// middleware also implemented every `/api/*` route. The static build (dist-web/)
// has no backend. This server closes that gap: it serves the static build AND
// mounts the exact same `/api/*` handlers the dev server uses, imported from the
// shared web-api/handlers.mjs module — so dev and prod behave identically.
//
// Dependency-light on purpose: raw `node:http` + a small static handler. Express
// isn't in the dep tree and would only add a router we don't need; the API is a
// handful of prefix routes, and Connect-style prefix matching is a few lines.
//
// Java execution shells out to the host `docker` CLI (see handlers.mjs). In the
// container deploy the host docker socket is bind-mounted in, so the Java runner
// is a sibling container on the same daemon.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { registerApiRoutes } from "../web-api/handlers.mjs";
import { metricsHandler } from "./metrics.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist-web");

const PORT = Number(process.env.PORT) || 3200;
const HOST = process.env.HOSTNAME || "0.0.0.0";

// ---------------------------------------------------------------------------
// API routing — Connect-style prefix matching, matching Vite's middleware
// semantics so the shared handlers behave identically.
//
// `registerApiRoutes` calls use(prefix, handler). We record each (prefix,
// handler) and, on a request whose path starts with the prefix, rewrite
// `req.url` to be relative to that prefix (exactly what Connect/Vite does) then
// invoke the handler. Longest-prefix-first so "/api/java-test" wins over a
// hypothetical shorter prefix.
// ---------------------------------------------------------------------------

const routes = [];
registerApiRoutes((prefix, handler) => routes.push({ prefix, handler }));
routes.sort((a, b) => b.prefix.length - a.prefix.length);

function matchApi(req) {
  const url = req.url ?? "/";
  const pathname = url.split("?")[0];
  for (const { prefix, handler } of routes) {
    // Connect matches "/api/x" against both "/api/x" and "/api/x/...".
    if (pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : prefix + "/")) {
      // Rewrite req.url to be relative to the prefix, preserving the query.
      const rest = url.slice(prefix.length);
      req.url = rest.startsWith("/") || rest.startsWith("?") || rest === "" ? rest || "/" : "/" + rest;
      return handler;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Static file serving for dist-web/. SPA-style fallback to index.html.
// ---------------------------------------------------------------------------

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
};

function safeResolve(pathname) {
  // Decode + normalize, then confine to DIST to prevent path traversal.
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    decoded = pathname;
  }
  const resolved = path.join(DIST, path.normalize(decoded).replace(/^(\.\.[/\\])+/, ""));
  if (resolved !== DIST && !resolved.startsWith(DIST + path.sep)) return null;
  return resolved;
}

function serveFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", type);
  // Hashed asset filenames (Vite emits content-hashed names) can cache hard;
  // index.html must stay fresh so new deploys are picked up.
  if (ext === ".html") res.setHeader("Cache-Control", "no-cache");
  else if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  createReadStream(file).on("error", () => {
    res.statusCode = 500;
    res.end("Internal Server Error");
  }).pipe(res);
}

function serveStatic(req, res) {
  const pathname = (req.url ?? "/").split("?")[0];
  const resolved = safeResolve(pathname);
  if (!resolved) {
    res.statusCode = 403;
    return res.end("Forbidden");
  }

  if (existsSync(resolved) && statSync(resolved).isFile()) {
    return serveFile(res, resolved);
  }
  // Directory or missing path → try index.html inside a dir, else SPA fallback.
  const dirIndex = path.join(resolved, "index.html");
  if (existsSync(resolved) && statSync(resolved).isDirectory() && existsSync(dirIndex)) {
    return serveFile(res, dirIndex);
  }
  const spaIndex = path.join(DIST, "index.html");
  if (existsSync(spaIndex)) return serveFile(res, spaIndex);

  res.statusCode = 404;
  res.end("Not Found");
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const server = createServer((req, res) => {
  const pathname = (req.url ?? "/").split("?")[0];
  if (pathname === "/metrics") {
    return metricsHandler(req, res).catch((e) => {
      if (!res.headersSent) res.statusCode = 500;
      res.end(String(e?.message ?? e));
    });
  }
  if (pathname.startsWith("/api/")) {
    const handler = matchApi(req);
    if (handler) {
      Promise.resolve()
        .then(() => handler(req, res))
        .catch((e) => {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
          }
          res.end(JSON.stringify({ ok: false, error: e?.message ?? String(e) }));
        });
      return;
    }
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: `No API route for ${pathname}` }));
  }
  serveStatic(req, res);
});

if (!existsSync(DIST)) {
  console.warn(
    `[server] dist-web/ not found at ${DIST}. Run "npm run web:build" first. ` +
      `Starting anyway — /api/* routes work, static requests will 404.`
  );
}

server.listen(PORT, HOST, () => {
  console.log(`code-exercises Web IDE listening on http://${HOST}:${PORT} (serving ${DIST})`);
});
