/**
 * Spin & Win mock API: a dependency-free stand-in for pbzone-api's `/v1/spin` (docs/spin-api-contract.md),
 * so the Spin & Win screen can be exercised before the real endpoint ships.
 *
 *   GET  /v1/spin/status           today's allowance, the wheel, today's last spin and the wallet
 *   POST /v1/spin {"requestId"}    spend a spin; the same requestId replays the original result
 *
 * DEV ONLY, on purpose:
 * - Callers are NOT authenticated. The player is the bearer token's userId / user_id / uid / sub / id claim,
 *   decoded WITHOUT checking the signature (only `exp` is honoured), or the x-user-id header when no token
 *   is sent. The Next proxy (/api/spin) sends both, and mints a token when the app has none.
 * - Everything (players, spins, wallets, the coin ledger) lives in memory and is gone when the process stops.
 *   Every player starts with { points: 1000, earnedPoints: 0, bonusPoints: 1000, leaderboardPoints: 0 }.
 *
 *   node scripts/mock-spin-api.mjs [--port 4010] [--host 127.0.0.1] [--latency <ms>] [--fail-rate <0..1>]
 *                                  [--jackpot-cap 50] [--spins-per-day 1]
 *
 * Point the app at it with SPIN_API_BASE_URL=http://127.0.0.1:4010 in .env.local. --fail-rate drops the
 * connection AFTER a new spin is committed (a lost response), so the app's retry with the same requestId
 * must get the original result back; replays are never dropped.
 *
 * Dev controls, not part of the contract (no auth, not delayed by --latency):
 *   GET  /__mock/state                          everything the mock remembers
 *   POST /__mock/reset[?user=<id>]              forget every player (or one), the jackpot count and the clock offset
 *   POST /__mock/advance[?minutes=<n>]          move the mock clock forward; default: just past the next IST midnight
 *   POST /__mock/force?segment=<id>[&times=<n>] make the next n new draws (any player) land on that segment;
 *                                               the jackpot cap still applies
 */

import { Buffer } from "node:buffer";
import { randomInt, randomUUID } from "node:crypto";
import { createServer } from "node:http";
import process from "node:process";

const IST_OFFSET_MS = 330 * 60_000; // Asia/Kolkata is UTC+05:30 all year (no DST)
const MAX_BODY_BYTES = 16 * 1024;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;
const START_WALLET = { points: 1000, earnedPoints: 0, bonusPoints: 1000, leaderboardPoints: 0 };
const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-user-id, x-user-name",
  "access-control-max-age": "600",
};

/** The v1 wheel, clockwise from 12 o'clock. Prizes and weights (total 100) never leave the server. */
const WHEEL = [
  { id: "leaf", label: "15", icon: "leaf", colour: "#F6C744", reward: { type: "coins", amount: 15 }, weight: 30 },
  { id: "book", label: "25", icon: "book", colour: "#23843F", reward: { type: "coins", amount: 25 }, weight: 25 },
  { id: "bulb", label: "40", icon: "bulb", colour: "#F2862E", reward: { type: "coins", amount: 40 }, weight: 20 },
  { id: "star", label: "60", icon: "star", colour: "#1E7A3E", reward: { type: "coins", amount: 60 }, weight: 13 },
  { id: "potato", label: "+1 Spin", icon: "potato", colour: "#FBE08A", reward: { type: "extra_spin", amount: 1 }, weight: 10 },
  { id: "gift", label: "150", icon: "gift", colour: "#F39A12", reward: { type: "coins", amount: 150 }, weight: 2, jackpot: true },
];

const USAGE = `Spin & Win mock API (dev only). Usage: node scripts/mock-spin-api.mjs [options]
  --port <n>           port to listen on (default: $PORT or 4010)
  --host <address>     interface to bind (default: 127.0.0.1)
  --latency <ms>       delay every API response by <ms>
  --fail-rate <0..1>   share of new spins whose connection is dropped after the spin is committed
  --jackpot-cap <n>    jackpots paid per IST day across all players (default: 50)
  --spins-per-day <n>  free spins per player per IST day (default: 1)
  --help               show this help`;

