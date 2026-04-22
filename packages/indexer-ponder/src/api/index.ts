import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "OPTIONS"],
  allowHeaders: ["Content-Type"],
  maxAge: 86400,
}));

// API info endpoint (Ponder reserves /health and /status internally)
app.get("/api/info", (c) => {
  return c.json({ status: "ok", timestamp: Date.now() });
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

app.onError((err, c) => {
  console.error("API Error:", err);
  return c.json({
    error: "Internal server error",
    message: err.message
  }, 500);
});


export default app