import { gsap } from "gsap";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from "pixi.js";
import { haptic, sounds } from "@/components/crush/render/sound";
import { DRAW_DISTANCE, LANE_M, OBSTACLES, PICKUPS, PROPS, ROAD_HALF_M, isObstacle, isPickup, isPower, type RunEvent, type RunGame } from "../engine/run";

const ART = "/games/run";
/** Frames of the looping run cycle (contact → down → passing → up → air, both legs), cut from a rendered clip. */
export const RUN_FRAMES = 16;
const RUN_NAMES = Array.from({ length: RUN_FRAMES }, (_, i) => `run-${String(i).padStart(2, "0")}`);
const TEX_NAMES = [...RUN_NAMES, "jump", "slide", "crate", "hay", "barrier", "tractor", "gate", "puddle", "ramp", "potato", "star", "box", "magnet", "shield", "boost", "tree", "sign"] as const;
type TexName = string;

/** Backdrop image sizes and where their own horizon / vanishing point sits (fraction of height). */
const BG_FARM = { w: 1344, h: 752, horizon: 0.5 };
const BG_COLD = { w: 1344, h: 752, horizon: 0.58 };

export type RunRendererOptions = {
  fontFamily?: string;
  onFrame?: (game: RunGame) => void;
  onEvents?: (events: RunEvent[]) => void;
};

type Particle = { g: Graphics; vx: number; vy: number; life: number; max: number; grow: number };

const FARM = { field: [0x63b445, 0x58a63d], far: 0x5aa83a, road: [0xc08d4c, 0xb7823f], farRoad: 0xb98442, verge: [0x7ccb52, 0x6fbe47], rail: 0xf6f6f2, post: 0xffffff, track: 0x8c5a2b };
const COLD = { field: [0x9aa4b2, 0x8e98a6], far: 0x8f99a7, road: [0x4a515e, 0x414855], farRoad: 0x454c59, verge: [0xb5bdc9, 0xa9b1bd], rail: 0x6f7886, post: 0x8b94a2, track: 0x2b303a };

function lerpColor(a: number, b: number, t: number) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return ((ar + (br - ar) * t) << 16) | ((ag + (bg - ag) * t) << 8) | (ab + (bb - ab) * t);
}

/**
 * Pseudo-3D renderer: a painted horizon (farm, then cold storage), a
 * procedurally drawn perspective road that scrolls toward the camera,
 * billboard sprites projected by depth, and a four-pose runner with
 * procedural bob / lean / squash plus power-up effects.
 */
export class RunRenderer {
  private app = new Application();
  private host: HTMLElement;
  private opts: RunRendererOptions;
  private tex = new Map<TexName, Texture>();
  private game: RunGame | null = null;

  private world = new Container();
  private bgFarm = new Sprite();
  private bgCold = new Sprite();
  private ground = new Graphics();
  private glow = new Graphics();
  private scene = new Container();
  private fx = new Container();
  private streaks = new Graphics();
  private flash = new Graphics();

  private nodes = new Map<number, Sprite>();
  private player = new Container();
  private playerFx = new Graphics();
  private playerSprite = new Sprite();
  private shadow = new Graphics();
  private particles: Particle[] = [];

  private W = 0;
  private H = 0;
  private shake = 0;
  private flashAlpha = 0;
  private flashColor = 0xff3b3b;
  private lastStep = 0;
  private time = 0;
  private landSquash = 0;
  private tumble = 0;
  private ready = false;
  private streakSeeds = Array.from({ length: 12 }, (_, i) => ({ x: (i * 0.37) % 1, y: (i * 0.61) % 1 }));

  // camera (fractions of the viewport height / metres)
  private readonly horizonF = 0.4;
  private readonly camZ = -5;
  private readonly camH = 3.0;
  private readonly focalF = 0.5;
  /** The runner is drawn a little taller than its collision height so it reads like the mockup. */
  private readonly playerDrawH = 2.3;

