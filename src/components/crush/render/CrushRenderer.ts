import { gsap } from "gsap";
import {
  Application,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type FederatedPointerEvent,
  type Ticker,
} from "pixi.js";
import { tileArt, type TileArt } from "../engine/levels";
import type {
  BlockerHit,
  BoardSnapshot,
  FiredSpecial,
  LevelDef,
  Pos,
  Special,
  Step,
} from "../engine/types";
import { sounds, haptic } from "./sound";
import {
  TEX_SIZE,
  drawBeam,
  drawBomb,
  drawButter,
  drawCrate,
  drawIce,
  drawRing,
  drawSelectRing,
  drawSoftCircle,
  drawSoil,
  drawSparkle,
  drawTile,
} from "./textures";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const UNIT = 100; // board units per cell; root is scaled to fit the host
const TILE_S = (UNIT * 0.94) / TEX_SIZE; // sprite scale for a tile texture
const CELL_S = UNIT / TEX_SIZE;

export interface RendererEvents {
  onSwapRequest: (a: Pos, b: Pos) => void;
  onTap: (pos: Pos) => void;
  onInteract: () => void;
}

export interface PlayHooks {
  onClear?: (step: Extract<Step, { type: "clear" }>) => void;
}

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  spin: number;
  gravity: number;
  shrink: boolean;
}

/** A tile on the board: a Container so overlays (sparkles) can be attached. */
class TileNode extends Container {
  img: Sprite;
  spark: Sprite | null = null;

  constructor(texture: Texture) {
    super();
    this.img = new Sprite(texture);
    this.img.anchor.set(0.5);
    this.addChild(this.img);
  }
}

const wait = (seconds: number) =>
  new Promise<void>((resolve) => {
    gsap.delayedCall(seconds, resolve);
  });

function tween(target: object, vars: gsap.TweenVars): Promise<void> {
  return new Promise((resolve) => {
    gsap.to(target, { ...vars, onComplete: resolve });
  });
}

const key = (p: Pos) => `${p.r}:${p.c}`;
const hexToNum = (hex: string) => parseInt(hex.replace("#", ""), 16);

/* ------------------------------------------------------------------ */
/*  Renderer                                                           */
/* ------------------------------------------------------------------ */

export class CrushRenderer {
  private app = new Application();
  private root = new Container();
  private plate = new Graphics();
  private cellsGfx = new Graphics();
  private soilLayer = new Container();
  private tileLayer = new Container();
  private overlayLayer = new Container();
  private fxLayer = new Container();
  private uiLayer = new Container();
  private popLayer = new Container();
  private maskGfx = new Graphics();

  private grid: (number | null)[][] = [];
  private sprites = new Map<number, TileNode>();
  private soilSprites = new Map<string, Sprite>();
  private overlaySprites = new Map<string, Sprite>();
  private tex = new Map<string, Texture>();
  private arts: TileArt[];

  private particles: Particle[] = [];
  private pool: Sprite[] = [];

  private selectRing: Sprite | null = null;
  private selected: Pos | null = null;
  private drag: { start: Pos; x: number; y: number } | null = null;
  private hintTweens: gsap.core.Tween[] = [];
  private hintSprites: TileNode[] = [];

  private readonly W: number;
  private readonly H: number;
  private rows: number;
  private cols: number;
  private fontFamily: string;
  private ready = false;
  private destroyed = false;

  inputEnabled = true;
  targeting = false;

  private activeMask: boolean[][] = [];
  private plateStyle = { color: 0x2b1a5e, alpha: 0.6 };
  private cellAlpha: [number, number] = [0.2, 0.12];

  constructor(
    private host: HTMLElement,
    private level: LevelDef,
    private events: RendererEvents,
    opts: { fontFamily?: string } = {},
  ) {
    this.rows = level.rows;
    this.cols = level.cols;
    this.W = this.cols * UNIT;
    this.H = this.rows * UNIT;
    this.arts = level.tileIds.map(tileArt);
    this.fontFamily = opts.fontFamily ?? "Fredoka, Nunito, system-ui, sans-serif";
  }

  /* ---------------------------------------------------------------- */
  /*  Lifecycle                                                        */
  /* ---------------------------------------------------------------- */

