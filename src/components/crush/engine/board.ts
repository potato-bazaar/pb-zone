import { Rng } from "./rng";
import { COMBO_MULTIPLIER, SCORE_PER_TILE } from "./levels";
import {
  BOMB_KIND,
  type BlockerHit,
  type BlockerKind,
  type BoardSnapshot,
  type BoosterType,
  type Cell,
  type CreatedSpecial,
  type FallMove,
  type FireShape,
  type FiredSpecial,
  type LevelDef,
  type ObjectiveProgress,
  type Pos,
  type RemoveCause,
  type RemovedTile,
  type ScorePop,
  type Spawn,
  type Special,
  type Step,
  type Tile,
} from "./types";

const key = (p: Pos) => `${p.r}:${p.c}`;
const samePos = (a: Pos, b: Pos) => a.r === b.r && a.c === b.c;

const FIRE_BONUS: Record<FireShape, number> = {
  row: 300,
  col: 300,
  area3: 500,
  cross: 800,
  lines3: 1200,
  area5: 1500,
  color: 2000,
  board: 5000,
};

const CREATE_BONUS: Record<Special, number> = {
  none: 0,
  stripedH: 120,
  stripedV: 120,
  wrapped: 200,
  bomb: 400,
};

interface QueuedFire {
  pos: Pos;
  shape: FireShape;
  kind: number;
  /** Second detonation of a wrapped tile (tile itself is removed). */
  includeSelf: boolean;
}

interface MatchGroup {
  cells: Pos[];
  maxRun: number;
  hasH: boolean;
  hasV: boolean;
  /** Cell shared by a horizontal and vertical run (L / T shapes). */
  crossPos: Pos | null;
  /** Middle cell of the longest run. */
  middle: Pos;
  runDir: "H" | "V";
}

class ClearPlan {
  remove = new Map<string, { pos: Pos; cause: RemoveCause }>();
  created: CreatedSpecial[] = [];
  createdKeys = new Set<string>();
  queue: QueuedFire[] = [];
  fired: FiredSpecial[] = [];
  firedTileIds = new Set<number>();
  blockerHits = new Map<string, BlockerHit>();
  armedNow = new Set<string>();
  groups: MatchGroup[] = [];
  bonus = 0;
  pops: ScorePop[] = [];

  get isEmpty() {
    return (
      this.remove.size === 0 &&
      this.queue.length === 0 &&
      this.created.length === 0 &&
      this.armedNow.size === 0 &&
      this.blockerHits.size === 0
    );
  }
}

export class Board {
  readonly rows: number;
  readonly cols: number;
  readonly level: LevelDef;
  readonly cells: Cell[][];
  readonly kinds: number;

  score = 0;
  collected: number[];
  blockersTotal = 0;
  blockersCleared = 0;

  private rng: Rng;
  private nextId = 1;
  private lastSwap: Pos[] = [];

  constructor(level: LevelDef, seed: number) {
    this.level = level;
    this.rows = level.rows;
    this.cols = level.cols;
    this.kinds = level.tileIds.length;
    this.rng = new Rng(seed);
    this.collected = new Array(this.kinds).fill(0);
    this.cells = [];

    for (let r = 0; r < this.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.cols; c++) {
        const ch = level.layout?.[r]?.[c] ?? "o";
        const cell: Cell = {
          active: ch !== ".",
          tile: null,
          ice: 0,
          crate: 0,
          butter: 0,
          soil: 0,
        };
        switch (ch) {
          case "s":
            cell.soil = 1;
            break;
          case "S":
            cell.soil = 2;
            break;
          case "c":
            cell.crate = 1;
            break;
          case "C":
            cell.crate = 2;
            break;
          case "i":
            cell.ice = 1;
            break;
          case "I":
            cell.ice = 2;
            break;
          case "b":
            cell.butter = 1;
            break;
        }
        this.blockersTotal += cell.soil + cell.crate + cell.ice + cell.butter;
        row.push(cell);
      }
      this.cells.push(row);
    }