  constructor(host: HTMLElement, opts: RunRendererOptions = {}) {
    this.host = host;
    this.opts = opts;
  }

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  async init() {
    const [farmTex, coldTex, ...list] = await Promise.all([
      Assets.load<Texture>(`${ART}/farm.jpg`),
      Assets.load<Texture>(`${ART}/cold.jpg`),
      ...TEX_NAMES.map((n) => Assets.load<Texture>(`${ART}/${n}.webp`)),
    ]);
    TEX_NAMES.forEach((n, i) => this.tex.set(n, list[i]));

    await this.app.init({
      resizeTo: this.host,
      backgroundColor: 0x8fd0ff,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      preference: "webgl",
    });
    if (!this.host.isConnected) {
      this.app.destroy(true, { children: true });
      return;
    }
    this.host.appendChild(this.app.canvas);
    this.app.canvas.style.touchAction = "none";

    this.bgFarm.texture = farmTex;
    this.bgFarm.anchor.set(0.5, 0);
    this.bgCold.texture = coldTex;
    this.bgCold.anchor.set(0.5, 0);
    this.bgCold.alpha = 0;
    this.scene.sortableChildren = true;
    this.player.zIndex = 0;
    this.playerSprite.anchor.set(0.5, 1);
    this.player.addChild(this.shadow, this.playerSprite, this.playerFx);
    this.scene.addChild(this.player);
    this.world.addChild(this.bgFarm, this.bgCold, this.ground, this.glow, this.scene, this.fx, this.streaks);
    this.app.stage.addChild(this.world, this.flash);

    this.app.ticker.add(this.tick);
    this.ready = true;
  }

  setGame(game: RunGame) {
    this.game = game;
    for (const n of this.nodes.values()) n.destroy();
    this.nodes.clear();
  }

  destroy() {
    this.ready = false;
    this.app.ticker.remove(this.tick);
    for (const p of this.particles) p.g.destroy();
    this.particles = [];
    for (const n of this.nodes.values()) n.destroy();
    this.nodes.clear();
    this.app.destroy(true, { children: true });
  }

  /* ---------------------------------------------------------------- */
  /*  Projection                                                       */
  /* ---------------------------------------------------------------- */

  private get horizonY() {
    return this.H * this.horizonF;
  }

  /** World (metres lateral, metres up, metres ahead of player) -> screen. */
  private project(xm: number, ym: number, z: number) {
    const d = z - this.camZ;
    const s = (this.H * this.focalF) / Math.max(0.35, d);
    return { x: this.W / 2 + xm * s, y: this.horizonY + (this.camH - ym) * s, s, d };
  }

  /* ---------------------------------------------------------------- */
  /*  Frame                                                            */
  /* ---------------------------------------------------------------- */

  private tick = () => {
    if (!this.ready || !this.game) return;
    const dt = Math.min(0.05, this.app.ticker.deltaMS / 1000);
    const g = this.game;
    this.W = this.app.screen.width;
    this.H = this.app.screen.height;
    if (!g.paused) this.time += dt;

    g.step(dt);
    if (g.events.length) {
      const events = g.events;
      g.events = [];
      this.handleEvents(events);
      this.opts.onEvents?.(events);
    }

    const blend = g.storageBlend;
    this.drawBackdrop(g, blend);
    this.drawGround(g, blend);
    this.drawGlow(g);
    this.drawEntities(g);
    this.drawPlayer(g, dt);
    this.updateParticles(dt, g);
    this.drawStreaks(g, dt);

    // camera pans a little toward the runner's lane, plus shake
    this.shake = Math.max(0, this.shake - dt * 30);
    this.world.position.set((Math.random() - 0.5) * this.shake - g.x * this.W * 0.06, (Math.random() - 0.5) * this.shake);
    this.flashAlpha = Math.max(0, this.flashAlpha - dt * 2.2);
    this.flash.clear();
    if (this.flashAlpha > 0) this.flash.rect(0, 0, this.W, this.H).fill({ color: this.flashColor, alpha: this.flashAlpha });

    this.opts.onFrame?.(g);
  };

  private placeBackdrop(sp: Sprite, bg: { w: number; h: number; horizon: number }, g: RunGame) {
    const scale = Math.max(this.horizonY / (bg.h * bg.horizon), (this.W * 1.12) / bg.w);
    sp.scale.set(scale);
    const bob = g.state === "run" ? Math.abs(Math.sin(g.stride * Math.PI)) * 2 : 0;
    sp.position.set(this.W / 2 - g.x * 14, this.horizonY - bg.h * bg.horizon * scale - bob);
  }