function readOptions(argv) {
  const opts = { port: 4010, host: "127.0.0.1", latency: 0, failRate: 0, jackpotCap: 50, spinsPerDay: 1 };
  const quit = (message) => {
    console.error(`${message}\n\n${USAGE}`);
    process.exit(1);
  };
  const envPort = process.env.PORT?.trim();
  if (envPort) {
    opts.port = Number(envPort);
    if (!Number.isInteger(opts.port) || opts.port < 1 || opts.port > 65535) quit(`PORT must be a whole number from 1 to 65535`);
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      console.log(USAGE);
      process.exit(0);
    }
    // Both "--port 4019" and "--port=4019".
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    let raw;
    if (eq === -1) {
      i += 1;
      raw = argv[i];
    } else {
      raw = arg.slice(eq + 1);
    }
    if (raw === undefined || raw.trim() === "") quit(`${name} needs a value`);
    const value = Number(raw);
    const whole = (min, max) => {
      if (!Number.isInteger(value) || value < min || value > max) quit(`${name} must be a whole number from ${min} to ${max}`);
      return value;
    };
    switch (name) {
      case "--port":
        opts.port = whole(1, 65535);
        break;
      case "--host":
        opts.host = raw;
        break;
      case "--latency":
        opts.latency = whole(0, 120_000);
        break;
      case "--fail-rate":
        if (!(value >= 0 && value <= 1)) quit("--fail-rate must be a number from 0 to 1");
        opts.failRate = value;
        break;
      case "--jackpot-cap":
        opts.jackpotCap = whole(0, 1_000_000);
        break;
      case "--spins-per-day":
        opts.spinsPerDay = whole(1, 100);
        break;
      default:
        quit(`Unknown option ${arg}`);
    }
  }
  return opts;
}

const opts = readOptions(process.argv.slice(2));

// ---- Clock: IST days ---------------------------------------------------------------------------------

let clockOffsetMs = 0;

/** The mock's clock: real time plus however far /__mock/advance has moved it. */
const now = () => Date.now() + clockOffsetMs;

/** The Asia/Kolkata calendar date of `ms`, e.g. "2026-10-15". */
const istDay = (ms) => new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);

/** The first 00:00 IST after `ms` (epoch ms). */
function nextIstMidnight(ms) {
  const ist = new Date(ms + IST_OFFSET_MS);
  return Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate() + 1) - IST_OFFSET_MS;
}

// ---- State ---------------------------------------------------------------------------------------------

/** userId → { wallet, days: Map<istDay, { draws, extraSpins, lastSpin }>, spins: Map<requestId, spin>, ledger } */
const players = new Map();
/** istDay → jackpots paid that day, across all players. */
const jackpots = new Map();
/** Segment ids the next new draws are forced onto (POST /__mock/force). */
const forced = [];

function playerFor(userId) {
  let player = players.get(userId);
  if (!player) {
    player = { wallet: { ...START_WALLET }, days: new Map(), spins: new Map(), ledger: [] };
    players.set(userId, player);
  }
  return player;
}

/** Spins left today = free spins + "one more spin" wins − draws. nextSpinAt only while none are left. */
function allowance(player, ms) {
  const day = player.days.get(istDay(ms));
  const spinsLeft = Math.max(0, opts.spinsPerDay + (day?.extraSpins ?? 0) - (day?.draws ?? 0));
  return {
    canSpin: spinsLeft > 0,
    spinsLeft,
    nextSpinAt: spinsLeft > 0 ? null : new Date(nextIstMidnight(ms)).toISOString(),
  };
}

function weightedPick(segments) {
  let roll = randomInt(segments.reduce((sum, segment) => sum + segment.weight, 0));
  for (const segment of segments) {
    if (roll < segment.weight) return segment;
    roll -= segment.weight;
  }
  return segments[segments.length - 1];
}

/** Secure weighted draw. Once today's jackpot cap is reached, a jackpot is re-drawn among the other segments. */
function draw(dayKey) {
  const forcedId = forced.shift();
  const first = forcedId ? WHEEL.find((segment) => segment.id === forcedId) : weightedPick(WHEEL);
  if (!first.jackpot || (jackpots.get(dayKey) ?? 0) < opts.jackpotCap) return { segment: first, capped: false };
  return { segment: weightedPick(WHEEL.filter((segment) => !segment.jackpot)), capped: true };
}

function statusData(player, ms) {
  return {
    ...allowance(player, ms),
    segments: WHEEL.map(({ id, label, icon, colour }) => ({ id, label, icon, colour })),
    lastSpin: player.days.get(istDay(ms))?.lastSpin ?? null,
    wallet: { ...player.wallet },
    today: istDay(ms),
    timezone: "Asia/Kolkata",
  };
}

/** The spin's own outcome never changes; allowance and wallet are read now (so a replay is never stale). */
function spinData(player, spin, ms) {
  return {
    spinId: spin.spinId,
    segmentId: spin.segmentId,
    reward: { ...spin.reward },
    ...allowance(player, ms),
    wallet: { ...player.wallet },
  };
}