  async init() {
    await this.app.init({
      resizeTo: this.host,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 3),
      autoDensity: true,
      preference: "webgl",
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    const canvas = this.app.canvas;
    canvas.style.touchAction = "none";
    canvas.style.display = "block";
    this.host.appendChild(canvas);

    this.buildTextures();

    this.root.addChild(
      this.plate,
      this.cellsGfx,
      this.soilLayer,
      this.tileLayer,
      this.overlayLayer,
      this.fxLayer,
      this.uiLayer,
      this.popLayer,
      this.maskGfx,
    );
    this.tileLayer.sortableChildren = true;
    this.app.stage.addChild(this.root);

    const stage = this.app.stage;
    stage.eventMode = "static";
    stage.hitArea = this.app.screen;
    stage.on("pointerdown", this.onPointerDown);
    stage.on("pointermove", this.onPointerMove);
    stage.on("pointerup", this.onPointerUp);
    stage.on("pointerupoutside", this.onPointerUp);

    this.app.renderer.on("resize", this.layout);
    this.app.ticker.add(this.tick);
    // Follow the host element's size (Pixi's resizeTo only reacts to window resizes).
    this.resizeObserver = new ResizeObserver(() => this.fitHost());
    this.resizeObserver.observe(this.host);
    this.fitHost();
    this.ready = true;
  }

  private resizeObserver: ResizeObserver | null = null;

  private fitHost() {
    const w = Math.max(1, Math.round(this.host.clientWidth));
    const h = Math.max(1, Math.round(this.host.clientHeight));
    if (this.app.screen.width !== w || this.app.screen.height !== h) {
      this.app.renderer.resize(w, h);
    }
    this.layout();
  }

  destroy() {
    this.destroyed = true;
    if (!this.ready) return;
    this.app.ticker.remove(this.tick);
    this.resizeObserver?.disconnect();
    this.app.renderer.off("resize", this.layout);
    for (const s of this.sprites.values()) {
      gsap.killTweensOf(s);
      gsap.killTweensOf(s.scale);
    }
    this.clearHint();
    this.app.destroy(true, { children: true, texture: true });
  }

  private layout = () => {
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const scale = Math.min(w / this.W, h / this.H);
    this.root.scale.set(scale);
    this.root.position.set((w - this.W * scale) / 2, (h - this.H * scale) / 2);
  };

  private buildTextures() {
    const specials: Special[] = ["none", "stripedH", "stripedV", "wrapped"];
    this.arts.forEach((art, i) => {
      for (const s of specials) this.tex.set(`${i}:${s}`, Texture.from(drawTile(art, s)));
    });
    this.tex.set("bomb", Texture.from(drawBomb()));
    this.tex.set("ice1", Texture.from(drawIce(1)));
    this.tex.set("ice2", Texture.from(drawIce(2)));
    this.tex.set("crate1", Texture.from(drawCrate(1)));
    this.tex.set("crate2", Texture.from(drawCrate(2)));
    this.tex.set("butter", Texture.from(drawButter()));
    this.tex.set("soil1", Texture.from(drawSoil(1)));
    this.tex.set("soil2", Texture.from(drawSoil(2)));
    this.tex.set("dot", Texture.from(drawSoftCircle()));
    this.tex.set("sparkle", Texture.from(drawSparkle()));
    this.tex.set("ring", Texture.from(drawRing()));
    this.tex.set("select", Texture.from(drawSelectRing()));
    this.tex.set("beam", Texture.from(drawBeam()));
  }

  private texFor(kind: number, special: Special): Texture {
    if (special === "bomb" || kind < 0) return this.tex.get("bomb")!;
    return this.tex.get(`${kind}:${special}`) ?? this.tex.get(`0:none`)!;
  }

  /* ---------------------------------------------------------------- */
  /*  Board construction                                               */
  /* ---------------------------------------------------------------- */

  private cx(c: number) {
    return c * UNIT + UNIT / 2;
  }
  private cy(r: number) {
    return r * UNIT + UNIT / 2;
  }

  /** Viewport coordinates of a cell centre (used by tests / debugging). */
  cellCenter(pos: Pos): { x: number; y: number } {
    const g = this.root.toGlobal({ x: this.cx(pos.c), y: this.cy(pos.r) });
    const rect = this.app.canvas.getBoundingClientRect();
    return { x: rect.left + g.x, y: rect.top + g.y };
  }

  setBoard(snap: BoardSnapshot) {
    if (!this.ready) return;
    this.rows = snap.rows;
    this.cols = snap.cols;

    for (const s of this.sprites.values()) s.destroy();
    this.sprites.clear();
    for (const s of this.soilSprites.values()) s.destroy();
    this.soilSprites.clear();
    for (const s of this.overlaySprites.values()) s.destroy();
    this.overlaySprites.clear();
    this.tileLayer.removeChildren();
    this.soilLayer.removeChildren();
    this.overlayLayer.removeChildren();
    this.fxLayer.removeChildren();
    this.popLayer.removeChildren();

    this.grid = [];
    this.plate.clear();
    this.cellsGfx.clear();
    this.maskGfx.clear();

    this.activeMask = snap.cells.map((row) => row.map((cell) => cell.active));
    this.drawPlate();

    for (let r = 0; r < snap.rows; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < snap.cols; c++) {
        const cell = snap.cells[r][c];
        if (!cell.active) {
          row.push(null);
          continue;
        }
        this.maskGfx.roundRect(c * UNIT, r * UNIT, UNIT, UNIT, 14).fill(0xffffff);

        if (cell.soil > 0) this.setSoil({ r, c }, cell.soil);
        if (cell.crate > 0) this.setOverlay({ r, c }, `crate${Math.min(cell.crate, 2)}`);
        else if (cell.butter > 0) this.setOverlay({ r, c }, "butter");
        else if (cell.ice > 0) this.setOverlay({ r, c }, `ice${Math.min(cell.ice, 2)}`);

        if (cell.tile) {
          this.makeSprite(cell.tile.id, cell.tile.kind, cell.tile.special, { r, c });
          row.push(cell.tile.id);
        } else {
          row.push(null);
        }
      }
      this.grid.push(row);
    }
    this.root.mask = this.maskGfx;
  }