  private drawBackdrop(g: RunGame, blend: number) {
    this.placeBackdrop(this.bgFarm, BG_FARM, g);
    this.placeBackdrop(this.bgCold, BG_COLD, g);
    this.bgCold.alpha = blend;
    this.bgFarm.visible = blend < 1;
    this.bgCold.visible = blend > 0;
  }

  private drawGround(g: RunGame, blend: number) {
    const gr = this.ground;
    gr.clear();
    const hy = this.horizonY;
    const P = {
      field: [lerpColor(FARM.field[0], COLD.field[0], blend), lerpColor(FARM.field[1], COLD.field[1], blend)],
      far: lerpColor(FARM.far, COLD.far, blend),
      road: [lerpColor(FARM.road[0], COLD.road[0], blend), lerpColor(FARM.road[1], COLD.road[1], blend)],
      farRoad: lerpColor(FARM.farRoad, COLD.farRoad, blend),
      verge: [lerpColor(FARM.verge[0], COLD.verge[0], blend), lerpColor(FARM.verge[1], COLD.verge[1], blend)],
      rail: lerpColor(FARM.rail, COLD.rail, blend),
      post: lerpColor(FARM.post, COLD.post, blend),
      track: lerpColor(FARM.track, COLD.track, blend),
    };
    // far fill up to the horizon
    gr.rect(-this.W * 0.12, hy - 2, this.W * 1.24, this.H - hy + 2).fill(P.far);
    const farRoad = this.project(0, 0, DRAW_DISTANCE);
    gr.poly([this.W / 2 - ROAD_HALF_M * farRoad.s, farRoad.y, this.W / 2 + ROAD_HALF_M * farRoad.s, farRoad.y, this.W / 2 + 0.4, hy, this.W / 2 - 0.4, hy]).fill(P.farRoad);

    // scrolling bands: 4 m each, phase-locked to the distance run
    const band = 4;
    const phase = g.distance % band;
    for (let z = -band - phase; z < DRAW_DISTANCE; z += band) {
      const near = this.project(0, 0, z);
      const far = this.project(0, 0, z + band);
      if (near.d <= 0.4) continue;
      const idx = Math.floor((z + phase + g.distance) / band + 0.5);
      const even = idx % 2 === 0;
      const yN = Math.min(near.y, this.H + 40);
      gr.rect(-this.W * 0.12, far.y, this.W * 1.24, yN - far.y).fill(even ? P.field[0] : P.field[1]);
      gr.poly([this.W / 2 - ROAD_HALF_M * near.s, yN, this.W / 2 + ROAD_HALF_M * near.s, yN, this.W / 2 + ROAD_HALF_M * far.s, far.y, this.W / 2 - ROAD_HALF_M * far.s, far.y]).fill(even ? P.road[0] : P.road[1]);
      const vw = 0.35;
      gr.poly([this.W / 2 - (ROAD_HALF_M + vw) * near.s, yN, this.W / 2 - ROAD_HALF_M * near.s, yN, this.W / 2 - ROAD_HALF_M * far.s, far.y, this.W / 2 - (ROAD_HALF_M + vw) * far.s, far.y]).fill(even ? P.verge[0] : P.verge[1]);
      gr.poly([this.W / 2 + (ROAD_HALF_M + vw) * near.s, yN, this.W / 2 + ROAD_HALF_M * near.s, yN, this.W / 2 + ROAD_HALF_M * far.s, far.y, this.W / 2 + (ROAD_HALF_M + vw) * far.s, far.y]).fill(even ? P.verge[0] : P.verge[1]);
    }
    // faint tyre tracks (farm) / conveyor edge lines (storage) along the lane borders
    const n0 = this.project(0, 0, -3);
    const f0 = this.project(0, 0, DRAW_DISTANCE);
    for (const lx of [-LANE_M * 0.5, LANE_M * 0.5]) {
      gr.poly([this.W / 2 + (lx - 0.09) * n0.s, n0.y, this.W / 2 + (lx + 0.09) * n0.s, n0.y, this.W / 2 + (lx + 0.03) * f0.s, f0.y, this.W / 2 + (lx - 0.03) * f0.s, f0.y]).fill({ color: P.track, alpha: 0.22 + blend * 0.3 });
    }
    // indoors: conveyor rollers across the belt
    if (blend > 0) {
      const gap = 1.2;
      const ph = g.distance % gap;
      for (let z = -2 - ph; z < 40; z += gap) {
        const pr = this.project(0, 0, z);
        if (pr.d <= 0.4) continue;
        gr.rect(this.W / 2 - ROAD_HALF_M * pr.s, pr.y - 1, ROAD_HALF_M * 2 * pr.s, Math.max(1, 0.05 * pr.s)).fill({ color: 0x1d2129, alpha: 0.35 * blend });
      }
    }

    // fence: two rails converging to the horizon plus posts every 3 m
    const fx = ROAD_HALF_M + 0.55;
    const nf = this.project(0, 0, -2);
    const ff = this.project(0, 0, DRAW_DISTANCE);
    for (const side of [-1, 1]) {
      for (const [h, t] of [
        [0.55, 0.07],
        [0.95, 0.07],
      ]) {
        gr.poly([this.W / 2 + side * fx * nf.s, nf.y - h * nf.s, this.W / 2 + side * fx * nf.s, nf.y - (h + t) * nf.s, this.W / 2 + side * fx * ff.s, ff.y - (h + t) * ff.s, this.W / 2 + side * fx * ff.s, ff.y - h * ff.s]).fill({ color: P.rail, alpha: 0.95 });
      }
    }
    const postGap = 3;
    const postPhase = g.distance % postGap;
    for (let z = -2 - postPhase; z < DRAW_DISTANCE; z += postGap) {
      const pr = this.project(0, 0, z);
      if (pr.d <= 0.4) continue;
      const w = Math.max(1.5, 0.14 * pr.s);
      const h = 1.15 * pr.s;
      for (const side of [-1, 1]) {
        const x = this.W / 2 + side * fx * pr.s;
        gr.rect(x - w / 2, pr.y - h, w, h).fill(P.post);
        gr.rect(x - w / 2, pr.y - h, w, h * 0.12).fill({ color: 0x000000, alpha: 0.12 });
      }
    }
  }

