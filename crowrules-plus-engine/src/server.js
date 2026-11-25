import "dotenv/config";
import http from "node:http";
import { timingSafeEqual } from "node:crypto";
import { ChannelWorker } from "./channel-worker.js";

const env = process.env;
const PORT = Number(env.PORT || 8788);
const HOST = env.HOST || "127.0.0.1";
const CONTROL_TOKEN = env.CR_CONTROL_TOKEN || "";
const SUPABASE_URL = (env.SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || "";
const OWNER_ID = env.CR_OWNER_USER_ID || "";
const POLL_MS = Math.max(2000, Number(env.POLL_INTERVAL_MS || 5000));
const HEARTBEAT_MS = Math.max(5000, Number(env.HEARTBEAT_INTERVAL_MS || 15000));

const CHANNELS = [
  { id: "cr-main", slug: "main", name: "CrowRules+ Main", keyEnv: "CR_MAIN_STREAM_KEY", standbyEnv: "CR_MAIN_STANDBY_FILE" },
  { id: "cr-tacoma", slug: "tacoma-nights", name: "Tacoma Nights", keyEnv: "CR_TACOMA_STREAM_KEY", standbyEnv: "CR_TACOMA_STANDBY_FILE" },
  { id: "cr-productions", slug: "productions", name: "CrowRules Productions", keyEnv: "CR_PRODUCTIONS_STREAM_KEY", standbyEnv: "CR_PRODUCTIONS_STANDBY_FILE" },
  { id: "cr-backdeck", slug: "back-deck-live", name: "Back Deck Live", keyEnv: "CR_BACKDECK_STREAM_KEY", standbyEnv: "CR_BACKDECK_STANDBY_FILE" }
];

if (CONTROL_TOKEN.length < 40) {
  console.error("CR_CONTROL_TOKEN must be at least 40 characters.");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY || !OWNER_ID) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and CR_OWNER_USER_ID are required.");
  process.exit(1);
}

async function supabase(path, options = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(12000)
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`Supabase ${response.status}: ${body.slice(0, 400)}`);
  return body ? JSON.parse(body) : null;
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ""));
  const bb = Buffer.from(String(b || ""));
  return aa.length === bb.length && timingSafeEqual(aa, bb);
}
function send(res, status, data) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(data));
}
function authorized(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  return safeEqual(token, CONTROL_TOKEN);
}

const workers = new Map();
for (const config of CHANNELS) {
  const worker = new ChannelWorker({
    config,
    env,
    supabase,
    ownerId: OWNER_ID,
    pollMs: POLL_MS,
    heartbeatMs: HEARTBEAT_MS
  });
  workers.set(config.id, worker);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/health") {
    return send(res, 200, {
      ok: true,
      service: "crowrules-plus-playout",
      independentWorkers: workers.size,
      channels: [...workers.values()].map(w => w.snapshot()),
      checkedAt: new Date().toISOString()
    });
  }
  if (!authorized(req)) return send(res, 401, { error: "Unauthorized" });
  if (req.method === "GET" && url.pathname === "/api/channels") {
    return send(res, 200, [...workers.values()].map(w => w.snapshot()));
  }
  const match = url.pathname.match(/^\/api\/channels\/([a-z0-9-]+)\/(start|stop|restart)$/);
  if (req.method === "POST" && match) {
    const worker = workers.get(match[1]);
    if (!worker) return send(res, 404, { error: "Unknown channel" });
    try {
      if (match[2] === "start") await worker.start();
      if (match[2] === "stop") await worker.stop("director_stop");
      if (match[2] === "restart") { await worker.stop("director_restart"); await worker.start(); }
      return send(res, 200, { ok: true, channel: worker.snapshot() });
    } catch (error) {
      return send(res, 502, { error: error.message, channel: worker.snapshot() });
    }
  }
  return send(res, 404, { error: "Not found" });
});

async function boot() {
  for (const worker of workers.values()) {
    try { await worker.start(); }
    catch (error) { console.error(`[${worker.config.slug}] startup:`, error.message); }
  }
  server.listen(PORT, HOST, () => console.log(`CrowRules+ playout service listening on http://${HOST}:${PORT}`));
}
async function shutdown(signal) {
  console.log(`Received ${signal}; stopping all channel workers.`);
  server.close();
  await Promise.all([...workers.values()].map(w => w.stop("service_shutdown")));
  process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
boot().catch(error => { console.error(error); process.exit(1); });
