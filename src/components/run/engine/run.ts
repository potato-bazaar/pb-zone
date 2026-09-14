/**
 * Potato Run — pure endless-runner simulation (no DOM, no PixiJS).
 *
 * World units: metres. The player runs along +z; entities are spawned ahead
 * and slide toward z = 0 (the player). Lateral position is in lane units
 * (one lane = LANE_M metres, lanes are -1 / 0 / 1).
 *
 * A run is a delivery: farm road for the first ~1,150 m, then the cold
 * storage aisle until the 1,500 m finish ("Shipment complete").
 */

export type Lane = -1 | 0 | 1;
export type ObstacleKind = "crate" | "hay" | "barrier" | "tractor" | "gate" | "puddle";
export type PickupKind = "potato" | "star" | "box";
export type PowerKind = "magnet" | "shield" | "boost";
export type EntityKind = ObstacleKind | PickupKind | PowerKind | "ramp";
export type PropKind = "tree" | "fence" | "sign" | "hayside" | "crateside";
export type PlayerState = "run" | "jump" | "slide" | "stumble" | "crash";
export type Phase = "farm" | "storage";

export const LANE_M = 1.6;
export const ROAD_HALF_M = 3.0;
export const DRAW_DISTANCE = 75;
export const PLAYER_H = 1.75;
export const JUMP_V = 7.2;
export const GRAVITY = 21;
export const SLIDE_S = 0.8;
export const STUMBLE_S = 0.85;
export const CRASH_S = 1.3;
export const SECTION_M = 250;
export const MILESTONES = [100, 500, 1000, 1500];
/** Where the farm road turns into the cold storage aisle, and where the run ends. */
export const STORAGE_M = 1150;
export const FINISH_M = 1500;
export const MAGNET_S = 8;
export const BOOST_S = 5;
export const COMBO_GAP_S = 2.4;

export const OBSTACLES: Record<ObstacleKind, { w: number; h: number; avoid: "jump" | "slide" | "none"; clearance: number }> = {
  crate: { w: 1.5, h: 1.55, avoid: "jump", clearance: 0.7 },
  hay: { w: 1.55, h: 1.3, avoid: "jump", clearance: 0.55 },
  barrier: { w: 1.5, h: 1.0, avoid: "jump", clearance: 0.45 },
  tractor: { w: 2.4, h: 2.5, avoid: "none", clearance: 99 },
  gate: { w: 1.9, h: 2.6, avoid: "slide", clearance: 0 },
  puddle: { w: 1.7, h: 0.3, avoid: "jump", clearance: 0.2 },
};

export const PICKUPS: Record<PickupKind, { size: number }> = {
  potato: { size: 0.62 },
  star: { size: 0.72 },
  box: { size: 0.78 },
};

export const POWERS: Record<PowerKind, { label: string; blurb: string }> = {
  magnet: { label: "Magnet", blurb: "Attracts nearby potatoes!" },
  shield: { label: "Shield", blurb: "Blocks one hit!" },
  boost: { label: "Speed Boost", blurb: "Smash through anything!" },
};

export const PROPS: Record<PropKind, { w: number; h: number }> = {
  tree: { w: 3.4, h: 3.9 },
  fence: { w: 4.2, h: 1.2 },
  sign: { w: 1.5, h: 2.3 },
  hayside: { w: 1.5, h: 1.3 },
  crateside: { w: 1.4, h: 1.5 },
};

export type Entity = {
  id: number;
  kind: EntityKind;
  lane: Lane;
  z: number;
  /** Float height for pickups laid along a jump arc. */
  y: number;
  /** 0..1 how far a magnetised pickup has been pulled toward the runner's lane. */
  pull: number;
  taken: boolean;
  passed: boolean;
  hit: boolean;
};

export type Prop = { id: number; kind: PropKind; side: -1 | 1; offset: number; z: number; scale: number };

export type MissionId = "potatoes" | "stars" | "boxes";
export const MISSIONS: { id: MissionId; label: string; target: number }[] = [
  { id: "potatoes", label: "Collect 50 Potatoes", target: 50 },
  { id: "stars", label: "Grab 15 PB Stars", target: 15 },
  { id: "boxes", label: "Deliver 3 Parcels", target: 3 },
];