    this.fillInitial();
  }

  /** Deep copy (used by the balance simulator and move evaluation). */
  clone(): Board {
    const b = Object.create(Board.prototype) as Board;
    Object.assign(b, {
      level: this.level,
      rows: this.rows,
      cols: this.cols,
      kinds: this.kinds,
      score: this.score,
      collected: [...this.collected],
      blockersTotal: this.blockersTotal,
      blockersCleared: this.blockersCleared,
      rng: this.rng.clone(),
      nextId: this.nextId,
      lastSwap: [...this.lastSwap],
      cells: this.cells.map((row) =>
        row.map((cell) => ({ ...cell, tile: cell.tile ? { ...cell.tile } : null })),
      ),
    });
    return b;
  }

  /** Every legal, productive swap on the board. */
  allMoves(): [Pos, Pos][] {
    const out: [Pos, Pos][] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const a = { r, c };
        for (const b of [
          { r, c: c + 1 },
          { r: r + 1, c },
        ]) {
          if (this.canSwap(a, b) && this.wouldSwapWork(a, b)) out.push([a, b]);
        }
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- */
  /*  Queries                                                          */
  /* ---------------------------------------------------------------- */

  snapshot(): BoardSnapshot {
    return {
      rows: this.rows,
      cols: this.cols,
      cells: this.cells.map((row) =>
        row.map((cell) => ({ ...cell, tile: cell.tile ? { ...cell.tile } : null })),
      ),
    };
  }

  inBounds(p: Pos) {
    return p.r >= 0 && p.r < this.rows && p.c >= 0 && p.c < this.cols;
  }

  get(p: Pos): Cell | null {
    return this.inBounds(p) ? this.cells[p.r][p.c] : null;
  }

  isMovable(p: Pos) {
    const cell = this.get(p);
    return !!cell && cell.active && !!cell.tile && cell.ice === 0;
  }

  canSwap(a: Pos, b: Pos) {
    const adjacent = Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
    return adjacent && this.isMovable(a) && this.isMovable(b);
  }

  progress(): ObjectiveProgress[] {
    return this.level.objectives.map((objective) => {
      let current = 0;
      let target = objective.target;
      if (objective.type === "collect") {
        const idx = this.level.tileIds.indexOf(objective.tileId ?? "");
        current = idx >= 0 ? this.collected[idx] : target;
      } else if (objective.type === "score") {
        current = this.score;
      } else {
        target = this.blockersTotal || target;
        current = this.blockersCleared;
      }
      return {
        objective,
        current: Math.min(current, target),
        target,
        done: current >= target,
      };
    });
  }

  isWon() {
    return this.progress().every((p) => p.done);
  }

  starsFor(score: number): number {
    const [s1, s2, s3] = this.level.starScores;
    if (score >= s3) return 3;
    if (score >= s2) return 2;
    if (score >= s1) return 1;
    return 0;
  }

  /* ---------------------------------------------------------------- */
  /*  Public actions                                                   */
  /* ---------------------------------------------------------------- */

  applyMove(a: Pos, b: Pos): { valid: boolean; steps: Step[] } {
    if (!this.canSwap(a, b)) return { valid: false, steps: [] };

    this.swapTiles(a, b);
    this.lastSwap = [a, b];
    const steps: Step[] = [{ type: "swap", a, b, revert: false }];

    const combo = this.buildComboPlan(a, b);
    if (!combo && this.findMatches().length === 0) {
      this.swapTiles(a, b);
      steps.push({ type: "swap", a, b, revert: true });
      this.lastSwap = [];
      return { valid: false, steps };
    }

    steps.push(...this.resolve(combo));
    this.lastSwap = [];
    return { valid: true, steps };
  }

  applyBooster(type: BoosterType, pos: Pos): Step[] {
    if (type === "shuffle") return this.shuffleBoard();
    const cell = this.get(pos);
    if (!cell || !cell.active) return [];
    const plan = new ClearPlan();
    if (type === "masher") {
      this.addRemove(plan, pos, "booster", true);
      plan.pops.push({ pos, amount: 0 });
    } else if (type === "fryer-line") {
      plan.queue.push({ pos, shape: "cross", kind: -1, includeSelf: true });
    } else {
      plan.queue.push({ pos, shape: "area3", kind: -1, includeSelf: true });
    }
    return this.resolve(plan);
  }

  /** "Potato Party": turn remaining moves into striped tiles and fire them. */
  endBonus(count: number): Step[] {
    const candidates: Pos[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (
          cell.active &&
          cell.tile &&
          cell.tile.special === "none" &&
          cell.tile.kind >= 0 &&
          cell.ice === 0
        ) {
          candidates.push({ r, c });
        }
      }
    }
    this.rng.shuffle(candidates);
    const chosen = candidates.slice(0, Math.max(0, Math.min(count, 8)));
    if (chosen.length === 0) return [];

    const converted = chosen.map((pos) => {
      const tile = this.cells[pos.r][pos.c].tile!;
      tile.special = this.rng.next() < 0.5 ? "stripedH" : "stripedV";
      return { pos, tileId: tile.id, special: tile.special };
    });

    const plan = new ClearPlan();
    for (const pos of chosen) this.addRemove(plan, pos, "blast", true);
    return [{ type: "convert", tiles: converted }, ...this.resolve(plan)];
  }

  shuffleBoard(): Step[] {
    const positions: Pos[] = [];
    const tiles: Tile[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (cell.active && cell.tile && cell.ice === 0) {
          positions.push({ r, c });
          tiles.push(cell.tile);
        }
      }
    }
    if (tiles.length < 2) return [];

    for (let attempt = 0; attempt < 80; attempt++) {
      this.rng.shuffle(tiles);
      positions.forEach((p, i) => {
        this.cells[p.r][p.c].tile = tiles[i];
      });
      if (this.findMatches().length === 0 && this.findMove()) break;
    }

    const placements = positions.map((p) => ({
      tileId: this.cells[p.r][p.c].tile!.id,
      to: p,
    }));
    return [{ type: "shuffle", placements }, ...this.resolve(null)];
  }

  hasMove() {
    return this.findMove() !== null;
  }

  /** Returns a valid swap, starting the scan from a random offset so hints vary. */
  findMove(): [Pos, Pos] | null {
    const total = this.rows * this.cols;
    const start = this.rng.int(total);
    for (let i = 0; i < total; i++) {
      const idx = (start + i) % total;
      const r = Math.floor(idx / this.cols);
      const c = idx % this.cols;
      const a = { r, c };
      for (const b of [
        { r, c: c + 1 },
        { r: r + 1, c },
      ]) {
        if (!this.canSwap(a, b)) continue;
        if (this.wouldSwapWork(a, b)) return [a, b];
      }
    }
    return null;
  }

  /* ---------------------------------------------------------------- */
  /*  Setup                                                            */
  /* ---------------------------------------------------------------- */

  private fillInitial() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.cells[r][c];
        if (!cell.active || cell.crate > 0 || cell.butter > 0) continue;
        cell.tile = this.makeTile(this.pickKindAvoidingRuns(r, c));
      }
    }
    let guard = 0;
    while (!this.findMove() && guard++ < 50) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const cell = this.cells[r][c];
          if (cell.tile) cell.tile.kind = this.pickKindAvoidingRuns(r, c);
        }
      }
    }
  }

  private pickKindAvoidingRuns(r: number, c: number): number {
    const banned = new Set<number>();
    const k = (rr: number, cc: number) => this.get({ r: rr, c: cc })?.tile?.kind;
    if (k(r, c - 1) !== undefined && k(r, c - 1) === k(r, c - 2)) banned.add(k(r, c - 1)!);
    if (k(r - 1, c) !== undefined && k(r - 1, c) === k(r - 2, c)) banned.add(k(r - 1, c)!);
    const options: number[] = [];
    for (let i = 0; i < this.kinds; i++) if (!banned.has(i)) options.push(i);
    return options.length ? this.rng.pick(options) : this.rng.int(this.kinds);
  }

  private makeTile(kind: number, special: Special = "none"): Tile {
    return { id: this.nextId++, kind, special, armed: false };
  }

  private swapTiles(a: Pos, b: Pos) {
    const ca = this.cells[a.r][a.c];
    const cb = this.cells[b.r][b.c];
    const tmp = ca.tile;
    ca.tile = cb.tile;
    cb.tile = tmp;
  }

  private wouldSwapWork(a: Pos, b: Pos): boolean {
    const ta = this.cells[a.r][a.c].tile!;
    const tb = this.cells[b.r][b.c].tile!;
    if (ta.special === "bomb" || tb.special === "bomb") return true;
    if (ta.special !== "none" && tb.special !== "none") return true;
    this.swapTiles(a, b);
    const ok = this.runAt(a) || this.runAt(b);
    this.swapTiles(a, b);
    return ok;
  }

  private runAt(p: Pos): boolean {
    const tile = this.get(p)?.tile;
    if (!tile || tile.kind < 0) return false;
    const count = (dr: number, dc: number) => {
      let n = 0;
      let r = p.r + dr;
      let c = p.c + dc;
      while (this.get({ r, c })?.tile?.kind === tile.kind) {
        n++;
        r += dr;
        c += dc;
      }
      return n;
    };
    return count(0, -1) + count(0, 1) >= 2 || count(-1, 0) + count(1, 0) >= 2;
  }

  /* ---------------------------------------------------------------- */
  /*  Matching                                                         */
  /* ---------------------------------------------------------------- */

  private findMatches(): MatchGroup[] {
    const parent = new Map<string, string>();
    const find = (k: string): string => {
      let root = k;
      while (parent.get(root) !== root) root = parent.get(root)!;
      let cur = k;
      while (parent.get(cur) !== root) {
        const nxt = parent.get(cur)!;
        parent.set(cur, root);
        cur = nxt;
      }
      return root;
    };
    const union = (a: string, b: string) => {
      if (!parent.has(a)) parent.set(a, a);
      if (!parent.has(b)) parent.set(b, b);
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    type Run = { cells: Pos[]; dir: "H" | "V" };
    const runs: Run[] = [];
    const scan = (dir: "H" | "V") => {
      const outer = dir === "H" ? this.rows : this.cols;
      const inner = dir === "H" ? this.cols : this.rows;
      for (let o = 0; o < outer; o++) {
        let i = 0;
        while (i < inner) {
          const p0 = dir === "H" ? { r: o, c: i } : { r: i, c: o };
          const t0 = this.get(p0)?.tile;
          if (!t0 || t0.kind < 0) {
            i++;
            continue;
          }
          let j = i + 1;
          while (j < inner) {
            const pj = dir === "H" ? { r: o, c: j } : { r: j, c: o };
            if (this.get(pj)?.tile?.kind !== t0.kind) break;
            j++;
          }
          if (j - i >= 3) {
            const cells: Pos[] = [];
            for (let x = i; x < j; x++) cells.push(dir === "H" ? { r: o, c: x } : { r: x, c: o });
            runs.push({ cells, dir });
          }
          i = j;
        }
      }
    };
    scan("H");
    scan("V");
    if (runs.length === 0) return [];

    for (const run of runs) {
      const k0 = key(run.cells[0]);
      if (!parent.has(k0)) parent.set(k0, k0);
      for (const cell of run.cells) union(k0, key(cell));
    }

    const groups = new Map<string, { cells: Map<string, Pos>; runs: Run[] }>();
    for (const run of runs) {
      const root = find(key(run.cells[0]));
      let g = groups.get(root);
      if (!g) {
        g = { cells: new Map(), runs: [] };
        groups.set(root, g);
      }
      g.runs.push(run);
      for (const cell of run.cells) g.cells.set(key(cell), cell);
    }

    const result: MatchGroup[] = [];
    for (const g of groups.values()) {
      const hasH = g.runs.some((r) => r.dir === "H");
      const hasV = g.runs.some((r) => r.dir === "V");
      const longest = g.runs.reduce((a, b) => (b.cells.length > a.cells.length ? b : a));
      let crossPos: Pos | null = null;
      if (hasH && hasV) {
        const hRuns = g.runs.filter((r) => r.dir === "H");
        const vRuns = g.runs.filter((r) => r.dir === "V");
        outer: for (const h of hRuns) {
          for (const v of vRuns) {
            for (const hc of h.cells) {
              if (v.cells.some((vc) => samePos(vc, hc))) {
                crossPos = hc;
                break outer;
              }
            }
          }
        }
      }
      result.push({
        cells: [...g.cells.values()],
        maxRun: longest.cells.length,
        hasH,
        hasV,
        crossPos,
        middle: longest.cells[Math.floor(longest.cells.length / 2)],
        runDir: longest.dir,
      });
    }
    return result;
  }

  private specialForGroup(g: MatchGroup): Special {
    if (g.maxRun >= 5) return "bomb";
    if (g.hasH && g.hasV) return "wrapped";
    if (g.maxRun === 4) return g.runDir === "H" ? "stripedH" : "stripedV";
    return "none";
  }

  private placementFor(g: MatchGroup, cascade: number): Pos {
    const unfrozen = (p: Pos) => (this.get(p)?.ice ?? 1) === 0;
    if (cascade === 0) {
      const swapped = this.lastSwap.find(
        (s) => g.cells.some((c) => samePos(c, s)) && unfrozen(s),
      );
      if (swapped) return swapped;
    }
    if (g.crossPos && unfrozen(g.crossPos)) return g.crossPos;
    if (unfrozen(g.middle)) return g.middle;
    return g.cells.find(unfrozen) ?? g.middle;
  }

  /* ---------------------------------------------------------------- */
  /*  Combos (special + special swaps)                                 */
  /* ---------------------------------------------------------------- */

  private buildComboPlan(a: Pos, b: Pos): ClearPlan | null {
    const ta = this.cells[a.r][a.c].tile!;
    const tb = this.cells[b.r][b.c].tile!;
    const sa = ta.special;
    const sb = tb.special;
    if (sa === "none" && sb === "none") return null;
    const isStriped = (s: Special) => s === "stripedH" || s === "stripedV";

    const plan = new ClearPlan();
    const consume = (p: Pos, t: Tile) => {
      plan.firedTileIds.add(t.id);
      plan.remove.set(key(p), { pos: p, cause: "bomb" });
    };

    if (sa === "bomb" || sb === "bomb") {
      const bombPos = sa === "bomb" ? a : b;
      const bombTile = sa === "bomb" ? ta : tb;
      const otherPos = sa === "bomb" ? b : a;
      const other = sa === "bomb" ? tb : ta;
      consume(bombPos, bombTile);

      if (other.special === "bomb") {
        consume(otherPos, other);
        plan.queue.push({ pos: bombPos, shape: "board", kind: -1, includeSelf: true });
        return plan;
      }
      if (isStriped(other.special) || other.special === "wrapped") {
        consume(otherPos, other);
        const targets = this.tilesOfKind(other.kind).filter((p) => !samePos(p, otherPos));
        for (const p of targets) {
          const t = this.cells[p.r][p.c].tile!;
          t.special =
            other.special === "wrapped"
              ? "wrapped"
              : this.rng.next() < 0.5
                ? "stripedH"
                : "stripedV";
          t.armed = false;
        }
        plan.fired.push({ pos: bombPos, shape: "color", kind: other.kind, targets });
        plan.bonus += FIRE_BONUS.color;
        plan.queue.push({
          pos: otherPos,
          shape: other.special === "wrapped" ? "area3" : "cross",
          kind: -1,
          includeSelf: true,
        });
        for (const p of targets) this.addRemove(plan, p, "bomb", true);
        return plan;
      }
      // bomb + plain tile
      plan.queue.push({ pos: bombPos, shape: "color", kind: other.kind, includeSelf: false });
      return plan;
    }

    if (sa === "none" || sb === "none") return null;

    consume(a, ta);
    consume(b, tb);
    if (isStriped(sa) && isStriped(sb)) {
      plan.queue.push({ pos: b, shape: "cross", kind: -1, includeSelf: true });
    } else if (sa === "wrapped" && sb === "wrapped") {
      plan.queue.push({ pos: b, shape: "area5", kind: -1, includeSelf: true });
    } else {
      plan.queue.push({ pos: b, shape: "lines3", kind: -1, includeSelf: true });
    }
    return plan;
  }

  private tilesOfKind(kind: number): Pos[] {
    const out: Pos[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const t = this.cells[r][c].tile;
        if (t && t.kind === kind && this.cells[r][c].active) out.push({ r, c });
      }
    }
    return out;
  }

  private mostCommonKind(): number {
    const counts = new Array(this.kinds).fill(0);
    for (const row of this.cells) {
      for (const cell of row) {
        if (cell.tile && cell.tile.kind >= 0) counts[cell.tile.kind]++;
      }
    }
    let best = 0;
    for (let i = 1; i < counts.length; i++) if (counts[i] > counts[best]) best = i;
    return best;
  }

  /* ---------------------------------------------------------------- */
  /*  Clearing                                                         */
  /* ---------------------------------------------------------------- */

  private hitBlocker(plan: ClearPlan, pos: Pos, kind: BlockerKind) {
    const k = `${kind}@${key(pos)}`;
    if (plan.blockerHits.has(k)) return;
    const cell = this.cells[pos.r][pos.c];
    if (cell[kind] <= 0) return;
    cell[kind]--;
    this.blockersCleared++;
    plan.blockerHits.set(k, { pos, kind, remaining: cell[kind] });
    plan.bonus += 100;
  }

  /**
   * Marks a cell for removal (or damages what is protecting it).
   * `force` removes even wrapped tiles outright (used for the second detonation).
   */
  private addRemove(plan: ClearPlan, pos: Pos, cause: RemoveCause, force = false) {
    const cell = this.get(pos);
    if (!cell || !cell.active) return;
    if (cell.crate > 0) return this.hitBlocker(plan, pos, "crate");
    if (cell.butter > 0) return this.hitBlocker(plan, pos, "butter");
    const tile = cell.tile;
    if (!tile) return;
    if (cell.ice > 0) return this.hitBlocker(plan, pos, "ice");

    const k = key(pos);
    if (plan.createdKeys.has(k)) return;

    if (tile.special === "wrapped" && !tile.armed && !force) {
      if (plan.armedNow.has(k)) return;
      plan.armedNow.add(k);
      if (!plan.firedTileIds.has(tile.id)) {
        plan.firedTileIds.add(tile.id);
        plan.queue.push({ pos, shape: "area3", kind: -1, includeSelf: false });
      }
      return;
    }

    if (plan.remove.has(k)) return;
    plan.remove.set(k, { pos, cause });

    if (tile.special !== "none" && !plan.firedTileIds.has(tile.id)) {
      plan.firedTileIds.add(tile.id);
      if (tile.special === "stripedH") {
        plan.queue.push({ pos, shape: "row", kind: -1, includeSelf: false });
      } else if (tile.special === "stripedV") {
        plan.queue.push({ pos, shape: "col", kind: -1, includeSelf: false });
      } else if (tile.special === "wrapped") {
        plan.queue.push({ pos, shape: "area3", kind: -1, includeSelf: false });
      } else if (tile.special === "bomb") {
        plan.queue.push({
          pos,
          shape: "color",
          kind: this.mostCommonKind(),
          includeSelf: false,
        });
      }
    }
  }

  private targetsFor(fire: QueuedFire): Pos[] {
    const { pos, shape } = fire;
    const out: Pos[] = [];
    const push = (r: number, c: number) => {
      const p = { r, c };
      if (this.inBounds(p) && (fire.includeSelf || !samePos(p, pos))) out.push(p);
    };
    switch (shape) {
      case "row":
        for (let c = 0; c < this.cols; c++) push(pos.r, c);
        break;
      case "col":
        for (let r = 0; r < this.rows; r++) push(r, pos.c);
        break;
      case "cross":
        for (let c = 0; c < this.cols; c++) push(pos.r, c);
        for (let r = 0; r < this.rows; r++) if (r !== pos.r) push(r, pos.c);
        break;
      case "lines3":
        for (let d = -1; d <= 1; d++) {
          for (let c = 0; c < this.cols; c++) push(pos.r + d, c);
          for (let r = 0; r < this.rows; r++) {
            if (r < pos.r - 1 || r > pos.r + 1) push(r, pos.c + d);
          }
        }
        break;
      case "area3":
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) push(pos.r + dr, pos.c + dc);
        break;
      case "area5":
        for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) push(pos.r + dr, pos.c + dc);
        break;
      case "color":
        return this.tilesOfKind(fire.kind);
      case "board":
        for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) push(r, c);
        break;
    }
    return out;
  }

  private processQueue(plan: ClearPlan) {
    let guard = 0;
    while (plan.queue.length && guard++ < 500) {
      const fire = plan.queue.shift()!;
      const targets = this.targetsFor(fire);
      plan.fired.push({ pos: fire.pos, shape: fire.shape, kind: fire.kind, targets });
      plan.bonus += FIRE_BONUS[fire.shape];
      const cause: RemoveCause = fire.shape === "color" || fire.shape === "board" ? "bomb" : "blast";
      for (const t of targets) this.addRemove(plan, t, cause, fire.shape === "board");
    }
  }

  private resolve(initial: ClearPlan | null): Step[] {
    const steps: Step[] = [];
    let cascade = 0;
    let plan = initial;

    while (cascade < 40) {
      if (!plan) plan = new ClearPlan();

      // Wrapped tiles armed in a previous pass explode again and vanish.
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const t = this.cells[r][c].tile;
          if (t && t.armed) this.addRemove(plan, { r, c }, "blast", true);
        }
      }

      const groups = this.findMatches();
      for (const g of groups) {
        const special = this.specialForGroup(g);
        if (special !== "none") {
          const at = this.placementFor(g, cascade);
          const tile = this.cells[at.r][at.c].tile!;
          const k = key(at);
          if (!plan.createdKeys.has(k) && !plan.remove.has(k)) {
            plan.createdKeys.add(k);
            plan.created.push({ pos: at, tileId: tile.id, kind: tile.kind, special });
            plan.bonus += CREATE_BONUS[special];
          }
        }
        for (const cell of g.cells) this.addRemove(plan, cell, "match");
        plan.groups.push(g);
      }

      this.processQueue(plan);
      if (plan.isEmpty) break;

      steps.push(this.applyPlan(plan, cascade));
      steps.push(this.computeFall());
      cascade++;
      plan = null;
    }
    return steps;
  }

  private applyPlan(plan: ClearPlan, cascade: number): Step {
    const mult = 1 + cascade * COMBO_MULTIPLIER;
    const removed: RemovedTile[] = [];
    const affected: Pos[] = [];

    // Adjacent crates / butter take a hit from matches.
    for (const g of plan.groups) {
      for (const cell of g.cells) {
        for (const [dr, dc] of [
          [0, 1],
          [0, -1],
          [1, 0],
          [-1, 0],
        ]) {
          const n = { r: cell.r + dr, c: cell.c + dc };
          const nc = this.get(n);
          if (!nc || !nc.active) continue;
          if (nc.crate > 0) this.hitBlocker(plan, n, "crate");
          else if (nc.butter > 0) this.hitBlocker(plan, n, "butter");
        }
      }
    }

    for (const { pos, cause } of plan.remove.values()) {
      const cell = this.cells[pos.r][pos.c];
      const tile = cell.tile;
      if (!tile) continue;
      removed.push({ pos, tileId: tile.id, kind: tile.kind, special: tile.special, cause });
      if (tile.kind >= 0) this.collected[tile.kind]++;
      cell.tile = null;
      affected.push(pos);
    }

    for (const created of plan.created) {
      const cell = this.cells[created.pos.r][created.pos.c];
      if (!cell.tile) continue;
      cell.tile.special = created.special;
      cell.tile.armed = false;
      if (created.special === "bomb") cell.tile.kind = BOMB_KIND;
      else if (cell.tile.kind >= 0) this.collected[cell.tile.kind]++;
      affected.push(created.pos);
    }

    for (const k of plan.armedNow) {
      const [r, c] = k.split(":").map(Number);
      const tile = this.cells[r][c].tile;
      if (tile) tile.armed = true;
      affected.push({ r, c });
    }

    for (const pos of affected) {
      if (this.cells[pos.r][pos.c].soil > 0) this.hitBlocker(plan, pos, "soil");
    }

    const base = Math.round(removed.length * SCORE_PER_TILE * mult);
    const total = base + plan.bonus;
    this.score += total;

    const pops: ScorePop[] = [];
    if (plan.groups.length) {
      const perGroup = Math.round(total / plan.groups.length);
      for (const g of plan.groups) pops.push({ pos: g.crossPos ?? g.middle, amount: perGroup });
    } else if (plan.fired.length) {
      pops.push({ pos: plan.fired[0].pos, amount: total });
    } else if (plan.pops.length) {
      pops.push({ pos: plan.pops[0].pos, amount: total });
    } else if (removed.length) {
      pops.push({ pos: removed[0].pos, amount: total });
    }

    return {
      type: "clear",
      cascade,
      removed,
      created: plan.created,
      blockers: [...plan.blockerHits.values()],
      fired: plan.fired,
      score: total,
      pops,
    };
  }

  /* ---------------------------------------------------------------- */
  /*  Gravity                                                          */
  /* ---------------------------------------------------------------- */

  private isSolid(cell: Cell) {
    return !cell.active || cell.crate > 0 || cell.butter > 0 || cell.ice > 0;
  }

  private computeFall(): Step {
    const moves: FallMove[] = [];
    const spawns: Spawn[] = [];

    for (let c = 0; c < this.cols; c++) {
      let r = this.rows - 1;
      while (r >= 0) {
        if (this.isSolid(this.cells[r][c])) {
          r--;
          continue;
        }
        // Segment of fall-through cells from r upward.
        const bottom = r;
        let top = r;
        while (top - 1 >= 0 && !this.isSolid(this.cells[top - 1][c])) top--;

        const tiles: { tile: Tile; from: number }[] = [];
        for (let rr = bottom; rr >= top; rr--) {
          const t = this.cells[rr][c].tile;
          if (t) tiles.push({ tile: t, from: rr });
          this.cells[rr][c].tile = null;
        }
        let write = bottom;
        for (const { tile, from } of tiles) {
          this.cells[write][c].tile = tile;
          if (write !== from) moves.push({ tileId: tile.id, from: { r: from, c }, to: { r: write, c } });
          write--;
        }
        let stack = 0;
        for (let rr = write; rr >= top; rr--) {
          const tile = this.makeTile(this.rng.int(this.kinds));
          this.cells[rr][c].tile = tile;
          spawns.push({ tile, to: { r: rr, c }, stack, entryRow: top - 1 });
          stack++;
        }
        r = top - 1;
      }
    }
    return { type: "fall", moves, spawns };
  }
}