/**
 * Replay check → allowance check → draw → pay → ledger, with no await in between (one atomic step).
 * Returns null when no spin is left today.
 */
function spendSpin(userId, requestId) {
  const ms = now();
  const player = playerFor(userId);
  const earlier = player.spins.get(requestId);
  if (earlier) return { spin: earlier, replay: true, capped: false, data: spinData(player, earlier, ms) };
  if (!allowance(player, ms).canSpin) return null;

  const dayKey = istDay(ms);
  const { segment, capped } = draw(dayKey);
  const day = player.days.get(dayKey) ?? { draws: 0, extraSpins: 0, lastSpin: null };
  player.days.set(dayKey, day);
  const at = new Date(ms).toISOString();
  const spin = { spinId: `spin_${randomUUID()}`, segmentId: segment.id, reward: { ...segment.reward }, at };
  day.draws += 1;
  if (segment.reward.type === "extra_spin") {
    day.extraSpins += segment.reward.amount;
  } else {
    // PB Coins only: total and earned coins grow together; bonusPoints and leaderboardPoints never move.
    player.wallet.points += segment.reward.amount;
    player.wallet.earnedPoints += segment.reward.amount;
    player.ledger.push({
      player_id: userId,
      event_id: spin.spinId,
      game_id: "spin-win",
      delta: segment.reward.amount,
      reason: "spin_win",
      timestamp: at,
    });
    if (segment.jackpot) jackpots.set(dayKey, (jackpots.get(dayKey) ?? 0) + 1);
  }
  day.lastSpin = spin;
  player.spins.set(requestId, spin);
  return { spin, replay: false, capped, data: spinData(player, spin, ms) };
}

// ---- HTTP ----------------------------------------------------------------------------------------------

const ok = (message, data) => ({ success: true, message, data });
const fail = (status, error, message) => ({ status, body: { success: false, error, message } });
const notAllowed = (allow) => ({ ...fail(405, "method_not_allowed", `Use ${allow}`), headers: { allow } });

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims && typeof claims === "object" && !Array.isArray(claims) ? claims : null;
  } catch {
    return null;
  }
}

/** The caller. A bearer token wins over x-user-id, as on the real server, but it is NOT verified here. */
function identify(req) {
  const header = req.headers["x-user-id"];
  const headerId = typeof header === "string" ? header.trim() : "";
  const authorization = req.headers.authorization?.trim();
  if (!authorization) {
    return headerId ? { userId: headerId, via: "x-user-id" } : { error: "Missing Authorization bearer token" };
  }
  const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1];
  const claims = token ? decodeJwtPayload(token) : null;
  if (!claims) return { error: "Authorization must be a Bearer JWT" };
  // Real time, not the mock clock: the proxy mints 12 h tokens, which must survive /__mock/advance.
  if (typeof claims.exp === "number" && claims.exp * 1000 <= Date.now()) return { error: "Bearer token has expired" };
  const id = [claims.userId, claims.user_id, claims.uid, claims.sub, claims.id].find(
    (value) => (typeof value === "string" && value.trim()) || (typeof value === "number" && Number.isFinite(value)),
  );
  if (id === undefined) return { error: "Bearer token has no user id claim" };
  const userId = String(id).trim();
  return { userId, via: headerId && headerId !== userId ? `token, x-user-id ${headerId} ignored` : "token" };
}

function readJson(req) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    req.on("error", () => resolve({ error: fail(400, "invalid_request", "Could not read the request body") }));
    req.on("end", () => {
      if (size > MAX_BODY_BYTES) {
        resolve({ error: fail(413, "payload_too_large", `Body is over ${MAX_BODY_BYTES} bytes`) });
        return;
      }
      const text = Buffer.concat(chunks).toString("utf8").trim();
      if (!text) {
        resolve({ value: {} });
        return;
      }
      try {
        const value = JSON.parse(text);
        if (value && typeof value === "object" && !Array.isArray(value)) resolve({ value });
        else resolve({ error: fail(400, "invalid_request", 'Body must be a JSON object: {"requestId":"…"}') });
      } catch {
        resolve({ error: fail(400, "invalid_request", 'Body must be JSON: {"requestId":"…"}') });
      }
    });
  });
}

const shortId = (id) => (id.length > 12 ? `${id.slice(0, 8)}…` : id);

/** "user=dev-user-1 (token)": who the request was booked to, and why. */
const playerTag = (who) => `user=${who.userId} (${who.via})`;