  /** Glow effects under sprites: boost lane, power-up halos. */
  private drawGlow(g: RunGame) {
    const gl = this.glow;
    gl.clear();
    if (g.boostT > 0) {
      const a = this.project((g.x - 0.45) * LANE_M, 0, -1.5);
      const b = this.project((g.x + 0.45) * LANE_M, 0, -1.5);
      const c = this.project((g.x + 0.45) * LANE_M, 0, 16);
      const d = this.project((g.x - 0.45) * LANE_M, 0, 16);
      gl.poly([a.x, a.y, b.x, b.y, c.x, c.y, d.x, d.y]).fill({ color: 0x4fd6ff, alpha: 0.32 });
      const ph = (this.time * 6) % 3;
      for (let i = 0; i < 6; i++) {
        const z = i * 3 - ph + 0.5;
        const p0 = this.project((g.x - 0.3) * LANE_M, 0, z);
        const p1 = this.project(g.x * LANE_M, 0, z + 1);
        const p2 = this.project((g.x + 0.3) * LANE_M, 0, z);
        if (p0.d <= 0.5) continue;
        gl.moveTo(p0.x, p0.y).lineTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke({ color: 0xffffff, alpha: 0.55, width: Math.max(2, 0.08 * p1.s) });
      }
    }
    for (const e of g.entities) {
      if (e.taken || !isPower(e.kind)) continue;
      const pr = this.project(e.lane * LANE_M, e.y, e.z);
      if (pr.d <= 0.6) continue;
      const r = (0.55 + Math.sin(this.time * 5 + e.id) * 0.06) * pr.s;
      const color = e.kind === "magnet" ? 0xb46bff : e.kind === "shield" ? 0x4fd6ff : 0x9dff5c;
      gl.circle(pr.x, pr.y - 0.45 * pr.s, r).fill({ color, alpha: 0.28 });
      gl.circle(pr.x, pr.y - 0.45 * pr.s, r * 0.72).stroke({ color: 0xffffff, alpha: 0.5, width: 2 });
    }
  }

  private spriteFor(id: number, name: TexName): Sprite {
    let sp = this.nodes.get(id);
    if (!sp) {
      sp = new Sprite(this.tex.get(name));
      sp.anchor.set(0.5, 1);
      this.nodes.set(id, sp);
      this.scene.addChild(sp);
    }
    return sp;
  }

