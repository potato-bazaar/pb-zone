/* ------------------------------------------------------------------ */
/*  Potato Ninja – slicing game simulation (pure TS, no DOM)          */
/* ------------------------------------------------------------------ */

export type NinjaMode = "classic" | "time" | "arcade";

export type ItemKind =
  | "potato"
  | "golden"
  | "ice"
  | "bomb"
  | "life"
  | "freeze"
  | "multi"
  | "shield";

export interface Item {
  id: number;
  kind: ItemKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  rot: number;
  vrot: number;
  /** Visual variation index for plain potatoes. */
  variant: number;
  sliced: boolean;
  missed: boolean;
}

export interface Half {
  id: number;
  kind: ItemKind;
  variant: number;
  side: -1 | 1;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  /** Cut angle in radians (direction of the swipe). */
  angle: number;
  born: number;
}

export interface Boosts {
  freeze?: boolean;
  life?: boolean;
  multi?: boolean;
  shield?: boolean;
}

export type NinjaEvent =
  | { type: "slice"; item: Item; x: number; y: number; angle: number; points: number }
  | { type: "combo"; count: number; bonus: number; x: number; y: number }
  | { type: "bomb"; x: number; y: number; deflected: boolean }
  | { type: "miss"; item: Item }
  | { type: "powerup"; kind: ItemKind; x: number; y: number }
  | { type: "life"; lives: number }
  | { type: "end"; reason: "lives" | "time" };

export interface RunStats {
  score: number;
  sliced: number;
  golden: number;
  bombsHit: number;
  maxCombo: number;
  timePlayed: number;
  lives: number;
  timeLeft: number;
}

const POINTS: Partial<Record<ItemKind, number>> = {
  potato: 1,
  golden: 5,
  ice: 2,
};

export class NinjaGame {
  readonly mode: NinjaMode;
  width = 400;
  height = 800;

  items: Item[] = [];
  halves: Half[] = [];
  events: NinjaEvent[] = [];

  score = 0;
  lives: number;
  timeLeft: number;
  elapsed = 0;
  sliced = 0;
  golden = 0;
  bombsHit = 0;
  maxCombo = 0;
  over = false;
  paused = false;

  /** Active effects (seconds remaining). */
  freezeLeft = 0;
  multiLeft = 0;
  shieldLeft = 0;

  private nextId = 1;
  private spawnTimer = 1;
  private strokeSlices = 0;
  private strokeLast = { x: 0, y: 0 };
  private rngState: number;