function describeReward(reward) {
  return reward.type === "extra_spin" ? `+${reward.amount} spin` : `+${reward.amount} coins`;
}

function handleStatus(req) {
  const who = identify(req);
  if (who.error) return { ...fail(401, "unauthorized", who.error), note: who.error };
  const data = statusData(playerFor(who.userId), now());
  return {
    status: 200,
    body: ok("Spin status retrieved", data),
    note: `${playerTag(who)} canSpin=${data.canSpin} left=${data.spinsLeft} coins=${data.wallet.points}`,
  };
}

async function handleSpin(req) {
  const who = identify(req);
  if (who.error) return { ...fail(401, "unauthorized", who.error), note: who.error };
  const parsed = await readJson(req);
  if (parsed.error) return { ...parsed.error, note: `${playerTag(who)} ${parsed.error.body.message}` };
  const { requestId } = parsed.value;
  if (requestId === undefined || requestId === null || requestId === "") {
    return { ...fail(400, "invalid_request", "requestId is required"), note: `${playerTag(who)} no requestId` };
  }
  if (typeof requestId !== "string" || !REQUEST_ID_PATTERN.test(requestId)) {
    const message = "requestId must be 8-128 characters of A-Z, a-z, 0-9, '.', '_', ':' or '-'";
    return { ...fail(400, "invalid_request", message), note: `${playerTag(who)} bad requestId` };
  }

  const result = spendSpin(who.userId, requestId);
  const caller = `${playerTag(who)} req=${shortId(requestId)}`;
  if (!result) {
    return {
      ...fail(409, "no_spin_left", "Today's free spin is used. The next one opens at midnight IST."),
      note: `${caller} no spin left (next ${allowance(playerFor(who.userId), now()).nextSpinAt})`,
    };
  }
  const { spin, data } = result;
  const outcome = `${spin.segmentId} ${describeReward(spin.reward)}${result.capped ? " (jackpot cap hit, re-drawn)" : ""}`;
  const note = `${caller} ${result.replay ? `REPLAY of ${spin.spinId} ${outcome}` : outcome} · ${data.spinsLeft} left · coins=${data.wallet.points}`;
  if (!result.replay && opts.failRate > 0 && Math.random() < opts.failRate) {
    return { drop: true, note: `${caller} ${outcome} committed, connection DROPPED (--fail-rate)` };
  }
  return { status: 200, body: ok(result.replay ? "Spin already processed" : "Spin complete", data), note };
}

function handleControl(req, path, params) {
  const known = ["/__mock/state", "/__mock/reset", "/__mock/advance", "/__mock/force"];
  if (!known.includes(path)) return { ...fail(404, "not_found", `Dev controls: ${known.join(", ")}`), note: "" };
  if (path === "/__mock/state") {
    if (req.method !== "GET") return { ...notAllowed("GET"), note: "" };
    return { status: 200, body: ok("Mock state", snapshot()), note: `${players.size} players` };
  }
  if (req.method !== "POST") return { ...notAllowed("POST"), note: "" };

  if (path === "/__mock/reset") {
    const user = params.get("user");
    if (user !== null) {
      if (!user.trim()) return { ...fail(400, "invalid_request", "user must not be empty"), note: "empty user" };
      players.delete(user);
      return { status: 200, body: ok(`Forgot ${user}`, snapshot()), note: `forgot ${user}` };
    }
    players.clear();
    jackpots.clear();
    forced.length = 0;
    clockOffsetMs = 0;
    return { status: 200, body: ok("Everything forgotten", snapshot()), note: "full reset" };
  }

  if (path === "/__mock/advance") {
    const raw = params.get("minutes");
    const minutes = raw === null ? null : Number(raw);
    if (minutes !== null && !(minutes > 0 && minutes <= 525_600)) {
      return { ...fail(400, "invalid_request", "minutes must be a number above 0 (at most a year)"), note: `minutes=${raw}` };
    }
    const target = minutes === null ? nextIstMidnight(now()) + 1000 : now() + minutes * 60_000;
    clockOffsetMs += target - now();
    return { status: 200, body: ok(`Clock is now ${new Date(now()).toISOString()}`, snapshot()), note: `clock → ${istDay(now())} IST` };
  }

  const segment = params.get("segment");
  const times = params.get("times") === null ? 1 : Number(params.get("times"));
  if (!WHEEL.some((s) => s.id === segment)) {
    return { ...fail(400, "invalid_request", `segment must be one of ${WHEEL.map((s) => s.id).join(", ")}`), note: `segment=${segment}` };
  }
  if (!Number.isInteger(times) || times < 1 || times > 100) {
    return { ...fail(400, "invalid_request", "times must be a whole number from 1 to 100"), note: `times=${params.get("times")}` };
  }
  for (let i = 0; i < times; i += 1) forced.push(segment);
  return { status: 200, body: ok(`Next ${times} draw(s) land on ${segment}`, snapshot()), note: `forced ${segment} ×${times}` };
}