export type RunEvent =
  | { type: "pickup"; kind: PickupKind; lane: Lane; y: number; combo: number }
  | { type: "power"; kind: PowerKind; lane: Lane }
  | { type: "powerEnd"; kind: PowerKind }
  | { type: "shieldBreak"; kind: ObstacleKind }
  | { type: "smash"; kind: ObstacleKind; lane: Lane }
  | { type: "ramp"; lane: Lane }
  | { type: "avoid"; kind: ObstacleKind }
  | { type: "stumble"; kind: ObstacleKind }
  | { type: "crash"; kind: ObstacleKind }
  | { type: "milestone"; metres: number }
  | { type: "section"; index: number; perfect: boolean }
  | { type: "mission"; id: MissionId }
  | { type: "phase"; phase: Phase }
  | { type: "jump" }
  | { type: "slide" }
  | { type: "land" }
  | { type: "finish" }
  | { type: "end" };

export type RunFacts = {
  distance: number;
  potatoes: number;
  stars: number;
  boxes: number;
  avoided: number;
  perfectSections: number;
  hits: number;
  missionsDone: number;
  newBest: boolean;
  maxCombo: number;
  /** Seconds of running. */
  time: number;
  finished: boolean;
  powerups: number;
};

/** Small deterministic PRNG so a run can be replayed from its seed. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const LANES: Lane[] = [-1, 0, 1];

export class RunGame {
  // player
  lane: Lane = 0;
  x = 0;
  y = 0;
  vy = 0;
  state: PlayerState = "run";
  stateT = 0;
  /** Running-cycle phase in strides (fractional). */
  stride = 0;
  invuln = 0;
  private queuedSlide = false;
  private lastHitAt = -99;

  // power-ups
  shield = false;
  magnetT = 0;
  boostT = 0;
  powerups = 0;

  // run
  speed = 9;
  distance = 0;
  time = 0;
  paused = false;
  over = false;
  finished = false;
  phase: Phase = "farm";
  best: number;

  entities: Entity[] = [];
  props: Prop[] = [];
  events: RunEvent[] = [];

  potatoes = 0;
  stars = 0;
  boxes = 0;
  avoided = 0;
  hits = 0;
  perfectSections = 0;
  combo = 0;
  maxCombo = 0;
  private comboT = 0;
  missionsDone: MissionId[] = [];

  private sectionHits = 0;
  private sectionIndex = 0;
  private milestones = new Set<number>();
  private nextSpawnZ = 26;
  private nextPropZ = 4;
  private nextBoxAt = 90;
  private nextPowerAt = 70;
  private uid = 0;
  private rng: () => number;

  constructor(seed = Date.now(), best = 0) {
    this.rng = mulberry32(seed);
    this.best = best;
    while (this.nextPropZ < DRAW_DISTANCE) this.spawnProps();
  }

  /* ---------------------------------------------------------------- */
  /*  Input                                                            */
  /* ---------------------------------------------------------------- */

  moveLeft() {
    if (this.over || this.state === "crash") return;
    if (this.lane > -1) this.lane = (this.lane - 1) as Lane;
  }

  moveRight() {
    if (this.over || this.state === "crash") return;
    if (this.lane < 1) this.lane = (this.lane + 1) as Lane;
  }

  jump() {
    if (this.over || this.state === "crash") return;
    if (this.y > 0.01) return;
    this.state = "jump";
    this.vy = JUMP_V;
    this.queuedSlide = false;
    this.events.push({ type: "jump" });
  }

  slide() {
    if (this.over || this.state === "crash") return;
    if (this.state === "jump" || this.y > 0.01) {
      // fast-fall then slide on landing, like the big runners do
      this.vy = Math.min(this.vy, -12);
      this.queuedSlide = true;
      return;
    }
    this.state = "slide";
    this.stateT = SLIDE_S;
    this.events.push({ type: "slide" });
  }

  /* ---------------------------------------------------------------- */
  /*  Derived                                                          */
  /* ---------------------------------------------------------------- */

  get facts(): RunFacts {
    return {
      distance: Math.floor(this.distance),
      potatoes: this.potatoes,
      stars: this.stars,
      boxes: this.boxes,
      avoided: this.avoided,
      perfectSections: this.perfectSections,
      hits: this.hits,
      missionsDone: this.missionsDone.length,
      newBest: this.distance > this.best && this.best > 0,
      maxCombo: this.maxCombo,
      time: this.time,
      finished: this.finished,
      powerups: this.powerups,
    };
  }

  get activePower(): { kind: PowerKind; left: number; total: number } | null {
    if (this.boostT > 0) return { kind: "boost", left: this.boostT, total: BOOST_S };
    if (this.magnetT > 0) return { kind: "magnet", left: this.magnetT, total: MAGNET_S };
    if (this.shield) return { kind: "shield", left: 1, total: 1 };
    return null;
  }

  /** 0 on the farm, 1 inside cold storage, blended over the last 50 m of the approach. */
  get storageBlend(): number {
    return Math.min(1, Math.max(0, (this.distance - (STORAGE_M - 50)) / 50));
  }

  missionProgress(id: MissionId): number {
    return id === "potatoes" ? this.potatoes : id === "stars" ? this.stars : this.boxes;
  }

  /** The first mission that is not finished yet (or the last one). */
  get currentMission() {
    return MISSIONS.find((m) => !this.missionsDone.includes(m.id)) ?? MISSIONS[MISSIONS.length - 1];
  }

  /** Effective lateral position of a pickup (lane units) once the magnet has pulled it. */
  entityX(e: Entity): number {
    return e.pull > 0 ? e.lane + (this.x - e.lane) * e.pull : e.lane;
  }

  /* ---------------------------------------------------------------- */
  /*  Simulation                                                       */
  /* ---------------------------------------------------------------- */

  step(dtRaw: number) {
    if (this.paused || this.over) return;
    const dt = Math.min(dtRaw, 0.05);
    this.time += dt;

    if (this.state === "crash") {
      this.stateT -= dt;
      this.speed = Math.max(0, this.speed - 24 * dt);
      this.advance(this.speed * dt);
      if (this.stateT <= 0) {
        this.over = true;
        this.events.push({ type: "end" });
      }
      return;
    }

    // speed ramps with distance; stumbling slows you down; boost doubles down
    const target = 9 + Math.min(11.5, this.distance / 115);
    this.speed += (target - this.speed) * Math.min(1, dt * (this.speed < target ? 0.9 : 3));
    let v = this.state === "stumble" ? this.speed * 0.55 : this.speed;
    if (this.boostT > 0) v = this.speed * 1.7;

    // lateral
    this.x += (this.lane - this.x) * Math.min(1, dt * 11);

    // vertical
    if (this.state === "jump") {
      this.y += this.vy * dt;
      this.vy -= GRAVITY * dt;
      if (this.y <= 0) {
        this.y = 0;
        this.vy = 0;
        this.events.push({ type: "land" });
        if (this.queuedSlide) {
          this.queuedSlide = false;
          this.state = "slide";
          this.stateT = SLIDE_S;
          this.events.push({ type: "slide" });
        } else {
          this.state = "run";
        }
      }
    } else if (this.state === "slide" || this.state === "stumble") {
      this.stateT -= dt;
      if (this.stateT <= 0) this.state = "run";
    }
    this.invuln = Math.max(0, this.invuln - dt);
    // one full run cycle (left + right step) per ~3.2 m; the renderer maps this onto the 16-frame sheet
    this.stride += (v * dt) / 3.2;

    // power-up timers
    if (this.magnetT > 0) {
      this.magnetT -= dt;
      if (this.magnetT <= 0) this.events.push({ type: "powerEnd", kind: "magnet" });
    }
    if (this.boostT > 0) {
      this.boostT -= dt;
      if (this.boostT <= 0) this.events.push({ type: "powerEnd", kind: "boost" });
    }
    // magnet pulls nearby pickups into the runner's lane
    for (const e of this.entities) {
      if (e.taken || !isPickup(e.kind)) continue;
      if (this.magnetT > 0 && e.z < 14 && e.z > -1) e.pull = Math.min(1, e.pull + dt * 3.2);
    }

    // combo decays when pickups stop
    this.comboT += dt;
    if (this.combo > 0 && this.comboT > COMBO_GAP_S) this.combo = 0;

    this.advance(v * dt);
  }

  private advance(dz: number) {
    if (dz <= 0) return;
    this.distance += dz;

    for (const e of this.entities) e.z -= dz;
    for (const p of this.props) p.z -= dz;

    // collisions and pickups
    for (const e of this.entities) {
      if (e.taken || e.passed) continue;
      if (isPickup(e.kind)) {
        const ex = this.entityX(e);
        if (e.z < 0.8 && e.z > -0.8 && Math.abs(this.x - ex) < 0.62 && Math.abs(this.y - e.y) < 0.9) {
          e.taken = true;
          if (e.kind === "potato") this.potatoes += 1;
          else if (e.kind === "star") this.stars += 1;
          else this.boxes += 1;
          this.combo += 1;
          this.comboT = 0;
          this.maxCombo = Math.max(this.maxCombo, this.combo);
          this.events.push({ type: "pickup", kind: e.kind, lane: e.lane, y: e.y, combo: this.combo });
          this.checkMissions();
        } else if (e.z < -0.8) {
          e.passed = true;
        }
        continue;
      }
      const inLane = Math.abs(this.x - e.lane) < (e.kind === "tractor" ? 0.95 : 0.62);
      if (isPower(e.kind)) {
        if (e.z < 0.8 && e.z > -0.8 && inLane) {
          e.taken = true;
          this.powerups += 1;
          if (e.kind === "magnet") this.magnetT = MAGNET_S;
          else if (e.kind === "boost") {
            this.boostT = BOOST_S;
            this.invuln = Math.max(this.invuln, 0.3);
          } else this.shield = true;
          this.events.push({ type: "power", kind: e.kind, lane: e.lane });
        } else if (e.z < -0.8) e.passed = true;
        continue;
      }
      if (e.kind === "ramp") {
        if (e.z < 0.6 && e.z > -0.9 && inLane && this.y <= 0.01 && this.state !== "slide") {
          e.taken = true;
          this.state = "jump";
          this.vy = JUMP_V * 1.32;
          this.queuedSlide = false;
          this.events.push({ type: "ramp", lane: e.lane });
        } else if (e.z < -0.9) e.passed = true;
        continue;
      }
      const info = OBSTACLES[e.kind];
      if (e.z < 0.55 && e.z > -0.7 && inLane && !e.hit) {
        if (this.boostT > 0) {
          // speed boost smashes through
          e.hit = true;
          e.taken = true;
          this.avoided += 1;
          this.events.push({ type: "smash", kind: e.kind, lane: e.lane });
          continue;
        }
        const safe = info.avoid === "jump" ? this.y >= info.clearance : info.avoid === "slide" ? this.state === "slide" : false;
        if (!safe && this.invuln <= 0) {
          e.hit = true;
          this.onHit(e.kind);
          if (this.state === "crash") return;
        }
      }
      if (e.z < -0.7) {
        e.passed = true;
        if (!e.hit && inLane) {
          this.avoided += 1;
          this.events.push({ type: "avoid", kind: e.kind });
        }
      }
    }
    this.entities = this.entities.filter((e) => e.z > -10);
    this.props = this.props.filter((p) => p.z > -12);

    while (this.nextSpawnZ < this.distance + DRAW_DISTANCE) this.spawnChunk();
    while (this.nextPropZ < this.distance + DRAW_DISTANCE) this.spawnProps();

    for (const m of MILESTONES) {
      if (this.distance >= m && !this.milestones.has(m)) {
        this.milestones.add(m);
        this.events.push({ type: "milestone", metres: m });
      }
    }
    const section = Math.floor(this.distance / SECTION_M);
    if (section > this.sectionIndex) {
      const perfect = this.sectionHits === 0;
      if (perfect) this.perfectSections += 1;
      this.events.push({ type: "section", index: section, perfect });
      this.sectionIndex = section;
      this.sectionHits = 0;
    }
    if (this.phase === "farm" && this.distance >= STORAGE_M) {
      this.phase = "storage";
      this.events.push({ type: "phase", phase: "storage" });
    }
    if (!this.finished && this.distance >= FINISH_M) {
      this.finished = true;
      this.over = true;
      this.events.push({ type: "finish" });
      this.events.push({ type: "end" });
    }
  }

  private onHit(kind: ObstacleKind) {
    if (this.shield) {
      this.shield = false;
      this.invuln = 1.2;
      this.events.push({ type: "shieldBreak", kind });
      return;
    }
    this.hits += 1;
    this.sectionHits += 1;
    this.combo = 0;
    const fatal = kind === "tractor" || this.time - this.lastHitAt < 2.6;
    this.lastHitAt = this.time;
    if (fatal) {
      this.state = "crash";
      this.stateT = CRASH_S;
      this.y = Math.max(0, this.y);
      this.vy = 0;
      this.events.push({ type: "crash", kind });
      return;
    }
    this.state = "stumble";
    this.stateT = STUMBLE_S;
    this.invuln = 1.7;
    this.y = 0;
    this.vy = 0;
    this.queuedSlide = false;
    this.speed *= 0.55;
    this.events.push({ type: "stumble", kind });
  }

  private checkMissions() {
    for (const m of MISSIONS) {
      if (this.missionsDone.includes(m.id)) continue;
      if (this.missionProgress(m.id) >= m.target) {
        this.missionsDone.push(m.id);
        this.events.push({ type: "mission", id: m.id });
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Spawning                                                         */
  /* ---------------------------------------------------------------- */

  private pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.rng() * arr.length)];
  }

  private add(kind: EntityKind, lane: Lane, z: number, y = 0) {
    this.entities.push({ id: ++this.uid, kind, lane, z: z - this.distance, y, pull: 0, taken: false, passed: false, hit: false });
  }

  /** World z here is absolute (distance-based); `add` converts to player-relative. */
  private potatoRow(lane: Lane, z0: number, count = 5, gap = 1.9) {
    for (let i = 0; i < count; i++) {
      const kind: PickupKind = this.rng() < 0.09 ? "star" : "potato";
      this.add(kind, lane, z0 + i * gap);
    }
  }

  /** Potatoes along a jump arc over an obstacle at world z. */
  private potatoArc(lane: Lane, zObs: number, height = 1.05) {
    const pts = [-3.2, -1.8, 0, 1.8, 3.2];
    for (let i = 0; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      const y = 0.25 + Math.sin(t * Math.PI) * height;
      this.add("potato", lane, zObs + pts[i], y);
    }
  }

  private spawnChunk() {
    const z = this.nextSpawnZ;
    const d = this.distance;
    const indoor = z >= STORAGE_M - 20;
    const hard = Math.min(1, d / 900);
    const low: ObstacleKind[] = indoor ? ["crate", "barrier", "crate"] : ["crate", "hay", "barrier", "puddle"];
    const lanes = [...LANES];
    for (let i = lanes.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [lanes[i], lanes[j]] = [lanes[j], lanes[i]];
    }
    const roll = this.rng();
    let length = 10;

    // nothing spawns on the finish straight
    if (z > FINISH_M - 12) {
      this.nextSpawnZ = z + 30;
      return;
    }

    if (d < 40 || roll < 0.14) {
      // breather: potato rows only
      this.potatoRow(lanes[0], z, 6);
      if (this.rng() < 0.5) this.potatoRow(lanes[1], z + 2, 4);
      length = 13;
    } else if (roll < 0.24 && !indoor) {
      // ramp launch with a high arc of potatoes and a star at the top
      this.add("ramp", lanes[0], z + 3);
      this.potatoArc(lanes[0], z + 8, 1.6);
      this.add("star", lanes[0], z + 8, 2.1);
      this.potatoRow(lanes[1], z, 5);
      length = 15;
    } else if (roll < 0.46) {
      // single low obstacle with an arc of potatoes over it
      const kind = this.pick(low);
      this.add(kind, lanes[0], z + 4);
      this.potatoArc(lanes[0], z + 4);
      this.potatoRow(lanes[1], z + 1, 4);
      length = 12;
    } else if (roll < 0.64) {
      // two low obstacles, one free lane full of potatoes
      this.add(this.pick(low), lanes[0], z + 4);
      this.add(this.pick(low), lanes[1], z + 4 + (this.rng() < 0.5 ? 0 : 3));
      this.potatoRow(lanes[2], z, 6);
      length = 14;
    } else if (roll < 0.79) {
      // gate to slide under, potatoes low in the same lane
      this.add("gate", lanes[0], z + 4);
      this.add("potato", lanes[0], z + 3.2);
      this.add("potato", lanes[0], z + 4.8);
      if (hard > 0.3) this.add(this.pick(low), lanes[1], z + 4);
      this.potatoRow(lanes[2], z + 1, 4);
      length = 12;
    } else if (roll < 0.92) {
      // tractor (or a crate wall indoors) blocks a lane, low obstacle in another, third is free
      this.add(indoor ? "gate" : "tractor", lanes[0], z + 5);
      if (hard > 0.15) this.add(this.pick(low), lanes[1], z + 5 + (this.rng() < 0.5 ? -2 : 2));
      this.potatoRow(lanes[2], z, 6);
      length = 15;
    } else {
      // the wall: every lane needs an action (only once the run is under way)
      if (hard > 0.35) {
        this.add(indoor ? "crate" : "tractor", lanes[0], z + 5);
        this.add("gate", lanes[1], z + 5);
        this.add(this.pick(low), lanes[2], z + 5);
        this.potatoArc(lanes[2], z + 5);
      } else {
        this.add(this.pick(low), lanes[0], z + 4);
        this.potatoRow(lanes[1], z, 5);
      }
      length = 15;
    }

    // deliveries: a parcel on the ground in a free lane every ~90-140 m
    if (d >= this.nextBoxAt) {
      this.add("box", lanes[2], z + length + 3);
      this.nextBoxAt = d + 90 + this.rng() * 50;
      length += 5;
    }
    // power-ups every ~110-170 m, floating a little above the road
    if (d >= this.nextPowerAt) {
      const kind = this.pick<PowerKind>(["magnet", "shield", "boost"]);
      this.add(kind, lanes[1], z + length + 4, 0.5);
      this.nextPowerAt = d + 110 + this.rng() * 60;
      length += 6;
    }

    const gap = Math.max(9, 15 - hard * 5 + this.rng() * 7);
    this.nextSpawnZ = z + length + gap;
  }

  private spawnProps() {
    const z = this.nextPropZ;
    const r = this.rng();
    const side = (this.rng() < 0.5 ? -1 : 1) as -1 | 1;
    const indoor = z >= STORAGE_M;
    if (indoor) {
      // shelving is painted into the backdrop; a few crate stacks line the aisle
      if (r < 0.5) this.props.push({ id: ++this.uid, kind: "crateside", side, offset: 4.2 + this.rng() * 0.6, z: z + 1 - this.distance, scale: 1 + this.rng() * 0.4 });
    } else if (r < 0.55) this.props.push({ id: ++this.uid, kind: "tree", side, offset: 5.5 + this.rng() * 3, z: z + 1 - this.distance, scale: 0.85 + this.rng() * 0.4 });
    else if (r < 0.72) this.props.push({ id: ++this.uid, kind: "hayside", side, offset: 4.3 + this.rng(), z: z + 1 - this.distance, scale: 1 });
    else if (r < 0.86) this.props.push({ id: ++this.uid, kind: "crateside", side, offset: 4.3 + this.rng(), z: z + 1 - this.distance, scale: 1 });
    else if (r < 0.93) this.props.push({ id: ++this.uid, kind: "sign", side, offset: 4.6, z: z + 1 - this.distance, scale: 1 });
    this.nextPropZ = z + 4.2;
  }
}

export function isPickup(kind: EntityKind): kind is PickupKind {
  return kind === "potato" || kind === "star" || kind === "box";
}

export function isPower(kind: EntityKind): kind is PowerKind {
  return kind === "magnet" || kind === "shield" || kind === "boost";
}

export function isObstacle(kind: EntityKind): kind is ObstacleKind {
  return kind in OBSTACLES;
}