  constructor(mode: NinjaMode, boosts: Boosts = {}, seed = Date.now() >>> 0) {
    this.mode = mode;
    this.rngState = seed || 1;
    this.lives = mode === "classic" ? 3 : 0;
    this.timeLeft = mode === "classic" ? Infinity : 60;
    if (boosts.life && mode === "classic") this.lives += 1;
    if (boosts.freeze) this.freezeLeft = 8;
    if (boosts.multi) this.multiLeft = 20;
    if (boosts.shield) this.shieldLeft = 30;
  }

  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
  }

  private rnd() {
    this.rngState = (this.rngState + 0x6d2b79f5) >>> 0;
    let t = this.rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  get gravity() {
    return this.height * 1.15;
  }

  get stats(): RunStats {
    return {
      score: this.score,
      sliced: this.sliced,
      golden: this.golden,
      bombsHit: this.bombsHit,
      maxCombo: this.maxCombo,
      timePlayed: this.elapsed,
      lives: this.lives,
      timeLeft: this.timeLeft,
    };
  }

  /** Difficulty 0..1 rising with time and score. */
  get difficulty() {
    const t = Math.min(1, this.elapsed / 90);
    const s = Math.min(1, this.score / 250);
    return Math.max(t, s);
  }

  /* ------------------------------ spawning ----------------------------- */

  private launch(kind: ItemKind, xFrac: number) {
    const w = this.width;
    const h = this.height;
    const g = this.gravity;
    const peak = h * (0.5 + this.rnd() * 0.42); // height reached above the floor
    const vy = -Math.sqrt(2 * g * peak);
    const x = w * xFrac;
    const towardCenter = (w * 0.5 - x) / w; // -0.5..0.5
    const vx = (towardCenter * 0.6 + (this.rnd() - 0.5) * 0.25) * w * 0.9;
    const r = kind === "bomb" ? Math.min(w, h) * 0.075 : Math.min(w, h) * (0.085 + this.rnd() * 0.02);
    this.items.push({
      id: this.nextId++,
      kind,
      x,
      y: h + r,
      vx,
      vy,
      r,
      rot: this.rnd() * Math.PI * 2,
      vrot: (this.rnd() - 0.5) * 6,
      variant: Math.floor(this.rnd() * 3),
      sliced: false,
      missed: false,
    });
  }

  private pickKind(): ItemKind {
    const d = this.difficulty;
    const roll = this.rnd();
    const bombChance = this.mode === "time" ? 0.08 + d * 0.1 : 0.1 + d * 0.15;
    if (roll < bombChance) return "bomb";
    if (this.mode === "arcade") {
      const p = this.rnd();
      if (p < 0.05) return "freeze";
      if (p < 0.09) return "multi";
      if (p < 0.12) return "shield";
      if (p < 0.14) return "life";
      if (p < 0.24) return "golden";
      if (p < 0.34) return "ice";
      return "potato";
    }
    const p = this.rnd();
    if (p < 0.06 + d * 0.04) return "golden";
    if (this.mode !== "classic" && p < 0.12) return "ice";
    return "potato";
  }

  private spawnWave() {
    const d = this.difficulty;
    const count = 1 + Math.floor(this.rnd() * (1.6 + d * 2.2));
    for (let i = 0; i < count; i++) {
      const kind = this.pickKind();
      const xFrac = 0.12 + this.rnd() * 0.76;
      this.launch(kind, xFrac);
    }
    // occasionally a bomb rides with a big wave
    this.spawnTimer = Math.max(0.55, 1.5 - d * 0.85) + this.rnd() * 0.5;
  }

  /* ------------------------------- update ------------------------------ */

  step(dtRaw: number) {
    if (this.over || this.paused) return;
    const dt = Math.min(dtRaw, 0.05);
    this.elapsed += dt;

    // Timers
    if (this.freezeLeft > 0) this.freezeLeft = Math.max(0, this.freezeLeft - dt);
    if (this.multiLeft > 0) this.multiLeft = Math.max(0, this.multiLeft - dt);
    if (this.shieldLeft > 0) this.shieldLeft = Math.max(0, this.shieldLeft - dt);
    if (this.timeLeft !== Infinity) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      if (this.timeLeft <= 0) {
        this.finish("time");
        return;
      }
    }

    const scale = this.freezeLeft > 0 ? 0.45 : 1;
    const sdt = dt * scale;
    const g = this.gravity;
    const h = this.height;

    this.spawnTimer -= sdt;
    if (this.spawnTimer <= 0) this.spawnWave();

    for (const it of this.items) {
      it.vy += g * sdt;
      it.x += it.vx * sdt;
      it.y += it.vy * sdt;
      it.rot += it.vrot * sdt;
      if (!it.sliced && !it.missed && it.vy > 0 && it.y > h + it.r * 2) {
        it.missed = true;
        if (it.kind === "potato" || it.kind === "golden" || it.kind === "ice") {
          this.events.push({ type: "miss", item: it });
          if (this.mode === "classic") this.loseLife();
        }
      }
    }
    this.items = this.items.filter((it) => !it.sliced && it.y < h + it.r * 3 + 200);

    for (const hf of this.halves) {
      hf.vy += g * sdt;
      hf.x += hf.vx * sdt;
      hf.y += hf.vy * sdt;
      hf.rot += hf.vrot * sdt;
    }
    this.halves = this.halves.filter((hf) => hf.y < h + 200);
  }

  private loseLife() {
    if (this.mode !== "classic" || this.over) return;
    this.lives = Math.max(0, this.lives - 1);
    this.events.push({ type: "life", lives: this.lives });
    if (this.lives <= 0) this.finish("lives");
  }

  private finish(reason: "lives" | "time") {
    if (this.over) return;
    this.over = true;
    this.events.push({ type: "end", reason });
  }

  /* ------------------------------- slicing ----------------------------- */

  /** Applies a blade segment; returns the number of items cut. */
  slice(x1: number, y1: number, x2: number, y2: number): number {
    if (this.over || this.paused) return 0;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    if (len2 < 4) return 0;
    const angle = Math.atan2(dy, dx);
    let cut = 0;
    for (const it of this.items) {
      if (it.sliced) continue;
      // closest point on the segment to the item centre
      const t = Math.max(0, Math.min(1, ((it.x - x1) * dx + (it.y - y1) * dy) / len2));
      const px = x1 + dx * t;
      const py = y1 + dy * t;
      const d2 = (it.x - px) ** 2 + (it.y - py) ** 2;
      if (d2 > it.r * it.r) continue;
      this.cutItem(it, angle, px, py);
      cut++;
    }
    return cut;
  }

  private cutItem(it: Item, angle: number, px: number, py: number) {
    it.sliced = true;
    if (it.kind === "bomb") {
      this.bombsHit++;
      if (this.shieldLeft > 0) {
        this.events.push({ type: "bomb", x: it.x, y: it.y, deflected: true });
        return;
      }
      this.events.push({ type: "bomb", x: it.x, y: it.y, deflected: false });
      if (this.mode === "classic") this.loseLife();
      else if (this.mode === "time") this.timeLeft = Math.max(0, this.timeLeft - 5);
      else this.score = Math.max(0, this.score - 10);
      return;
    }
    if (it.kind === "life" || it.kind === "freeze" || it.kind === "multi" || it.kind === "shield") {
      if (it.kind === "life") {
        if (this.mode === "classic") this.lives = Math.min(5, this.lives + 1);
        else this.score += 10;
      }
      if (it.kind === "freeze") this.freezeLeft = 5;
      if (it.kind === "multi") this.multiLeft = 10;
      if (it.kind === "shield") this.shieldLeft = 15;
      this.events.push({ type: "powerup", kind: it.kind, x: it.x, y: it.y });
      this.spawnHalves(it, angle);
      return;
    }
    const base = POINTS[it.kind] ?? 1;
    const points = base * (this.multiLeft > 0 ? 2 : 1);
    this.score += points;
    this.sliced++;
    if (it.kind === "golden") this.golden++;
    if (it.kind === "ice") this.freezeLeft = Math.max(this.freezeLeft, 3);
    this.strokeSlices++;
    this.strokeLast = { x: px, y: py };
    this.events.push({ type: "slice", item: it, x: px, y: py, angle, points });
    this.spawnHalves(it, angle);
  }

  private spawnHalves(it: Item, angle: number) {
    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);
    const sep = this.height * 0.28;
    for (const side of [-1, 1] as const) {
      this.halves.push({
        id: this.nextId++,
        kind: it.kind,
        variant: it.variant,
        side,
        x: it.x + nx * side * it.r * 0.15,
        y: it.y + ny * side * it.r * 0.15,
        vx: it.vx * 0.7 + nx * side * sep,
        vy: it.vy * 0.7 + ny * side * sep - this.height * 0.1,
        rot: 0,
        vrot: it.vrot + side * 3,
        angle,
        born: this.elapsed,
      });
    }
  }

  /** Call when the finger lifts: awards combo bonuses for multi-slices. */
  endStroke() {
    const n = this.strokeSlices;
    this.strokeSlices = 0;
    if (n >= 3 && !this.over) {
      const bonus = n * 2;
      this.score += bonus;
      this.maxCombo = Math.max(this.maxCombo, n);
      this.events.push({ type: "combo", count: n, bonus, x: this.strokeLast.x, y: this.strokeLast.y });
    } else if (n > 0) {
      this.maxCombo = Math.max(this.maxCombo, n);
    }
  }

  drain(): NinjaEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}