  /** Plate + cell backgrounds, redrawn when the theme changes. */
  private drawPlate() {
    this.plate.clear();
    this.cellsGfx.clear();
    for (let r = 0; r < this.activeMask.length; r++) {
      for (let c = 0; c < this.activeMask[r].length; c++) {
        if (!this.activeMask[r][c]) continue;
        this.plate.roundRect(c * UNIT - 6, r * UNIT - 6, UNIT + 12, UNIT + 12, 22);
      }
    }
    this.plate.fill({ color: this.plateStyle.color, alpha: this.plateStyle.alpha });
    for (let r = 0; r < this.activeMask.length; r++) {
      for (let c = 0; c < this.activeMask[r].length; c++) {
        if (!this.activeMask[r][c]) continue;
        const alt = (r + c) % 2 === 0;
        this.cellsGfx
          .roundRect(c * UNIT + 3, r * UNIT + 3, UNIT - 6, UNIT - 6, 16)
          .fill({ color: 0xffffff, alpha: alt ? this.cellAlpha[0] : this.cellAlpha[1] })
          .stroke({ color: 0xffffff, alpha: 0.16, width: 3 });
      }
    }
  }

  setTheme(plate: { color: number; alpha: number }, cellAlpha: [number, number]) {
    this.plateStyle = plate;
    this.cellAlpha = cellAlpha;
    if (this.ready && this.activeMask.length) this.drawPlate();
  }

  private makeSprite(id: number, kind: number, special: Special, at: Pos, y?: number) {
    const sprite = new TileNode(this.texFor(kind, special));
    sprite.scale.set(TILE_S);
    sprite.position.set(this.cx(at.c), y ?? this.cy(at.r));
    this.tileLayer.addChild(sprite);
    this.sprites.set(id, sprite);
    this.decorate(sprite, special);
    return sprite;
  }