  private drawEntities(g: RunGame) {
    const seen = new Set<number>();
    for (const p of g.props) {
      const info = PROPS[p.kind];
      const name: TexName = p.kind === "hayside" ? "hay" : p.kind === "crateside" ? "crate" : p.kind === "fence" ? "sign" : p.kind;
      const pr = this.project(p.side * p.offset, 0, p.z);
      if (pr.d <= 0.6) continue;
      seen.add(p.id);
      const sp = this.spriteFor(p.id, name);
      const h = info.h * p.scale * pr.s;
      sp.scale.set(h / sp.texture.height);
      sp.position.set(pr.x, pr.y);
      sp.rotation = 0;
      sp.zIndex = -p.z;
      sp.alpha = Math.min(1, (DRAW_DISTANCE - p.z) / 12);
    }
    for (const e of g.entities) {
      if (e.taken) continue;
      const xLane = isPickup(e.kind) ? g.entityX(e) : e.lane;
      const pr = this.project(xLane * LANE_M, e.y, e.z);
      if (pr.d <= 0.6) continue;
      seen.add(e.id);
      const sp = this.spriteFor(e.id, e.kind);
      if (isPickup(e.kind)) {
        const size = PICKUPS[e.kind].size * pr.s;
        const bob = Math.sin(this.time * 5 + e.id) * 0.06 * pr.s;
        const pulse = e.kind === "star" ? 1 + Math.sin(this.time * 8 + e.id) * 0.08 : 1;
        sp.scale.set((size / sp.texture.height) * pulse);
        sp.position.set(pr.x, pr.y - bob + size * 0.15);
        sp.rotation = e.kind === "box" ? 0 : Math.sin(this.time * 3 + e.id) * 0.15;
      } else if (isPower(e.kind)) {
        const size = 0.95 * pr.s;
        const bob = Math.sin(this.time * 4 + e.id) * 0.08 * pr.s;
        sp.scale.set(size / sp.texture.height);
        sp.position.set(pr.x, pr.y - bob + size * 0.5);
        sp.rotation = Math.sin(this.time * 2 + e.id) * 0.12;
      } else if (e.kind === "ramp") {
        sp.scale.set((0.95 * pr.s) / sp.texture.height);
        sp.position.set(pr.x, pr.y + 0.02 * pr.s);
        sp.rotation = 0;
      } else if (e.kind === "puddle") {
        const w = OBSTACLES.puddle.w * pr.s;
        const k = w / sp.texture.width;
        sp.scale.set(k, k * 0.42);
        sp.position.set(pr.x, pr.y + 0.02 * pr.s);
        sp.rotation = 0;
      } else if (isObstacle(e.kind)) {
        const info = OBSTACLES[e.kind];
        sp.scale.set((info.h * pr.s) / sp.texture.height);
        sp.position.set(pr.x, pr.y + (e.kind === "gate" ? 0 : 0.02 * pr.s));
        sp.rotation = 0;
      }
      sp.zIndex = -e.z;
      sp.alpha = Math.min(1, (DRAW_DISTANCE - e.z) / 12);
    }
    for (const [id, sp] of this.nodes) {
      if (!seen.has(id)) {
        sp.destroy();
        this.nodes.delete(id);
      }
    }
  }

