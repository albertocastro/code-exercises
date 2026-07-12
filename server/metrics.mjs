// Prometheus metrics endpoint for the standalone production server.
//
// Exposes prom-client's default Node.js process metrics (process/heap memory,
// GC pauses, event-loop lag, etc.) on a single Registry so the box's local
// Prometheus can scrape `GET /metrics`.

import { Registry, collectDefaultMetrics } from "prom-client";

const register = new Registry();
collectDefaultMetrics({ register });

export async function metricsHandler(req, res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", register.contentType);
  res.end(await register.metrics());
}