  /** Idle shimmer for special tiles. */
  private decorate(sprite: TileNode, special: Special) {
    if (sprite.spark) {
      gsap.killTweensOf(sprite.spark);
      gsap.killTweensOf(sprite.spark.scale);
      sprite.spark.destroy();
      sprite.spark = null;
    }
    gsap.killTweensOf(sprite.img, "rotation");
    sprite.img.rotation = 0;
    if (special === "bomb") {
      gsap.to(sprite.img, { rotation: Math.PI * 2, duration: 6, repeat: -1, ease: "none" });
    } else if (special === "wrapped" || special === "stripedH" || special === "stripedV") {
      const spark = new Sprite(this.tex.get("sparkle")!);
      sprite.spark = spark;
      spark.anchor.set(0.5);
      spark.scale.set(0.9);
      spark.position.set(TEX_SIZE * 0.3, -TEX_SIZE * 0.3);
      spark.alpha = 0.9;
      spark.blendMode = "add";
      sprite.addChild(spark);
      gsap.to(spark, { rotation: Math.PI, duration: 1.6, repeat: -1, ease: "none" });
      gsap.to(spark.scale, {
        x: 0.4,
        y: 0.4,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }

  private setSoil(pos: Pos, level: number) {
    const k = key(pos);
    let s = this.soilSprites.get(k);
    if (!s) {
      s = new Sprite();
      s.anchor.set(0.5);
      s.scale.set(CELL_S);
      s.position.set(this.cx(pos.c), this.cy(pos.r));
      this.soilLayer.addChild(s);
      this.soilSprites.set(k, s);
    }
    s.texture = this.tex.get(level >= 2 ? "soil2" : "soil1")!;
  }

  private setOverlay(pos: Pos, name: string) {
    const k = key(pos);
    let s = this.overlaySprites.get(k);
    if (!s) {
      s = new Sprite();
      s.anchor.set(0.5);
      s.scale.set(CELL_S);
      s.position.set(this.cx(pos.c), this.cy(pos.r));
      this.overlayLayer.addChild(s);
      this.overlaySprites.set(k, s);
    }
    s.texture = this.tex.get(name)!;
  }

  private removeOverlay(map: Map<string, Sprite>, pos: Pos) {
    const k = key(pos);
    const s = map.get(k);
    if (!s) return;
    map.delete(k);
    gsap.killTweensOf(s);
    gsap.killTweensOf(s.scale);
    void tween(s, { alpha: 0, duration: 0.2 }).then(() => s.destroy());
    void tween(s.scale, { x: CELL_S * 1.25, y: CELL_S * 1.25, duration: 0.2 });
  }

  /* ---------------------------------------------------------------- */
  /*  Input                                                            */
  /* ---------------------------------------------------------------- */

  private toCell(e: FederatedPointerEvent): Pos | null {
    const p = this.root.toLocal(e.global);
    const c = Math.floor(p.x / UNIT);
    const r = Math.floor(p.y / UNIT);
    if (r < 0 || c < 0 || r >= this.rows || c >= this.cols) return null;
    return { r, c };
  }

  private hasTile(p: Pos) {
    return this.grid[p.r]?.[p.c] != null;
  }

  private onPointerDown = (e: FederatedPointerEvent) => {
    sounds.unlock();
    this.events.onInteract();
    this.clearHint();
    if (!this.inputEnabled) return;
    const cell = this.toCell(e);
    if (!cell) return;

    if (this.targeting) {
      this.events.onTap(cell);
      return;
    }
    if (!this.hasTile(cell)) {
      this.select(null);
      return;
    }
    if (this.selected && this.isAdjacent(this.selected, cell)) {
      const from = this.selected;
      this.select(null);
      this.events.onSwapRequest(from, cell);
      return;
    }
    this.select(cell);
    const local = this.root.toLocal(e.global);
    this.drag = { start: cell, x: local.x, y: local.y };
  };

  private onPointerMove = (e: FederatedPointerEvent) => {
    if (!this.drag || !this.inputEnabled) return;
    const local = this.root.toLocal(e.global);
    const dx = local.x - this.drag.x;
    const dy = local.y - this.drag.y;
    const threshold = UNIT * 0.28;
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return;
    const from = this.drag.start;
    const to =
      Math.abs(dx) > Math.abs(dy)
        ? { r: from.r, c: from.c + Math.sign(dx) }
        : { r: from.r + Math.sign(dy), c: from.c };
    this.drag = null;
    this.select(null);
    if (to.r < 0 || to.c < 0 || to.r >= this.rows || to.c >= this.cols) return;
    this.events.onSwapRequest(from, to);
  };

  private onPointerUp = () => {
    this.drag = null;
  };

  private isAdjacent(a: Pos, b: Pos) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  private select(pos: Pos | null) {
    if (this.selected) {
      const id = this.grid[this.selected.r]?.[this.selected.c];
      const sp = id != null ? this.sprites.get(id) : null;
      if (sp) gsap.to(sp.scale, { x: TILE_S, y: TILE_S, duration: 0.15 });
    }
    this.selected = pos;
    if (!this.selectRing) {
      this.selectRing = new Sprite(this.tex.get("select")!);
      this.selectRing.anchor.set(0.5);
      this.selectRing.scale.set(CELL_S);
      this.uiLayer.addChild(this.selectRing);
    }
    if (!pos) {
      this.selectRing.visible = false;
      return;
    }
    this.selectRing.visible = true;
    this.selectRing.position.set(this.cx(pos.c), this.cy(pos.r));
    this.selectRing.alpha = 0;
    gsap.to(this.selectRing, { alpha: 1, duration: 0.12 });
    const id = this.grid[pos.r]?.[pos.c];
    const sp = id != null ? this.sprites.get(id) : null;
    if (sp) {
      sp.zIndex = 10;
      gsap.to(sp.scale, { x: TILE_S * 1.1, y: TILE_S * 1.1, duration: 0.15, ease: "back.out(2)" });
    }
  }

  /* ---------------------------------------------------------------- */
  /*  Hints                                                            */
  /* ---------------------------------------------------------------- */

  showHint(a: Pos, b: Pos) {
    this.clearHint();
    for (const p of [a, b]) {
      const id = this.grid[p.r]?.[p.c];
      const sp = id != null ? this.sprites.get(id) : null;
      if (!sp) continue;
      this.hintSprites.push(sp);
      this.hintTweens.push(
        gsap.to(sp.scale, {
          x: TILE_S * 1.14,
          y: TILE_S * 1.14,
          duration: 0.45,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        }),
      );
    }
  }

  clearHint() {
    for (const t of this.hintTweens) t.kill();
    this.hintTweens = [];
    for (const sp of this.hintSprites) {
      if (!sp.destroyed) gsap.to(sp.scale, { x: TILE_S, y: TILE_S, duration: 0.15 });
    }
    this.hintSprites = [];
  }

  /* ---------------------------------------------------------------- */
  /*  Step playback                                                    */
  /* ---------------------------------------------------------------- */

  async playSteps(steps: Step[], hooks: PlayHooks = {}) {
    if (!this.ready) return;
    this.select(null);
    this.clearHint();
    for (const step of steps) {
      if (this.destroyed) return;
      switch (step.type) {
        case "swap":
          await this.playSwap(step);
          break;
        case "clear":
          hooks.onClear?.(step);
          await this.playClear(step);
          break;
        case "fall":
          await this.playFall(step);
          break;
        case "shuffle":
          await this.playShuffle(step);
          break;
        case "convert":
          await this.playConvert(step);
          break;
      }
    }
  }

  private spriteAt(p: Pos) {
    const id = this.grid[p.r]?.[p.c];
    return id != null ? this.sprites.get(id) ?? null : null;
  }

  private async playSwap(step: Extract<Step, { type: "swap" }>) {
    const { a, b, revert } = step;
    const sa = this.spriteAt(a);
    const sb = this.spriteAt(b);
    const idA = this.grid[a.r][a.c];
    const idB = this.grid[b.r][b.c];
    this.grid[a.r][a.c] = idB;
    this.grid[b.r][b.c] = idA;

    sounds.play(revert ? "invalid" : "swap");
    if (revert) haptic([10, 30, 10]);

    const ease = revert ? "back.out(3)" : "power2.inOut";
    const d = revert ? 0.22 : 0.16;
    const anims: Promise<void>[] = [];
    if (sa) {
      sa.zIndex = 5;
      anims.push(tween(sa, { x: this.cx(b.c), y: this.cy(b.r), duration: d, ease }));
      anims.push(tween(sa.scale, { x: TILE_S, y: TILE_S, duration: d }));
    }
    if (sb) {
      sb.zIndex = 4;
      anims.push(tween(sb, { x: this.cx(a.c), y: this.cy(a.r), duration: d, ease }));
    }
    await Promise.all(anims);
    if (sa) sa.zIndex = 0;
    if (sb) sb.zIndex = 0;
  }

  private async playClear(step: Extract<Step, { type: "clear" }>) {
    const { removed, created, blockers, fired, pops, cascade } = step;
    let duration = 0.3;

    if (fired.length) {
      duration = 0.5;
      const hasBig = fired.some((f) => f.shape === "color" || f.shape === "board" || f.shape === "area5" || f.shape === "lines3");
      sounds.play(hasBig ? "bomb" : "special");
      haptic(hasBig ? [30, 40, 60] : 25);
      for (const f of fired) this.fireEffect(f);
    } else if (removed.length) {
      sounds.play("pop", cascade);
      haptic(cascade > 0 ? [8, 20, 12] : 10);
    }
    if (blockers.length) sounds.play("blocker");

    // Blocker feedback
    for (const hit of blockers) this.blockerEffect(hit);

    // Removed tiles pop
    for (const rm of removed) {
      const sp = this.sprites.get(rm.tileId);
      this.grid[rm.pos.r][rm.pos.c] = null;
      this.sprites.delete(rm.tileId);
      if (!sp) continue;
      const art = rm.kind >= 0 ? this.arts[rm.kind] : null;
      const color = art ? art.glow : "#FFD54F";
      const delay = Math.random() * 0.06;
      gsap.killTweensOf(sp);
      gsap.killTweensOf(sp.scale);
      sp.zIndex = 20;
      const big = rm.special !== "none" ? 1.9 : 1.3;
      gsap
        .timeline({ delay, onComplete: () => sp.destroy() })
        .to(sp.scale, { x: TILE_S * big, y: TILE_S * big, duration: 0.12, ease: "power2.out" })
        .to(sp.scale, { x: 0, y: 0, duration: 0.16, ease: "power2.in" })
        .to(sp, { alpha: 0, duration: 0.14 }, "<");
      this.burst(this.cx(rm.pos.c), this.cy(rm.pos.r), color, rm.special !== "none" ? 18 : 9);
    }

    // Created specials morph in
    if (created.length) sounds.play("create");
    for (const cr of created) {
      const sp = this.sprites.get(cr.tileId);
      if (!sp) continue;
      const art = cr.kind >= 0 ? this.arts[cr.kind] : null;
      gsap.killTweensOf(sp.scale);
      this.flash(this.cx(cr.pos.c), this.cy(cr.pos.r), "#FFFFFF", 1.4);
      gsap
        .timeline({ delay: 0.1 })
        .to(sp.scale, { x: 0.02, y: TILE_S * 1.2, duration: 0.1, ease: "power2.in" })
        .call(() => {
          sp.img.texture = this.texFor(cr.kind, cr.special);
          this.decorate(sp, cr.special);
        })
        .to(sp.scale, { x: TILE_S * 1.3, y: TILE_S * 1.3, duration: 0.14, ease: "back.out(3)" })
        .to(sp.scale, { x: TILE_S, y: TILE_S, duration: 0.12 });
      this.burst(this.cx(cr.pos.c), this.cy(cr.pos.r), art ? art.glow : "#FFFFFF", 16, true);
    }

    // Wrapped tiles that just armed (exploded once, still on board) pulse.
    for (const f of fired) {
      if (f.shape !== "area3") continue;
      const sp = this.spriteAt(f.pos);
      if (sp && !removed.some((r) => r.tileId === this.grid[f.pos.r][f.pos.c])) {
        gsap.to(sp.scale, { x: TILE_S * 1.12, y: TILE_S * 1.12, duration: 0.18, yoyo: true, repeat: 3 });
      }
    }

    // Score pops
    for (const pop of pops) {
      if (pop.amount > 0) this.scorePop(pop.pos, pop.amount, cascade);
    }

    await wait(duration);
  }

  private async playFall(step: Extract<Step, { type: "fall" }>) {
    const anims: Promise<void>[] = [];
    for (const mv of step.moves) this.grid[mv.from.r][mv.from.c] = null;
    for (const mv of step.moves) {
      this.grid[mv.to.r][mv.to.c] = mv.tileId;
      const sp = this.sprites.get(mv.tileId);
      if (!sp) continue;
      const dist = mv.to.r - mv.from.r;
      anims.push(this.drop(sp, this.cy(mv.to.r), dist));
    }
    for (const sp of step.spawns) {
      this.grid[sp.to.r][sp.to.c] = sp.tile.id;
      const startY = this.cy(sp.entryRow - sp.stack);
      const sprite = this.makeSprite(sp.tile.id, sp.tile.kind, sp.tile.special, sp.to, startY);
      anims.push(this.drop(sprite, this.cy(sp.to.r), sp.to.r - (sp.entryRow - sp.stack)));
    }
    await Promise.all(anims);
  }

  private async drop(sp: TileNode, toY: number, dist: number) {
    const d = Math.min(0.5, 0.14 + Math.abs(dist) * 0.055);
    await tween(sp, { y: toY, duration: d, ease: "power1.in" });
    if (sp.destroyed) return;
    await new Promise<void>((resolve) => {
      gsap
        .timeline({ onComplete: resolve })
        .to(sp.scale, { x: TILE_S * 1.1, y: TILE_S * 0.86, duration: 0.07 })
        .to(sp.scale, { x: TILE_S, y: TILE_S, duration: 0.12, ease: "back.out(2)" });
    });
  }

  private async playShuffle(step: Extract<Step, { type: "shuffle" }>) {
    sounds.play("shuffle");
    const centerX = this.W / 2;
    const centerY = this.H / 2;
    const gather: Promise<void>[] = [];
    for (const pl of step.placements) {
      const sp = this.sprites.get(pl.tileId);
      if (!sp) continue;
      gather.push(tween(sp, { x: centerX, y: centerY, duration: 0.28, ease: "power2.in" }));
      gather.push(tween(sp.scale, { x: TILE_S * 0.6, y: TILE_S * 0.6, duration: 0.28 }));
    }
    await Promise.all(gather);
    this.burst(centerX, centerY, "#FFFFFF", 30, true);
    const spread: Promise<void>[] = [];
    for (const pl of step.placements) {
      this.grid[pl.to.r][pl.to.c] = pl.tileId;
      const sp = this.sprites.get(pl.tileId);
      if (!sp) continue;
      spread.push(tween(sp, { x: this.cx(pl.to.c), y: this.cy(pl.to.r), duration: 0.34, ease: "back.out(1.4)" }));
      spread.push(tween(sp.scale, { x: TILE_S, y: TILE_S, duration: 0.34 }));
    }
    await Promise.all(spread);
  }

  private async playConvert(step: Extract<Step, { type: "convert" }>) {
    sounds.play("party");
    const anims: Promise<void>[] = [];
    step.tiles.forEach((t, i) => {
      const sp = this.sprites.get(t.tileId);
      if (!sp) return;
      const kindIdx = this.kindOfSprite(sp);
      anims.push(
        new Promise<void>((resolve) => {
          gsap
            .timeline({ delay: i * 0.05, onComplete: resolve })
            .to(sp.scale, { x: 0.02, y: TILE_S * 1.2, duration: 0.09 })
            .call(() => {
              sp.img.texture = this.texFor(kindIdx, t.special);
              this.decorate(sp, t.special);
              this.flash(sp.x, sp.y, "#FFFFFF", 1.2);
            })
            .to(sp.scale, { x: TILE_S * 1.25, y: TILE_S * 1.25, duration: 0.12, ease: "back.out(3)" })
            .to(sp.scale, { x: TILE_S, y: TILE_S, duration: 0.1 });
        }),
      );
    });
    await Promise.all(anims);
  }

  private kindOfSprite(sp: TileNode): number {
    for (const [k, t] of this.tex) {
      if (t === sp.img.texture) {
        const idx = parseInt(k.split(":")[0], 10);
        return Number.isFinite(idx) ? idx : 0;
      }
    }
    return 0;
  }

  /* ---------------------------------------------------------------- */
  /*  Effects                                                          */
  /* ---------------------------------------------------------------- */

  private beam(x: number, y: number, length: number, rotation: number, thickness = UNIT * 0.9, color = 0xffffff) {
    const b = new Sprite(this.tex.get("beam")!);
    b.anchor.set(0, 0.5);
    b.position.set(x, y);
    b.rotation = rotation;
    b.width = length;
    b.height = thickness;
    b.tint = color;
    b.blendMode = "add";
    b.alpha = 0;
    this.fxLayer.addChild(b);
    gsap
      .timeline({ onComplete: () => b.destroy() })
      .to(b, { alpha: 1, duration: 0.08 })
      .to(b, { alpha: 0, duration: 0.3, delay: 0.08 });
    return b;
  }

  private ring(x: number, y: number, radiusUnits: number, color = 0xffffff) {
    const r = new Sprite(this.tex.get("ring")!);
    r.anchor.set(0.5);
    r.position.set(x, y);
    r.tint = color;
    r.blendMode = "add";
    r.scale.set(0.2);
    this.fxLayer.addChild(r);
    const target = (radiusUnits * UNIT * 2) / 128;
    gsap
      .timeline({ onComplete: () => r.destroy() })
      .to(r.scale, { x: target, y: target, duration: 0.35, ease: "power2.out" })
      .to(r, { alpha: 0, duration: 0.3 }, "<0.1");
  }

  private flash(x: number, y: number, color: string, size = 1) {
    const f = new Sprite(this.tex.get("dot")!);
    f.anchor.set(0.5);
    f.position.set(x, y);
    f.tint = hexToNum(color);
    f.blendMode = "add";
    f.scale.set((UNIT * 1.6 * size) / 64);
    f.alpha = 0.9;
    this.fxLayer.addChild(f);
    gsap.to(f, { alpha: 0, duration: 0.35, onComplete: () => f.destroy() });
  }

  private fireEffect(f: FiredSpecial) {
    const x = this.cx(f.pos.c);
    const y = this.cy(f.pos.r);
    const gold = 0xffe082;
    switch (f.shape) {
      case "row":
        this.beam(0, y, this.W, 0);
        break;
      case "col":
        this.beam(x, 0, this.H, Math.PI / 2);
        break;
      case "cross":
        this.beam(0, y, this.W, 0);
        this.beam(x, 0, this.H, Math.PI / 2);
        this.ring(x, y, 1.2, gold);
        break;
      case "lines3":
        for (let d = -1; d <= 1; d++) {
          this.beam(0, y + d * UNIT, this.W, 0, UNIT * 0.9, gold);
          this.beam(x + d * UNIT, 0, this.H, Math.PI / 2, UNIT * 0.9, gold);
        }
        this.ring(x, y, 2, gold);
        break;
      case "area3":
        this.ring(x, y, 1.6, 0xfff176);
        this.flash(x, y, "#FFF176", 2.2);
        this.burst(x, y, "#FFE082", 24, true);
        break;
      case "area5":
        this.ring(x, y, 2.8, 0xffab40);
        this.ring(x, y, 1.6, 0xffffff);
        this.flash(x, y, "#FFB74D", 3.5);
        this.burst(x, y, "#FFB74D", 40, true);
        break;
      case "color": {
        const art = f.kind >= 0 ? this.arts[f.kind] : null;
        const color = art ? hexToNum(art.glow) : 0xffffff;
        this.flash(x, y, "#FFFFFF", 2);
        for (const t of f.targets) {
          const tx = this.cx(t.c);
          const ty = this.cy(t.r);
          const len = Math.hypot(tx - x, ty - y);
          const rot = Math.atan2(ty - y, tx - x);
          this.beam(x, y, len, rot, UNIT * 0.35, color);
          this.flash(tx, ty, art ? art.glow : "#FFFFFF", 1.1);
        }
        this.ring(x, y, 3, color);
        break;
      }
      case "board":
        this.ring(x, y, Math.max(this.rows, this.cols) * 0.8, 0xffffff);
        this.flash(this.W / 2, this.H / 2, "#FFFFFF", Math.max(this.rows, this.cols) * 0.9);
        this.burst(x, y, "#FFFFFF", 60, true);
        break;
    }
  }

  private blockerEffect(hit: BlockerHit) {
    const x = this.cx(hit.pos.c);
    const y = this.cy(hit.pos.r);
    if (hit.kind === "soil") {
      if (hit.remaining > 0) this.setSoil(hit.pos, hit.remaining);
      else this.removeOverlay(this.soilSprites, hit.pos);
      this.burst(x, y, "#A26A3C", 8);
      return;
    }
    const color = hit.kind === "ice" ? "#BDE9FF" : hit.kind === "crate" ? "#C8935A" : "#FFD84D";
    if (hit.remaining > 0) {
      this.setOverlay(hit.pos, `${hit.kind}${hit.remaining}`);
      const s = this.overlaySprites.get(key(hit.pos));
      if (s) {
        gsap.fromTo(s, { x: x - 6 }, { x: x + 6, duration: 0.05, repeat: 5, yoyo: true, onComplete: () => (s.x = x) });
      }
    } else {
      this.removeOverlay(this.overlaySprites, hit.pos);
    }
    this.burst(x, y, color, 12);
  }

  private scorePop(pos: Pos, amount: number, cascade: number) {
    const size = 34 + Math.min(cascade, 5) * 4;
    const t = new Text({
      text: `+${amount}`,
      style: {
        fontFamily: this.fontFamily,
        fontSize: size,
        fontWeight: "800",
        fill: cascade > 1 ? "#FFF176" : "#FFFFFF",
        stroke: { color: "#3D2E7A", width: 6 },
        dropShadow: { alpha: 0.4, blur: 4, distance: 2, color: "#000000" },
      },
    });
    t.anchor.set(0.5);
    t.position.set(this.cx(pos.c), this.cy(pos.r));
    t.scale.set(0.4);
    this.popLayer.addChild(t);
    gsap
      .timeline({ onComplete: () => t.destroy() })
      .to(t.scale, { x: 1, y: 1, duration: 0.18, ease: "back.out(2.5)" })
      .to(t, { y: t.y - UNIT * 0.9, duration: 0.8, ease: "power1.out" }, "<")
      .to(t, { alpha: 0, duration: 0.3 }, "-=0.3");
  }

  /* ---------------------------------------------------------------- */
  /*  Particles                                                        */
  /* ---------------------------------------------------------------- */

  private getParticle(): Sprite {
    const s = this.pool.pop() ?? new Sprite(this.tex.get("dot")!);
    s.anchor.set(0.5);
    s.visible = true;
    s.alpha = 1;
    s.rotation = 0;
    s.blendMode = "normal";
    this.fxLayer.addChild(s);
    return s;
  }

  private burst(x: number, y: number, color: string, count: number, sparkle = false) {
    if (this.particles.length > 500) return;
    const tint = hexToNum(color);
    for (let i = 0; i < count; i++) {
      const s = this.getParticle();
      s.texture = this.tex.get(sparkle && i % 3 === 0 ? "sparkle" : "dot")!;
      s.tint = tint;
      s.position.set(x, y);
      const size = (UNIT * (0.12 + Math.random() * 0.18)) / 64;
      s.scale.set(size);
      const a = Math.random() * Math.PI * 2;
      const sp = UNIT * (0.05 + Math.random() * 0.11);
      this.particles.push({
        sprite: s,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - UNIT * 0.04,
        life: 0,
        maxLife: 28 + Math.random() * 20,
        spin: (Math.random() - 0.5) * 0.3,
        gravity: UNIT * 0.006,
        shrink: true,
      });
    }
  }

  /** Confetti rain for the win screen. */
  celebrate() {
    if (!this.ready) return;
    const colors = ["#FF5252", "#FFB300", "#FFEB3B", "#4CAF50", "#29B6F6", "#AB47BC", "#FF4081", "#FFFFFF"];
    for (let i = 0; i < 140; i++) {
      const s = this.getParticle();
      s.texture = this.tex.get(i % 4 === 0 ? "sparkle" : "dot")!;
      s.tint = hexToNum(colors[i % colors.length]);
      s.position.set(Math.random() * this.W, -UNIT * (0.5 + Math.random() * 4));
      s.scale.set((UNIT * (0.18 + Math.random() * 0.2)) / 64);
      this.particles.push({
        sprite: s,
        vx: (Math.random() - 0.5) * UNIT * 0.03,
        vy: UNIT * (0.02 + Math.random() * 0.03),
        life: 0,
        maxLife: 140 + Math.random() * 60,
        spin: (Math.random() - 0.5) * 0.2,
        gravity: UNIT * 0.0008,
        shrink: false,
      });
    }
  }

  private tick = (ticker: Ticker) => {
    const dt = Math.min(ticker.deltaTime, 2);
    if (!this.particles.length) return;
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      const s = p.sprite;
      s.x += p.vx * dt;
      s.y += p.vy * dt;
      p.vy += p.gravity * dt;
      s.rotation += p.spin * dt;
      const t = p.life / p.maxLife;
      s.alpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      if (p.shrink) s.scale.set(s.scale.x * (1 - 0.02 * dt));
      if (p.life >= p.maxLife || s.y > this.H + UNIT) {
        s.visible = false;
        this.fxLayer.removeChild(s);
        this.pool.push(s);
      } else {
        alive.push(p);
      }
    }
    this.particles = alive;
  };
}