  private drawPlayer(g: RunGame, dt: number) {
    const pr = this.project(g.x * LANE_M, 0, 0);
    const run0 = this.tex.get(RUN_NAMES[0])!;
    const charScale = (this.playerDrawH * pr.s) / run0.height;

    // pose: the 16-frame cycle is indexed by the fractional stride (one stride = one full left+right cycle)
    let name: TexName = RUN_NAMES[0];
    if (g.state === "jump") name = "jump";
    else if (g.state === "slide" || g.state === "crash") name = "slide";
    else {
      const phase = ((g.stride % 1) + 1) % 1;
      name = RUN_NAMES[Math.min(RUN_FRAMES - 1, Math.floor(phase * RUN_FRAMES))];
    }
    const tex = this.tex.get(name)!;
    if (this.playerSprite.texture !== tex) this.playerSprite.texture = tex;

    // footsteps -> dust
    const step = Math.floor(g.stride * 2);
    if (step !== this.lastStep && g.state === "run" && !g.paused) {
      this.lastStep = step;
      this.puff(pr.x + (step % 2 === 0 ? -8 : 8), pr.y, g.boostT > 0 ? 4 : 2, pr.s);
    }

    // the frames already carry the body bob; add only a touch so the whole silhouette breathes with speed
    const bob = g.state === "run" ? Math.abs(Math.sin(g.stride * Math.PI * 2)) * 0.02 * pr.s : 0;
    const airY = g.y * pr.s;
    const lean = (g.lane - g.x) * -0.32;
    this.landSquash = Math.max(0, this.landSquash - dt * 5);
    if (g.state === "crash") this.tumble = Math.min(1, this.tumble + dt * 1.4);
    else this.tumble = 0;
    // crash: knocked back toward the camera with a hop, wobble and a puff
    const t = this.tumble;
    const crashHop = Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.55 * pr.s;
    const crashScale = 1 + Math.sin(Math.min(1, t * 1.6) * Math.PI) * 0.18;
    const crashRot = Math.sin(t * Math.PI * 2) * 0.35 * (g.x >= 0 ? 1 : -1);
    // lean forward a little more as the pace picks up
    const boostLean = (g.boostT > 0 ? -0.06 : 0) - Math.max(0, g.speed - 9) * 0.006;

    this.player.position.set(pr.x, pr.y + t * 0.25 * pr.s);
    this.playerSprite.scale.set(charScale * crashScale * (1 + this.landSquash * 0.18), charScale * crashScale * (1 - this.landSquash * 0.22));
    this.playerSprite.position.set(0, -bob - airY - crashHop);
    this.playerSprite.rotation = lean + (g.state === "jump" ? -0.08 : 0) + crashRot + boostLean;
    this.playerSprite.tint = g.state === "stumble" && Math.floor(this.time * 18) % 2 === 0 ? 0xff9a9a : 0xffffff;
    this.playerSprite.alpha = g.invuln > 0 && g.state !== "stumble" && g.boostT <= 0 && Math.floor(this.time * 14) % 2 === 0 ? 0.55 : 1;

    // shadow shrinks while airborne
    const sh = this.shadow;
    sh.clear();
    const shrink = 1 / (1 + g.y * 0.9);
    sh.ellipse(0, -0.02 * pr.s, 0.5 * pr.s * shrink, 0.16 * pr.s * shrink).fill({ color: 0x000000, alpha: 0.32 * shrink });

    // power-up auras around the runner
    const pf = this.playerFx;
    pf.clear();
    const cy = -bob - airY - this.playerDrawH * 0.5 * pr.s;
    if (g.shield) {
      const r = (this.playerDrawH * 0.62 + Math.sin(this.time * 4) * 0.03) * pr.s;
      pf.circle(0, cy, r).fill({ color: 0x4fd6ff, alpha: 0.16 });
      pf.circle(0, cy, r).stroke({ color: 0x9fe9ff, alpha: 0.8, width: 3 });
      pf.ellipse(-r * 0.35, cy - r * 0.45, r * 0.22, r * 0.1).fill({ color: 0xffffff, alpha: 0.5 });
    }
    if (g.magnetT > 0) {
      const ph = (this.time * 2.2) % 1;
      for (let i = 0; i < 2; i++) {
        const k = (ph + i * 0.5) % 1;
        const r = (0.6 + k * 1.3) * pr.s;
        pf.ellipse(0, -0.02 * pr.s, r, r * 0.34).stroke({ color: 0xc58bff, alpha: 0.7 * (1 - k), width: 3 });
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Effects                                                          */
  /* ---------------------------------------------------------------- */

  private handleEvents(events: RunEvent[]) {
    const g = this.game!;
    for (const ev of events) {
      switch (ev.type) {
        case "pickup": {
          const pr = this.project(g.x * LANE_M, ev.y, 0);
          if (ev.kind === "potato") {
            sounds.play("coin");
            this.sparkle(pr.x, pr.y - 0.3 * pr.s, 0xffd23f, 6);
            this.pop(pr.x, pr.y - 0.6 * pr.s, ev.combo >= 5 ? `+1  x${ev.combo}` : "+1", ev.combo >= 5 ? 0xffd23f : 0xfff3a8, ev.combo >= 5 ? 26 : 24);
          } else if (ev.kind === "star") {
            sounds.play("special");
            haptic(12);
            this.sparkle(pr.x, pr.y - 0.3 * pr.s, 0xfff176, 14);
            this.pop(pr.x, pr.y - 0.7 * pr.s, "+1 PB", 0xffd23f, 30);
          } else {
            sounds.play("party");
            haptic([10, 20, 10]);
            this.sparkle(pr.x, pr.y - 0.3 * pr.s, 0x7cff9a, 16);
            this.pop(pr.x, pr.y - 0.8 * pr.s, "Delivered!", 0x9cffb0, 28);
          }
          break;
        }
        case "power": {
          sounds.play("special");
          haptic([12, 20, 12]);
          const pr = this.project(g.x * LANE_M, 0.5, 0);
          const color = ev.kind === "magnet" ? 0xc58bff : ev.kind === "shield" ? 0x9fe9ff : 0xc6ff7a;
          this.sparkle(pr.x, pr.y - 0.4 * pr.s, color, 20);
          this.pop(pr.x, pr.y - 1.2 * pr.s, ev.kind === "magnet" ? "MAGNET!" : ev.kind === "shield" ? "SHIELD!" : "SPEED BOOST!", color, 30);
          if (ev.kind === "boost") {
            this.flashColor = 0x4fd6ff;
            this.flashAlpha = 0.25;
          }
          break;
        }
        case "powerEnd":
          sounds.play("ui");
          break;
        case "shieldBreak": {
          sounds.play("bomb");
          haptic([30, 30]);
          this.flashColor = 0x4fd6ff;
          this.flashAlpha = 0.35;
          this.shake = 8;
          const pr = this.project(g.x * LANE_M, 0.8, 0);
          this.sparkle(pr.x, pr.y, 0x9fe9ff, 22);
          this.pop(pr.x, pr.y - 1.2 * pr.s, "Shield saved you!", 0x9fe9ff, 24);
          break;
        }
        case "smash": {
          sounds.play("bomb");
          haptic(20);
          this.shake = 6;
          const pr = this.project(ev.lane * LANE_M, 0.6, 0.5);
          this.sparkle(pr.x, pr.y, 0xd9b27a, 18);
          this.puff(pr.x, pr.y + 0.6 * pr.s, 8, pr.s);
          break;
        }
        case "ramp": {
          sounds.play("swap");
          haptic(10);
          const pr = this.project(g.x * LANE_M, 0, 0);
          this.puff(pr.x, pr.y, 10, pr.s);
          this.pop(pr.x, pr.y - 2.4 * pr.s, "Big air!", 0xffffff, 24);
          break;
        }
        case "jump":
          sounds.play("pop");
          break;
        case "land": {
          this.landSquash = 1;
          const pr = this.project(g.x * LANE_M, 0, 0);
          this.puff(pr.x, pr.y, 5, pr.s);
          break;
        }
        case "slide":
          sounds.play("swap");
          break;
        case "stumble": {
          sounds.play("invalid");
          haptic([30, 30, 30]);
          this.shake = 9;
          this.flashColor = 0xff3b3b;
          this.flashAlpha = 0.28;
          const pr = this.project(g.x * LANE_M, 0, 0);
          if (ev.kind === "puddle") this.splash(pr.x, pr.y, pr.s);
          else this.puff(pr.x, pr.y, 8, pr.s);
          this.pop(pr.x, pr.y - 1.9 * pr.s, ev.kind === "puddle" ? "Splash!" : "Ouch!", 0xff8a80, 26);
          break;
        }
        case "crash": {
          sounds.play("lose");
          haptic([60, 40, 80]);
          this.shake = 18;
          this.flashColor = 0xff3b3b;
          this.flashAlpha = 0.45;
          const pr = this.project(g.x * LANE_M, 0, 0);
          this.puff(pr.x, pr.y, 14, pr.s);
          break;
        }
        case "milestone":
          sounds.play("win");
          break;
        case "section":
          if (ev.perfect) sounds.play("special");
          break;
        case "mission":
          sounds.play("party");
          haptic([15, 30, 15]);
          break;
        case "finish": {
          sounds.play("win");
          haptic([20, 40, 20, 40, 60]);
          const pr = this.project(g.x * LANE_M, 0, 0);
          for (let i = 0; i < 4; i++) this.sparkle(pr.x + (i - 1.5) * 40, pr.y - (1 + i * 0.3) * pr.s, [0xffd23f, 0xc58bff, 0x7cff9a, 0x4fd6ff][i], 16);
          break;
        }
        default:
          break;
      }
    }
  }

  private puff(x: number, y: number, n: number, s: number) {
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      const r = (3 + Math.random() * 4) * (s / 100);
      g.circle(0, 0, r).fill({ color: 0xd9b27a, alpha: 0.75 });
      g.position.set(x + (Math.random() - 0.5) * 0.4 * s, y - Math.random() * 4);
      this.fx.addChild(g);
      this.particles.push({ g, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 60, life: 0, max: 0.45 + Math.random() * 0.25, grow: 2.2 });
    }
  }

  private splash(x: number, y: number, s: number) {
    for (let i = 0; i < 16; i++) {
      const g = new Graphics();
      const r = (2 + Math.random() * 3) * (s / 100);
      g.circle(0, 0, r).fill({ color: 0x7a5a3a, alpha: 0.85 });
      g.position.set(x, y - 4);
      this.fx.addChild(g);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
      const v = 120 + Math.random() * 160;
      this.particles.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 0.45 + Math.random() * 0.3, grow: 0.4 });
    }
  }