/* ------------------------------------------------------------------ */
/*  Modes, skins, shop, challenges                                     */
/* ------------------------------------------------------------------ */

export const MODES: { id: NinjaMode; name: string; blurb: string; emoji: string }[] = [
  { id: "classic", name: "Classic Mode", blurb: "Endless fun. Slice as many potatoes as you can!", emoji: "🥔" },
  { id: "time", name: "Time Attack", blurb: "Score as high as you can in 60 seconds!", emoji: "⏱️" },
  { id: "arcade", name: "Arcade Mode", blurb: "Special potatoes, power-ups and bigger challenges!", emoji: "💣" },
];

export interface Skin {
  id: string;
  name: string;
  price: number;
  /** Cell in the 3×3 sheet, row-major. */
  cell: number;
  trail: string;
}

export const SKINS: Skin[] = [
  { id: "default", name: "Default", price: 0, cell: 0, trail: "#FFF5C2" },
  { id: "ninja", name: "Ninja", price: 300, cell: 1, trail: "#FF6B6B" },
  { id: "samurai", name: "Samurai", price: 500, cell: 2, trail: "#FFD54F" },
  { id: "cowboy", name: "Cowboy", price: 400, cell: 3, trail: "#FFB74D" },
  { id: "chef", name: "Chef", price: 400, cell: 4, trail: "#FFFFFF" },
  { id: "super", name: "Super Potato", price: 700, cell: 5, trail: "#4FC3F7" },
  { id: "alien", name: "Alien", price: 600, cell: 6, trail: "#9BE86B" },
  { id: "royal", name: "Royal", price: 900, cell: 7, trail: "#FFE066" },
  { id: "space", name: "Space", price: 900, cell: 8, trail: "#B39DFF" },
];

