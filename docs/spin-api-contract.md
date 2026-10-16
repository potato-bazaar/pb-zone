# Spin & Win API: `/v1/spin` (v1 contract)

For the pbzone-api team. The PB Zone frontend is built against this contract and works today against the local mock (`scripts/mock-spin-api.mjs`). Please build these two routes on pbzone-api. As of 2026-10-15, `GET https://pbzone-api.potatobazaar.com/v1/spin/status` returns 404.

**In one paragraph:** each player gets one free spin per IST day (resetting at 00:00 Asia/Kolkata, the same boundary as `/v1/daily-bonus`). The server picks the prize by weight with a secure RNG, pays it, and returns it. The app only animates the wheel to the segment the server names, and never sends a prize. Prizes are **PB Coins only**: they go to `wallet.points` and `wallet.earnedPoints`, never to `leaderboardPoints` (PB Points reward skill, and a spin is luck). Every POST carries a `requestId`, and replaying it returns the original spin and never pays twice. Spin & Win replaces the Daily Bonus strip in the app, so after this release no screen calls `/v1/daily-bonus`.

Frontend references: client `src/lib/spinApi.ts`, same-origin proxy `src/app/api/spin/[[...path]]/route.ts`, screen `src/components/spin/SpinWinApp.tsx`.

## 1. Conventions

| Topic | Rule |
|---|---|
| Routes | `GET /v1/spin/status`, `POST /v1/spin`. The app calls `/api/spin/status` and `/api/spin` on its own origin. The Next proxy forwards these to `${SPIN_API_BASE_URL \|\| QUIZ_API_BASE_URL}/v1/spin…` (query string copied), along with `Authorization`, `x-user-id` and `x-user-name`. |
| Auth | `Authorization: Bearer <JWT>`. The player is the **verified** token's subject. `x-user-id` / `x-user-name` are hints only (see §7). |
| Success body | The usual pbzone-api envelope, `{ "success": true, "message": "…", "data": { … } }`. The app reads only `data`. |
| Error body | `{ "success": false, "error": "<code>", "message": "<text>" }`. The app branches on the **HTTP status only**; `message` (then `error`) becomes the text of its client-side error. |
| Times | ISO 8601 UTC, e.g. `"2026-10-15T18:30:00.000Z"`. The app uses `Date.parse`, so any ISO 8601 string with an explicit offset also works. |
| Caching | `Cache-Control: no-store` on both routes. |
| Compatibility | The app ignores fields it doesn't know, so adding fields is safe. Names are case-sensitive; note the British `colour`. |

## 2. `GET /v1/spin/status`

```json
{
  "success": true,
  "message": "Spin status retrieved",
  "data": {
    "canSpin": false,
    "spinsLeft": 0,
    "nextSpinAt": "2026-10-15T18:30:00.000Z",
    "segments": [
      { "id": "leaf",   "label": "15",      "icon": "leaf",   "colour": "#F6C744" },
      { "id": "book",   "label": "25",      "icon": "book",   "colour": "#23843F" },
      { "id": "bulb",   "label": "40",      "icon": "bulb",   "colour": "#F2862E" },
      { "id": "star",   "label": "60",      "icon": "star",   "colour": "#1E7A3E" },
      { "id": "potato", "label": "+1 Spin", "icon": "potato", "colour": "#FBE08A" },
      { "id": "gift",   "label": "150",     "icon": "gift",   "colour": "#F39A12" }
    ],
    "lastSpin": {
      "spinId": "spin_6f1c2a0e-…",
      "segmentId": "bulb",
      "reward": { "type": "coins", "amount": 40 },
      "at": "2026-10-15T09:12:44.120Z"
    },
    "wallet": { "points": 1040, "earnedPoints": 40, "bonusPoints": 1000, "leaderboardPoints": 0 },
    "today": "2026-10-15",
    "timezone": "Asia/Kolkata"
  }
}
```