  private sparkle(x: number, y: number, color: number, n: number) {
    for (let i = 0; i < n; i++) {
      const g = new Graphics();
      const r = 2 + Math.random() * 3;
      g.star(0, 0, 4, r * 1.6, r * 0.6).fill({ color, alpha: 0.95 });
      g.position.set(x, y);
      this.fx.addChild(g);
      const a = Math.random() * Math.PI * 2;
      const v = 80 + Math.random() * 140;
      this.particles.push({ g, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: 0.4 + Math.random() * 0.3, grow: 0.2 });
    }
  }

  private pop(x: number, y: number, text: string, fill: number, size = 24) {
    const t = new Text({
      text,
      style: { fontFamily: this.opts.fontFamily ?? "Fredoka, sans-serif", fontSize: size, fontWeight: "900", fill, stroke: { color: 0x3a2109, width: 5 }, align: "center" },
    });
    t.anchor.set(0.5, 1);
    t.position.set(x, y);
    t.scale.set(0.6);
    this.fx.addChild(t);
    gsap.timeline({ onComplete: () => t.destroy() })
      .to(t.scale, { x: 1.1, y: 1.1, duration: 0.18, ease: "back.out(2.5)" })
      .to(t, { y: y - 70, duration: 0.7, ease: "power2.out" }, 0)
      .to(t, { alpha: 0, duration: 0.3 }, 0.55);
  }