export type PowerKind = "freeze" | "life" | "multi" | "shield";

export const POWERUPS: { id: PowerKind; name: string; blurb: string; price: number; emoji: string; color: string }[] = [
  { id: "freeze", name: "Freeze Time", blurb: "Start with 8s of slow motion", price: 200, emoji: "❄️", color: "#4FC3F7" },
  { id: "life", name: "Extra Life", blurb: "One more heart in Classic", price: 300, emoji: "❤️", color: "#FF5A8A" },
  { id: "multi", name: "Score Multiplier", blurb: "Double points for 20s", price: 300, emoji: "✖️", color: "#7CE05A" },
  { id: "shield", name: "Bomb Deflect", blurb: "Bombs can't hurt you for 30s", price: 400, emoji: "🛡️", color: "#5B9DFF" },
];

export interface Challenge {
  id: string;
  title: string;
  body: string;
  mode: NinjaMode;
  reward: number;
  check: (s: RunStats) => boolean;
}

export const CHALLENGES: Challenge[] = [
  { id: "slice25", title: "Warm-up Slicer", body: "Slice 25 potatoes in one Classic run", mode: "classic", reward: 50, check: (s) => s.sliced >= 25 },
  { id: "combo4", title: "Combo Cutter", body: "Slice 4 potatoes in one swipe", mode: "classic", reward: 60, check: (s) => s.maxCombo >= 4 },
  { id: "time100", title: "Speed Farmer", body: "Score 100 in Time Attack", mode: "time", reward: 80, check: (s) => s.score >= 100 },
  { id: "golden3", title: "Golden Touch", body: "Slice 3 golden potatoes in one Arcade run", mode: "arcade", reward: 80, check: (s) => s.golden >= 3 },
  { id: "survive90", title: "Survivor", body: "Survive 90 seconds in Classic", mode: "classic", reward: 100, check: (s) => s.timePlayed >= 90 },
  { id: "score300", title: "Potato Master", body: "Score 300 in Arcade", mode: "arcade", reward: 150, check: (s) => s.score >= 300 },
];

export function starsFor(mode: NinjaMode, score: number) {
  const t = mode === "classic" ? [40, 120, 250] : [60, 150, 300];
  return score >= t[2] ? 3 : score >= t[1] ? 2 : score >= t[0] ? 1 : 0;
}

export function coinsFor(score: number) {
  return Math.min(150, Math.floor(score / 4));
}