| Field | Type | Rule |
|---|---|---|
| `canSpin` | boolean | `spinsLeft > 0`. |
| `spinsLeft` | integer ≥ 0 | 1 free spin + "+1 Spin" wins today − spins drawn today (§4.2). |
| `nextSpinAt` | ISO string \| null | `null` while `canSpin` is true. Otherwise it is the next 00:00 IST. The app shows "Next spin in 6h 20m" and asks for status again about 1 s after this time (every 30 s if the time has already passed), so it must be exact. This differs from daily-bonus `nextClaimAt`, which is "now" while claimable. |
| `segments` | array (≥ 2) | Wheel order, clockwise from 12 o'clock. Each segment has exactly `id`, `label`, `icon` and `colour`. **Never send weights or odds.** |
| `lastSpin` | object \| null | The player's most recent spin **of the current IST day**, otherwise `null` (so `null` again after midnight). The used-up screen says "Today you won 40 PB Coins" and rests the wheel on this segment. |
| `wallet` | object | The same numbers `GET /v1/quiz/me/points` returns for this player (create the wallet the same way that route does if it's missing). `points` is the PB Coins balance. `earnedPoints` is earned coins. `bonusPoints = points − earnedPoints`. `leaderboardPoints` is PB Points. |
| `today`, `timezone` | optional | The IST date and `"Asia/Kolkata"`, as `/v1/daily-bonus` returns them. The app ignores both; they help when debugging the day boundary. |

Segment fields:
- **`id`** is stable and unique within the list. The POST names the winning `id`, and the app finds the wedge by it. Never reuse an id for a different prize. If the app gets an id it doesn't have, it stops the wheel between wedges and still shows the prize.
- **`label`** is drawn on the wedge. For a coin segment it **must be the bare amount in digits** (`"40"`), because the app reads it as the coin value: "Win up to 150 PB Coins" uses the largest numeric label, and a win equal to it is celebrated as the jackpot. Non-coin labels must not be all digits (`"+1 Spin"`).
- **`icon`** is one of `leaf | book | bulb | star | potato | gift`. For an unknown value the app falls back to its default icon for that position.
- **`colour`** is `"#RRGGBB"`. The app also accepts `color`. It draws the label in white or dark green (`#0B3B22`), whichever contrasts more with the colour, so avoid mid-tones where neither reaches 3:1.

Before status arrives, or when it fails, the app draws a copy of the v1 table built into the app (`DEFAULT_SPIN_SEGMENTS`). Keep the server table identical to it, or tell the frontend team when the table changes.

## 3. `POST /v1/spin`

Request body: `{ "requestId": "9d595f8a-5c1e-4c47-9b7e-2f0c1d7e3a10" }`

- **`requestId`** is required: a string of 8–128 characters from `[A-Za-z0-9._:-]`. The app sends a UUID v4, or `spin-<base36 time>-<base36 random>` on old webviews without `crypto.randomUUID`. It is unique per (player, request). The app stores it in `localStorage` until it gets a definite answer, and sends the **same** id when it retries, including after the app is reopened. It also drops a stored id whenever status shows no spin left (`canSpin: false`) or nothing spun today (`lastSpin: null`), so reopening the app on a later day doesn't replay yesterday's spin as a fresh win. The replay rule in §4.5 still has to hold: a retry from a screen left open across midnight can still send an older id.
- Ignore every other field. Never read a segment, amount, prize or "jackpot" flag from the client.

`200` response:

```json
{
  "success": true,
  "message": "Spin complete",
  "data": {
    "spinId": "spin_6f1c2a0e-…",
    "segmentId": "bulb",
    "reward": { "type": "coins", "amount": 40 },
    "canSpin": false,
    "spinsLeft": 0,
    "nextSpinAt": "2026-10-15T18:30:00.000Z",
    "wallet": { "points": 1040, "earnedPoints": 40, "bonusPoints": 1000, "leaderboardPoints": 0 }
  }
}
```

| Field | Rule |
|---|---|
| `spinId` | Unique, and also the coin-ledger `event_id`. |
| `segmentId` | One of the ids in `status.segments`: the segment actually paid, after any jackpot re-draw (§4.3). |
| `reward` | Either `{ "type": "coins", "amount": <coins credited> }` or `{ "type": "extra_spin", "amount": 1 }` (no coins). |
| `canSpin`, `spinsLeft`, `nextSpinAt` | The allowance **after** this spin, with the same rules as status. After `extra_spin` they are `true`, `1` and `null`. |
| `wallet` | The wallet after the payout. The app shows these numbers directly. |

Status codes, and what the app does with each:

| HTTP | `error` | When | App behaviour |
|---|---|---|---|
| 200 | | A new spin, or a replay of a committed `requestId` | Animates to `segmentId`, shows the prize, applies `wallet`. |
| 400 | `invalid_request` | Body isn't JSON, or `requestId` is missing or malformed | Definite: drops its stored id, shows "Couldn't spin right now", reloads status. |
| 401 | `unauthorized` | Token missing, invalid or expired | Definite: drops its stored id and shows "Please reopen PB Zone from the Potato Bazaar app" in place of the Spin button. Status is not reloaded (retrying can't help until the app hands over a fresh session). 403 is treated the same. |
| 404 | | Route not deployed | Shows "Spin & Win opens soon" under a disabled "Opening soon" button (nothing to retry). **Never return 404 from these routes for anything else** (e.g. an unknown player: create the player's rows lazily). |
| 409 | `no_spin_left` | No spin left today, and the `requestId` was not seen before | Shows the toast "Today's spin is done — come back tomorrow", reloads status, shows `lastSpin`. |
| 429 | `rate_limited` | Rate limit hit | Definite: drops the id, shows the toast, reloads status. |
| 5xx | | Anything transient | **Not** definite: keeps the `requestId` and shows "Connection lost — tap to try again". The retry sends the same id. |

The rule that matters: **return a 4xx only when nothing was committed for this request.** Whatever happens after the commit (a timeout, a crash, a dropped connection), a retry with the same `requestId` must return the original spin. The app gives up waiting after about 15 s and offers that retry.

## 4. Rules

### 4.1 Day boundary (IST)
- `day = calendar date of (now + 5:30)`. Asia/Kolkata has no DST, so 00:00 IST is always 18:30 UTC of the previous date.
- `nextSpinAt = Date.UTC(y, m, d + 1) − 5h30m`, where `y-m-d` is today's IST date.
- Example: a spin at 14:45 IST on 15 Oct (`2026-10-15T09:15Z`) gets `nextSpinAt = "2026-10-15T18:30:00.000Z"`, which is 00:00 IST on 16 Oct.
- Use the same helper `/v1/daily-bonus` uses, so both reset at the same moment.

### 4.2 Allowance and "+1 Spin"
- `spinsLeft = 1 + (extra_spin wins today) − (spins drawn today)`. Keep `1` as a config value (e.g. `SPIN_FREE_SPINS_PER_DAY`).
- The "+1 Spin" segment (`potato`) pays no coins and grants one more spin for the **same** IST day. Unused extra spins expire at midnight.
- Chains of "+1 Spin" are possible but rare: 1% of player-days get two or more extra spins, 0.1% get three or more.

### 4.3 The draw
- Server-side and weighted, using a cryptographically secure RNG (Node: `crypto.randomInt(totalWeight)`; never `Math.random`).
- v1 table (fixed on the server; weights total 100):

| Order | `id` / `icon` | `label` | Prize | Weight | Chance per draw | `colour` |
|---|---|---|---|---|---|---|
| 1 | leaf | 15 | 15 coins | 30 | 30% | `#F6C744` |
| 2 | book | 25 | 25 coins | 25 | 25% | `#23843F` |
| 3 | bulb | 40 | 40 coins | 20 | 20% | `#F2862E` |
| 4 | star | 60 | 60 coins | 13 | 13% | `#1E7A3E` |
| 5 | potato | +1 Spin | one more spin today | 10 | 10% | `#FBE08A` |
| 6 | gift | 150 | 150 coins (jackpot) | 2 | 2% | `#F39A12` |

- **Jackpot cap.** This is a global count per IST day, configurable (e.g. `SPIN_JACKPOT_CAP_PER_DAY`; 50 suggested; the admin panel's default is 3). If the draw lands on `gift` and today's jackpot count has reached the cap, re-draw among the non-jackpot segments. This is the same as drawing from the table without `gift` (weights renormalised to 98). The re-draw is internal: the response names the segment actually paid. Count jackpots atomically (see §6). Once the cap is hit, the expected value drops a little (§5).

### 4.4 Payout and ledger
- **Coins:** `wallet.points += amount` **and** `wallet.earnedPoints += amount`, so the spin shows up as "Earned Coins" on My Rewards. `bonusPoints` (the remaining welcome bonus) doesn't change.
- **Never** touch `leaderboardPoints`, season or leaderboard scores, game scores or daily Point caps. Don't create a `spin-win` key in any leaderboard store either: the season total sums every stored game key. (FRD §1/§2/§20: Coins never become Points; Points reward skill.)
- **Coin ledger:** write one row per coin payout: `player_id`, `event_id = spinId`, `game_id = "spin-win"`, `delta = amount`, `reason = "spin_win"`, `timestamp` (FRD §22). `extra_spin` moves no coins and writes no coin-ledger row; the spin itself is still recorded (§6).
- **Product decision to confirm:** crediting `earnedPoints` makes spin coins spendable on reward claims (`POST /v1/quiz/rewards/claim` spends earned coins on physical gifts), like any other earned coins. The alternative is `bonusPoints`, but then the coins are invisible on My Rewards and Profile labels them "welcome bonus". The frontend assumes `earnedPoints`.

### 4.5 Idempotency (`requestId`)
- The key is **(player_id, requestId)**: unique, and kept permanently (store it on the spin row). The same id from a different player is a different request. Only committed spins are remembered, so an id that got a 4xx reserves nothing.
- Order of checks: **auth → body → replay lookup → allowance → draw and pay.**
- **Replay:** return `200` with the original `spinId`, `segmentId` and `reward`. This holds after the day's allowance is used (never `409` for a known id) and on a later day (never a new draw). Read `canSpin`, `spinsLeft`, `nextSpinAt` and `wallet` fresh at replay time, so the app never rolls its balance back. Nothing is paid or granted again.
- **Same key twice at once:** exactly one spin. Rely on the unique index: the request that loses the insert catches the duplicate-key error, reads the winner's row and answers with it as a replay.
- **Different keys at once** (double tap, two devices): at most `spinsLeft` of them succeed and the rest get `409`. Serialise per player (§6).

## 5. Economy check (re-computed)

- **Per draw:** (15·30 + 25·25 + 40·20 + 60·13 + 0·10 + 150·2) / 100 = 2955 / 100 = **29.55 coins**.
- **Draws per player per day:** every draw has a 10% chance of "+1 Spin", so the expected count is 1 / (1 − 0.1) = 10/9 ≈ **1.11**.
- **Coins per player per day:** 29.55 × 10/9 = 197/6 ≈ **32.8**. Seen another way, the day ends on a coin segment (weights 30/25/20/13/2 out of 90), giving 2955 / 90 = 32.83. Every day pays at least 15 coins; the standard deviation is about 23.
- **Daily Bonus today:** 10 + 15 + 20 + 25 + 30 + 40 + 100 = 240 coins per 7-day cycle, or 240 / 7 ≈ **34.3 per day** (with an unbroken streak). Spin & Win pays about 4% less on average, with no streak needed. These numbers assume Spin & Win *replaces* the bonus. No screen claims the bonus after this release, but `/v1/daily-bonus/claim` still pays anyone who calls it directly, so decide when to switch those claims off.
- **After the jackpot cap is hit** (table without `gift`, weights 98): 2655 / 98 = 27.09 coins per draw × 98/88 ≈ 1.114 draws per day = 2655 / 88 ≈ **30.2 coins per player per day**, about 2.7 less. The jackpot is 300 / 90 ≈ 3.3 coins of the daily 32.8 (10%).
- **Sizing the cap:** each spinning player produces 0.02 × 10/9 = 1/45 ≈ 0.022 jackpots per day. A cap of 50 per day therefore starts to bind on a typical day once about 50 × 45 = **2,250 players spin daily**; below that it rarely triggers. On a capped day, late spinners can't win the jackpot.
- **Budget:** about 33 coins per spinning player per day; 10,000 daily spinners ≈ 330,000 coins/day.

## 6. Suggested implementation

Storage (names are illustrative; use pbzone-api's own conventions):
- **Spins:** one row per draw: `spin_id` (PK), `player_id`, `request_id`, `ist_day` (`YYYY-MM-DD`), `segment_id`, `reward_type`, `reward_amount`, `table_version`, `jackpot_redrawn` (bool), `created_at`. Unique index on `(player_id, request_id)`; index on `(player_id, ist_day)`.
- **Jackpot counter:** `ist_day` (PK) → `count`, incremented only while `count < cap` with an atomic conditional update.
- **Coin ledger:** the existing coin-transaction store.

`POST /v1/spin`, all in one transaction (SQL) or session transaction (MongoDB):
1. Verify the token → `player_id`. Validate `requestId`.
2. Lock the player's wallet row (`SELECT … FOR UPDATE`, or a per-player lock) so this player's spins run one at a time.
3. If a spin row exists for `(player_id, request_id)`, answer `200` as a replay (§4.5).
4. Count today's draws and today's `extra_spin` wins → `spinsLeft`. If it is 0, answer `409`.
5. Draw. If it's the jackpot, try `UPDATE jackpot_days SET count = count + 1 WHERE ist_day = ? AND count < cap`. If no row changed, re-draw without the jackpot.
6. Insert the spin row. For coins, add to `points` and `earnedPoints` and insert the ledger row.
7. Commit, then answer with the allowance after the spin and the wallet.

If the commit fails on the unique `(player_id, request_id)` index, read the existing row and answer as a replay. `GET /v1/spin/status` uses the same reads and takes no locks.

## 7. Security

- **Identity comes from the verified token.** When a token is present, ignore `x-user-id`: the Next proxies copy it from the caller's own request header. With no valid token, answer `401` (no anonymous or header-only spins). The app also blocks guest sessions from spinning in production builds, but don't rely on that.
- **Trust nothing else from the client.** No amounts, segment ids or prize flags. `requestId` is only an idempotency key.
- **Rate-limit per player**, e.g. `POST /v1/spin` 10/min and `GET /v1/spin/status` 60/min. Answer `429` before anything is committed.
- **The Next proxies can mint tokens.** The daily-bonus, crush, leaderboard, quiz and spin proxies (`src/app/api/*/[[...path]]/route.ts`, `src/app/api/quiz/[...path]/route.ts`) sign an HS256 token for **whatever `x-user-id` the caller sends**. They do this when the request has no `Authorization` header, `QUIZ_JWT_SECRET` (or `JWT_SECRET`) is set, and `QUIZ_DEV_AUTO_TOKEN` isn't `"false"`. The quiz proxy goes further: whenever it can sign and has a non-placeholder display name (from the token or `x-user-name`), it **replaces** the caller's token with one it minted for `x-user-id`, whatever `QUIZ_DEV_AUTO_TOKEN` says. Any deployment holding that secret therefore lets anyone act as any player: spin, claim the daily bonus, read wallets, spend earned coins through `/v1/quiz/rewards/claim`. The quiz proxy's own log message asks for `QUIZ_JWT_SECRET` to be set on Vercel, so **check production now**. Production must not combine that secret with these proxies. Run with `QUIZ_DEV_AUTO_TOKEN=false`, and stop the quiz proxy re-signing, or remove the secret from the frontend entirely. Before switching the minting off, make sure every Potato Bazaar app session carries a real token (the webview hands PB Zone `token`, `userId` and `userName`): a session without a token currently gets its identity only from a proxy-minted token. This release changes no proxy; this is a heads-up.
- **Observed on 2026-10-15:** through the local dev proxy, with no `Authorization` header from the app (so the proxy minted a token with the local `.env` secret), the live `GET /v1/daily-bonus` returned `200` for `dev-user-1`. So either the live API verifies tokens with the same secret developers have locally, or it doesn't rely on the token for identity. Please confirm which. Use a different secret per environment, rotate the live one, and longer term verify tokens issued by the Potato Bazaar auth service (asymmetric keys / JWKS) rather than a shared HS256 secret.
- **Errors leak stack traces.** The current 404 body includes `stack` with server file paths (`src/middlewares/error.ts`, `node_modules/router/…`). Drop `stack` outside development.
- **CORS.** The app normally calls the API through its own `/api/spin` proxy. If it is ever built with `NEXT_PUBLIC_QUIZ_USE_PROXY=false`, browsers call `/v1/spin` directly, so give it the same CORS policy as `/v1/quiz` (allow `Authorization`, `Content-Type`, `x-user-id`, `x-user-name`).

## 8. Admin wheel editor (v2)

The admin panel has a wheel editor ("Spin the Potato": `admin/src/components/gameconfig/SpinEditors.tsx`, types in `admin/src/types/gameConfig.ts`). It only saves to the admin's own browser storage: `localStorage` keys `pb_zone_game_configs_v1` and `pb_zone_active_config_ids_v1`, where "Publish" rewrites localStorage. Nothing reaches pbzone-api. **v1 therefore uses the fixed server table above.** Moving the editor to the server is v2, and would mean:
- `GET`/`PUT /v1/admin/spin/config` behind `x-admin-key`, with a versioned table and `table_version` recorded on each spin row;
- prize types limited to coins and `extra_spin` (the editor's `multiplier` grants PB Points, and `voucher` and `discount` aren't coin prizes);
- validation: weights > 0, unique stable ids, numeric labels on coin segments, at most one jackpot;
- the per-day cap and the free spins per day as settings.

## 9. Acceptance checklist

```bash
API=https://pbzone-api.potatobazaar.com   # or http://127.0.0.1:4010 for the mock
AUTH="Authorization: Bearer $TOKEN"
curl -s -H "$AUTH" $API/v1/spin/status
curl -s -H "$AUTH" -H 'Content-Type: application/json' -d '{"requestId":"0b6f8a52-4c1e-4f0a-9d3b-5a1e2c7d9f10"}' $API/v1/spin
```

- [ ] A new player's status: `canSpin` true, `spinsLeft` 1, `nextSpinAt` null, `lastSpin` null, six segments with no weights.
- [ ] POST returns 200. `points` and `earnedPoints` grow by `reward.amount`; `bonusPoints` and `leaderboardPoints` don't move. One ledger row with `event_id = spinId`.
- [ ] The same `requestId` again returns 200 with the same `spinId`, and the wallet doesn't change.
- [ ] A new `requestId` returns 409 `no_spin_left`, and replaying the first id still returns 200.
- [ ] Status afterwards: `canSpin` false, `nextSpinAt` = the next 00:00 IST (`…T18:30:00.000Z`), `lastSpin` = that spin.
- [ ] After 00:00 IST: the spin is back and `lastSpin` is null. Yesterday's `requestId` replays its original spin and doesn't spend today's.
- [ ] `extra_spin`: no coins, `spinsLeft` stays 1, and the next POST spins again.
- [ ] 10 concurrent POSTs with different ids give exactly one 200. Concurrent POSTs with one id give one spin and identical answers.
- [ ] The draw matches 30/25/20/13/10/2 over 10k+ draws (chi-square). With the cap set to 1, the second jackpot of the day is re-drawn.
- [ ] No token returns 401; `x-user-id` alone returns 401; a token for A plus `x-user-id: B` acts as A.
- [ ] These routes never return 404 once deployed; no response includes `stack`.

## 10. Local mock

`scripts/mock-spin-api.mjs` implements this contract in memory: the IST day, the allowance, "+1 Spin", the weighted draw with `crypto.randomInt`, the jackpot cap, idempotent replay, the coin ledger, and the 409/400/401 answers. It doesn't verify tokens, and it accepts a bare `x-user-id` when no token is sent, where the real API must answer 401. It is a small reference for the semantics above. To run the app against it, see "Spin & Win locally" in the README. `node scripts/mock-spin-api.mjs --help` lists the flags; `--fail-rate 1` drops every new spin's connection after committing it, so the replay path can be tested.