  private updateParticles(dt: number, g: RunGame) {
    if (g.paused) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      const t = p.life / p.max;
      p.g.position.x += p.vx * dt;
      p.g.position.y += p.vy * dt;
      p.vy += 120 * dt;
      p.g.scale.set(1 + t * p.grow);
      p.g.alpha = 1 - t;
      if (t >= 1) {
        p.g.destroy();
        this.particles.splice(i, 1);
      }
    }
  }

  private drawStreaks(g: RunGame, dt: number) {
    const st = this.streaks;
    st.clear();
    const intensity = Math.max(0, (g.speed - 13) / 8) + (g.boostT > 0 ? 1.2 : 0);
    if (intensity <= 0 || g.paused) return;
    for (const s of this.streakSeeds) {
      s.y = (s.y + dt * (2.2 + intensity * 2)) % 1;
      const edge = s.x < 0.5 ? s.x * 0.22 : 1 - (1 - s.x) * 0.22;
      const x = edge * this.W;
      const y = this.horizonY + s.y * (this.H - this.horizonY);
      const len = 30 + s.y * 90 * intensity;
      st.moveTo(x, y).lineTo(x + (edge < 0.5 ? -8 : 8), y + len).stroke({ color: g.boostT > 0 ? 0xbff3ff : 0xffffff, alpha: Math.min(0.5, 0.18 * intensity) * s.y, width: 2 });
    }
  }
}