function snapshot() {
  const ms = now();
  const today = istDay(ms);
  return {
    now: new Date(ms).toISOString(),
    today,
    clockOffsetMinutes: Math.round(clockOffsetMs / 60_000),
    options: opts,
    jackpotsToday: jackpots.get(today) ?? 0,
    forced: [...forced],
    players: Object.fromEntries(
      [...players].map(([userId, player]) => [
        userId,
        {
          wallet: player.wallet,
          today: { ...allowance(player, ms), draws: player.days.get(today)?.draws ?? 0 },
          lastSpin: player.days.get(today)?.lastSpin ?? null,
          requestIds: player.spins.size,
          ledger: player.ledger.slice(-20),
        },
      ]),
    ),
  };
}

async function route(req, path, params) {
  if (req.method === "OPTIONS") return { status: 204, note: "preflight", immediate: true };
  if (path.startsWith("/__mock")) return { ...handleControl(req, path, params), immediate: true };
  if (path === "/v1/spin/status") return req.method === "GET" ? handleStatus(req) : { ...notAllowed("GET"), note: "" };
  if (path === "/v1/spin") return req.method === "POST" ? handleSpin(req) : { ...notAllowed("POST"), note: "" };
  return { ...fail(404, "not_found", `Not found: ${path}. This mock serves GET /v1/spin/status and POST /v1/spin.`), note: "" };
}

function log(started, req, path, status, note) {
  const at = new Date();
  const time = `${at.toTimeString().slice(0, 8)}.${String(at.getMilliseconds()).padStart(3, "0")}`;
  console.log(`${time} ${req.method.padEnd(7)} ${path.padEnd(16)} ${String(status).padStart(3)} ${note} (${Date.now() - started}ms)`);
}

const server = createServer((req, res) => {
  const started = Date.now();
  const url = new URL(req.url ?? "/", "http://mock.local");
  const path = url.pathname.replace(/\/+$/, "") || "/";

  const respond = (outcome) => {
    if (res.destroyed || req.socket.destroyed) {
      log(started, req, path, "---", `${outcome.note} · client hung up before the response`);
      return;
    }
    if (outcome.drop) {
      req.socket.destroy();
      log(started, req, path, "---", outcome.note);
      return;
    }
    const json = outcome.body ? { "content-type": "application/json; charset=utf-8" } : {};
    res.writeHead(outcome.status, { ...CORS_HEADERS, "cache-control": "no-store", ...json, ...outcome.headers });
    res.end(outcome.body ? JSON.stringify(outcome.body) : undefined);
    log(started, req, path, outcome.status, outcome.note);
  };

  route(req, path, url.searchParams).then(
    (outcome) => {
      if (outcome.immediate || opts.latency === 0) respond(outcome);
      else setTimeout(() => respond(outcome), opts.latency);
    },
    (error) => {
      console.error(error);
      respond({ ...fail(500, "internal_error", "The mock crashed; see its console"), note: "crash" });
    },
  );
});

server.on("error", (error) => {
  const busy = "code" in error && error.code === "EADDRINUSE";
  console.error(busy ? `Port ${opts.port} is already in use. Pick another one: node scripts/mock-spin-api.mjs --port 4011` : error);
  process.exit(1);
});

server.listen(opts.port, opts.host, () => {
  const base = `http://${opts.host.includes(":") ? `[${opts.host}]` : opts.host}:${opts.port}`;
  console.log(`Spin & Win mock API on ${base} (dev only: tokens are not verified, state is in memory)`);
  console.log(`  GET ${base}/v1/spin/status · POST ${base}/v1/spin {"requestId":"…"} · dev controls under /__mock`);
  console.log(
    `  ${opts.spinsPerDay} free spin(s) per IST day · jackpot cap ${opts.jackpotCap}/day · latency ${opts.latency}ms · fail-rate ${opts.failRate}`,
  );
  console.log(`  App: put SPIN_API_BASE_URL=${base} in .env.local, then open /games/spin-win`);
  if (!["127.0.0.1", "localhost", "::1"].includes(opts.host)) {
    console.log("  Warning: reachable from other machines, and anyone can spin as anyone.");
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close();
    process.exit(0);
  });
}
