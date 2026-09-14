import { gsap } from "gsap";
import { Application, Assets, Container, Graphics, Sprite, Text, Texture, type FederatedPointerEvent, type Ticker } from "pixi.js";
import { sounds, haptic } from "@/components/crush/render/sound";
import type { ItemKind, NinjaEvent, NinjaGame } from "../engine/ninja";

/* ------------------------------------------------------------------ */
/*  Texture building (canvas 2D)                                        */
/* ------------------------------------------------------------------ */

const TEX = 220;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvas(size = TEX) {
  const el = document.createElement("canvas");
  el.width = size;
  el.height = size;
  return [el, el.getContext("2d")!] as const;
}

/** Crops one cell of the 3×3 skin sheet into a square canvas, trimmed to content. */
function cropCell(sheet: HTMLImageElement, cell: number): HTMLCanvasElement {
  const cw = sheet.width / 3;
  const ch = sheet.height / 3;
  const sx = (cell % 3) * cw;
  const sy = Math.floor(cell / 3) * ch;
  const tmp = document.createElement("canvas");
  tmp.width = Math.round(cw);
  tmp.height = Math.round(ch);
  const tctx = tmp.getContext("2d")!;
  tctx.drawImage(sheet, sx, sy, cw, ch, 0, 0, tmp.width, tmp.height);
  // trim transparent margins
  const data = tctx.getImageData(0, 0, tmp.width, tmp.height).data;
  let minX = tmp.width, minY = tmp.height, maxX = 0, maxY = 0;
  for (let y = 0; y < tmp.height; y++) {
    for (let x = 0; x < tmp.width; x++) {
      if (data[(y * tmp.width + x) * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const w = Math.max(1, maxX - minX + 1);
  const h = Math.max(1, maxY - minY + 1);
  const [out, ctx] = canvas(TEX);
  const s = (TEX * 0.92) / Math.max(w, h);
  ctx.drawImage(tmp, minX, minY, w, h, (TEX - w * s) / 2, (TEX - h * s) / 2, w * s, h * s);
  return out;
}

function tinted(src: HTMLCanvasElement, color: string, alpha: number): HTMLCanvasElement {
  const [out, ctx] = canvas(src.width);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, out.width, out.height);
  return out;
}

/** Splits a potato canvas into left/right halves with a flesh face on the cut. */
function halves(src: HTMLCanvasElement, flesh = "#F7E8C1", rim = "#E3CC8F"): [HTMLCanvasElement, HTMLCanvasElement] {
  const s = src.width;
  const make = (side: -1 | 1) => {
    const [out, ctx] = canvas(s);
    ctx.save();
    ctx.beginPath();
    if (side === -1) ctx.rect(0, 0, s / 2, s);
    else ctx.rect(s / 2, 0, s / 2, s);
    ctx.clip();
    ctx.drawImage(src, 0, 0);
    // flesh sliver along the cut
    ctx.globalCompositeOperation = "source-atop";
    ctx.beginPath();
    ctx.ellipse(s / 2, s / 2, s * 0.13, s * 0.44, 0, 0, Math.PI * 2);
    ctx.fillStyle = flesh;
    ctx.fill();
    ctx.lineWidth = s * 0.02;
    ctx.strokeStyle = rim;
    ctx.stroke();
    ctx.restore();
    return out;
  };
  return [make(-1), make(1)];
}

function drawBomb(): HTMLCanvasElement {
  const [el, ctx] = canvas();
  const s = TEX;
  ctx.save();
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.56, s * 0.34, 0, Math.PI * 2);
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = s * 0.06;
  const g = ctx.createRadialGradient(s * 0.4, s * 0.45, s * 0.04, s * 0.5, s * 0.56, s * 0.36);
  g.addColorStop(0, "#5a5a66");
  g.addColorStop(0.6, "#22222a");
  g.addColorStop(1, "#0b0b10");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  // cap + fuse
  ctx.fillStyle = "#444";
  ctx.fillRect(s * 0.45, s * 0.16, s * 0.1, s * 0.1);
  ctx.strokeStyle = "#c9a36b";
  ctx.lineWidth = s * 0.03;
  ctx.beginPath();
  ctx.moveTo(s * 0.5, s * 0.16);
  ctx.quadraticCurveTo(s * 0.55, s * 0.02, s * 0.68, s * 0.08);
  ctx.stroke();
  // spark
  ctx.fillStyle = "#FFD54F";
  ctx.beginPath();
  ctx.arc(s * 0.68, s * 0.08, s * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#FF7043";
  ctx.beginPath();
  ctx.arc(s * 0.68, s * 0.08, s * 0.025, 0, Math.PI * 2);
  ctx.fill();
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.ellipse(s * 0.38, s * 0.42, s * 0.09, s * 0.05, -0.6, 0, Math.PI * 2);
  ctx.fill();
  return el;
}

function drawPickup(kind: ItemKind): HTMLCanvasElement {
  const [el, ctx] = canvas();
  const s = TEX;
  const colors: Record<string, [string, string]> = {
    life: ["#FF8FB0", "#E0245E"],
    freeze: ["#9FE3FF", "#2E9BE8"],
    multi: ["#C6FF8A", "#3FB05C"],
    shield: ["#A9C7FF", "#3B6DE0"],
  };
  const [c1, c2] = colors[kind] ?? ["#fff", "#999"];
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = s * 0.06;
  const g = ctx.createRadialGradient(s * 0.4, s * 0.4, s * 0.05, s * 0.5, s * 0.5, s * 0.38);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = s * 0.035;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ctx.lineCap = "round";
  if (kind === "life") {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.66);
    ctx.bezierCurveTo(s * 0.2, s * 0.45, s * 0.32, s * 0.25, s * 0.5, s * 0.38);
    ctx.bezierCurveTo(s * 0.68, s * 0.25, s * 0.8, s * 0.45, s * 0.5, s * 0.66);
    ctx.fill();
  } else if (kind === "freeze") {
    ctx.lineWidth = s * 0.04;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI) / 3;
      ctx.beginPath();
      ctx.moveTo(s / 2 - Math.cos(a) * s * 0.22, s / 2 - Math.sin(a) * s * 0.22);
      ctx.lineTo(s / 2 + Math.cos(a) * s * 0.22, s / 2 + Math.sin(a) * s * 0.22);
      ctx.stroke();
    }
  } else if (kind === "multi") {
    ctx.font = `800 ${s * 0.3}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("2x", s / 2, s / 2 + s * 0.02);
  } else {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, s * 0.28);
    ctx.lineTo(s * 0.68, s * 0.36);
    ctx.lineTo(s * 0.66, s * 0.56);
    ctx.quadraticCurveTo(s * 0.6, s * 0.7, s * 0.5, s * 0.74);
    ctx.quadraticCurveTo(s * 0.4, s * 0.7, s * 0.34, s * 0.56);
    ctx.lineTo(s * 0.32, s * 0.36);
    ctx.closePath();
    ctx.fill();
  }
  return el;
}

function softCircle(size = 64): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.85)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return el;
}

/* ------------------------------------------------------------------ */
/*  Renderer                                                           */
/* ------------------------------------------------------------------ */

export interface NinjaRendererOptions {
  skinSheetUrl: string;
  skinCell: number;
  trailColor: string;
  backgroundUrl: string;
  fontFamily?: string;
  onFrame: (game: NinjaGame) => void;
  onEvents: (events: NinjaEvent[]) => void;
}

class ItemNode extends Container {
  img: Sprite;
  constructor(tex: Texture) {
    super();
    this.img = new Sprite(tex);
    this.img.anchor.set(0.5);
    this.addChild(this.img);
  }
}

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
  max: number;
  g: number;
  shrink: number;
}

const hexToNum = (hex: string) => parseInt(hex.replace("#", ""), 16);

export class NinjaRenderer {
  private app = new Application();
  private root = new Container();
  private bg = new Container();
  private world = new Container();
  private halvesLayer = new Container();
  private itemLayer = new Container();
  private fxLayer = new Container();
  private trailGfx = new Graphics();
  private trailGlow = new Graphics();
  private overlay = new Graphics();
  private flash = new Graphics();
  private popLayer = new Container();

  private tex = new Map<string, Texture>();
  private itemNodes = new Map<number, ItemNode>();
  private halfNodes = new Map<number, Sprite>();
  private particles: Particle[] = [];
  private pool: Sprite[] = [];
  private trail: { x: number; y: number; t: number }[] = [];
  private stroking = false;
  private last: { x: number; y: number } | null = null;
  private shake = 0;
  private hudClock = 0;
  private ready = false;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;

  game: NinjaGame | null = null;

  constructor(private host: HTMLElement, private opts: NinjaRendererOptions) {}

  async init() {
    const [sheet, bgTex] = await Promise.all([loadImage(this.opts.skinSheetUrl), Assets.load<Texture>(this.opts.backgroundUrl)]);
    if (this.destroyed) return;
    await this.app.init({
      resizeTo: this.host,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2.5),
      autoDensity: true,
      preference: "webgl",
    });
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }
    const cv = this.app.canvas;
    cv.style.touchAction = "none";
    cv.style.display = "block";
    this.host.appendChild(cv);

    // Textures
    const base = cropCell(sheet, this.opts.skinCell);
    const [l, r] = halves(base);
    this.tex.set("potato", Texture.from(base));
    this.tex.set("potato:L", Texture.from(l));
    this.tex.set("potato:R", Texture.from(r));
    const gold = tinted(base, "#FFC107", 0.55);
    const [gl, gr] = halves(gold, "#FFF1B0", "#E6B800");
    this.tex.set("golden", Texture.from(gold));
    this.tex.set("golden:L", Texture.from(gl));
    this.tex.set("golden:R", Texture.from(gr));
    const ice = tinted(base, "#3FB6FF", 0.42);
    const [il, ir] = halves(ice, "#E6F7FF", "#8FD0FF");
    this.tex.set("ice", Texture.from(ice));
    this.tex.set("ice:L", Texture.from(il));
    this.tex.set("ice:R", Texture.from(ir));
    this.tex.set("bomb", Texture.from(drawBomb()));
    for (const k of ["life", "freeze", "multi", "shield"] as ItemKind[]) {
      const c = drawPickup(k);
      const [pl, pr] = halves(c, "#ffffff", "#dddddd");
      this.tex.set(k, Texture.from(c));
      this.tex.set(`${k}:L`, Texture.from(pl));
      this.tex.set(`${k}:R`, Texture.from(pr));
    }
    this.tex.set("dot", Texture.from(softCircle()));

    // Background (cover) + vignette
    const bgSprite = new Sprite(bgTex);
    bgSprite.anchor.set(0.5);
    this.bg.addChild(bgSprite);
    const vignette = new Graphics();
    this.bg.addChild(vignette);
    this.layoutBg = () => {
      const w = this.app.screen.width;
      const h = this.app.screen.height;
      const s = Math.max(w / bgTex.width, h / bgTex.height);
      bgSprite.scale.set(s);
      bgSprite.position.set(w / 2, h / 2);
      vignette.clear();
      vignette.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.18 });
      this.overlay.clear();
      this.overlay.rect(0, 0, w, h).fill({ color: 0x4fc3ff, alpha: 1 });
      this.overlay.alpha = 0;
      this.flash.clear();
      this.flash.rect(0, 0, w, h).fill({ color: 0xffffff, alpha: 1 });
      this.flash.alpha = 0;
      this.game?.setSize(w, h);
    };

    this.trailGlow.blendMode = "add";
    this.root.addChild(this.bg, this.world, this.overlay, this.flash);
    this.world.addChild(this.halvesLayer, this.itemLayer, this.fxLayer, this.trailGlow, this.trailGfx, this.popLayer);
    this.app.stage.addChild(this.root);

    const stage = this.app.stage;
    stage.eventMode = "static";
    stage.hitArea = this.app.screen;
    stage.on("pointerdown", this.onDown);
    stage.on("pointermove", this.onMove);
    stage.on("pointerup", this.onUp);
    stage.on("pointerupoutside", this.onUp);

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(this.host);
    this.fit();
    this.app.ticker.add(this.tick);
    this.ready = true;
  }

  private layoutBg: () => void = () => {};

  private fit() {
    const w = Math.max(1, Math.round(this.host.clientWidth));
    const h = Math.max(1, Math.round(this.host.clientHeight));
    if (this.app.screen.width !== w || this.app.screen.height !== h) this.app.renderer.resize(w, h);
    this.layoutBg();
  }

  setGame(game: NinjaGame) {
    this.game = game;
    game.setSize(this.app.screen.width || this.host.clientWidth, this.app.screen.height || this.host.clientHeight);
    for (const n of this.itemNodes.values()) n.destroy();
    for (const n of this.halfNodes.values()) n.destroy();
    this.itemNodes.clear();
    this.halfNodes.clear();
    this.popLayer.removeChildren();
    this.trail = [];
  }

  destroy() {
    this.destroyed = true;
    if (!this.ready) return;
    this.app.ticker.remove(this.tick);
    this.resizeObserver?.disconnect();
    for (const t of this.tex.values()) t.destroy(true);
    this.tex.clear();
    this.app.destroy(true, { children: true });
  }

  /* ------------------------------- input ------------------------------ */

  private onDown = (e: FederatedPointerEvent) => {
    sounds.unlock();
    this.stroking = true;
    this.last = { x: e.global.x, y: e.global.y };
    this.trail.push({ x: e.global.x, y: e.global.y, t: performance.now() });
  };

  private onMove = (e: FederatedPointerEvent) => {
    if (!this.stroking || !this.last || !this.game) return;
    const x = e.global.x;
    const y = e.global.y;
    const cut = this.game.slice(this.last.x, this.last.y, x, y);
    if (cut > 0) this.flushEvents();
    this.last = { x, y };
    this.trail.push({ x, y, t: performance.now() });
    if (this.trail.length > 40) this.trail.shift();
  };

  private onUp = () => {
    if (!this.stroking) return;
    this.stroking = false;
    this.last = null;
    this.game?.endStroke();
    this.flushEvents();
  };

  /* -------------------------------- loop ------------------------------ */

  private tick = (ticker: Ticker) => {
    const dt = Math.min(0.05, ticker.deltaMS / 1000);
    const game = this.game;
    if (game) {
      game.step(dt);
      this.flushEvents();
      this.syncSprites(game);
      this.hudClock += dt;
      if (this.hudClock > 0.1) {
        this.hudClock = 0;
        this.opts.onFrame(game);
      }
      this.overlay.alpha = game.freezeLeft > 0 ? 0.22 : 0;
    }
    this.drawTrail();
    this.updateParticles(dt);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      const a = this.shake * 40;
      this.world.position.set((Math.random() - 0.5) * a, (Math.random() - 0.5) * a);
    } else {
      this.world.position.set(0, 0);
    }
  };

  private flushEvents() {
    const game = this.game;
    if (!game) return;
    const events = game.drain();
    if (!events.length) return;
    for (const ev of events) this.handleEvent(ev);
    this.opts.onEvents(events);
  }

  private syncSprites(game: NinjaGame) {
    const seen = new Set<number>();
    for (const it of game.items) {
      seen.add(it.id);
      let node = this.itemNodes.get(it.id);
      if (!node) {
        node = new ItemNode(this.tex.get(it.kind) ?? this.tex.get("potato")!);
        if (it.variant === 1 && it.kind !== "bomb") node.img.scale.x = -1;
        this.itemLayer.addChild(node);
        this.itemNodes.set(it.id, node);
      }
      const s = (it.r * 2.15) / TEX;
      node.scale.set(s);
      node.position.set(it.x, it.y);
      node.rotation = it.rot;
    }
    for (const [id, node] of this.itemNodes) {
      if (!seen.has(id)) {
        node.destroy();
        this.itemNodes.delete(id);
      }
    }

    const seenH = new Set<number>();
    for (const hf of game.halves) {
      seenH.add(hf.id);
      let sp = this.halfNodes.get(hf.id);
      if (!sp) {
        const key = `${hf.kind}:${hf.side === 1 ? "L" : "R"}`;
        sp = new Sprite(this.tex.get(key) ?? this.tex.get("potato:L")!);
        sp.anchor.set(0.5);
        this.halvesLayer.addChild(sp);
        this.halfNodes.set(hf.id, sp);
        const r = hf.kind === "bomb" ? 0 : Math.min(game.width, game.height) * 0.095;
        sp.scale.set((r * 2.15) / TEX);
      }
      sp.position.set(hf.x, hf.y);
      sp.rotation = hf.angle - Math.PI / 2 + hf.rot;
      sp.alpha = Math.max(0, 1 - Math.max(0, game.elapsed - hf.born - 1.2));
    }
    for (const [id, sp] of this.halfNodes) {
      if (!seenH.has(id)) {
        sp.destroy();
        this.halfNodes.delete(id);
      }
    }
  }

  private handleEvent(ev: NinjaEvent) {
    switch (ev.type) {
      case "slice": {
        const color = ev.item.kind === "golden" ? "#FFD54F" : ev.item.kind === "ice" ? "#BFEFFF" : "#F7E8C1";
        this.burst(ev.x, ev.y, color, ev.item.kind === "golden" ? 22 : 14, 1);
        this.burst(ev.x, ev.y, "#C8965A", 6, 0.7);
        this.pop(ev.x, ev.y, `+${ev.points}`, ev.item.kind === "golden" ? "#FFD54F" : "#FFFFFF", 30);
        sounds.play("pop", ev.item.kind === "golden" ? 4 : 0);
        haptic(8);
        break;
      }
      case "combo":
        this.pop(ev.x, ev.y - 40, `COMBO ×${ev.count}  +${ev.bonus}`, "#FFE066", 36);
        this.burst(ev.x, ev.y, "#FFE066", 30, 1.4);
        sounds.play("create");
        haptic([10, 20, 10]);
        break;
      case "bomb":
        if (ev.deflected) {
          this.burst(ev.x, ev.y, "#5B9DFF", 24, 1.3);
          this.pop(ev.x, ev.y, "DEFLECTED!", "#A9C7FF", 30);
          sounds.play("special");
        } else {
          this.burst(ev.x, ev.y, "#FF7043", 40, 1.8);
          this.burst(ev.x, ev.y, "#666666", 26, 1.2, true);
          this.flash.alpha = 0.7;
          gsap.to(this.flash, { alpha: 0, duration: 0.5 });
          this.shake = 0.45;
          sounds.play("bomb");
          haptic([40, 40, 80]);
        }
        break;
      case "powerup":
        this.burst(ev.x, ev.y, "#FFFFFF", 26, 1.3);
        this.pop(ev.x, ev.y, ev.kind === "life" ? "+1 LIFE" : ev.kind === "freeze" ? "FREEZE!" : ev.kind === "multi" ? "2× SCORE" : "SHIELD!", "#BFEFFF", 32);
        sounds.play("special");
        break;
      case "miss":
      case "life":
      case "end":
        break;
    }
  }

  /* --------------------------------- fx ------------------------------- */

  private drawTrail() {
    const now = performance.now();
    this.trail = this.trail.filter((p) => now - p.t < 220);
    this.trailGfx.clear();
    this.trailGlow.clear();
    if (this.trail.length < 2) return;
    const color = hexToNum(this.opts.trailColor);
    const n = this.trail.length;
    for (let i = 1; i < n; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      const f = i / n; // 0 old → 1 new
      const w = 2 + f * 14;
      this.trailGlow.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color, width: w * 2.4, alpha: 0.28 * f, cap: "round" });
      this.trailGfx.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: 0xffffff, width: w, alpha: 0.95 * f, cap: "round" });
    }
  }

  private getParticle(): Sprite {
    const s = this.pool.pop() ?? new Sprite(this.tex.get("dot")!);
    s.anchor.set(0.5);
    s.visible = true;
    s.alpha = 1;
    this.fxLayer.addChild(s);
    return s;
  }

  private burst(x: number, y: number, color: string, count: number, power = 1, smoke = false) {
    if (this.particles.length > 600) return;
    const tint = hexToNum(color);
    const base = Math.min(this.app.screen.width, this.app.screen.height);
    for (let i = 0; i < count; i++) {
      const s = this.getParticle();
      s.tint = tint;
      s.position.set(x, y);
      const size = (base * (smoke ? 0.06 : 0.018 + Math.random() * 0.02)) / 64;
      s.scale.set(size);
      const a = Math.random() * Math.PI * 2;
      const sp = base * (0.25 + Math.random() * 0.55) * power;
      this.particles.push({
        sprite: s,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - base * 0.1,
        life: 0,
        max: smoke ? 0.9 : 0.45 + Math.random() * 0.35,
        g: smoke ? -base * 0.2 : base * 1.6,
        shrink: smoke ? -0.6 : 1.4,
      });
    }
  }

  private updateParticles(dt: number) {
    if (!this.particles.length) return;
    const alive: Particle[] = [];
    for (const p of this.particles) {
      p.life += dt;
      const s = p.sprite;
      s.x += p.vx * dt;
      s.y += p.vy * dt;
      p.vy += p.g * dt;
      const t = p.life / p.max;
      s.alpha = 1 - t;
      s.scale.set(s.scale.x * (1 - p.shrink * dt));
      if (p.life >= p.max) {
        s.visible = false;
        this.fxLayer.removeChild(s);
        this.pool.push(s);
      } else alive.push(p);
    }
    this.particles = alive;
  }

  private pop(x: number, y: number, text: string, color: string, size: number) {
    const t = new Text({
      text,
      style: {
        fontFamily: this.opts.fontFamily ?? "Fredoka, Nunito, sans-serif",
        fontSize: size,
        fontWeight: "800",
        fill: color,
        stroke: { color: "#3a1f00", width: 5 },
        dropShadow: { alpha: 0.5, blur: 4, distance: 2, color: "#000000" },
      },
    });
    t.anchor.set(0.5);
    t.position.set(Math.max(60, Math.min(this.app.screen.width - 60, x)), y);
    t.scale.set(0.3);
    this.popLayer.addChild(t);
    gsap
      .timeline({ onComplete: () => t.destroy() })
      .to(t.scale, { x: 1, y: 1, duration: 0.2, ease: "back.out(2.5)" })
      .to(t, { y: y - 70, duration: 0.8, ease: "power1.out" }, "<")
      .to(t, { alpha: 0, duration: 0.3 }, "-=0.3");
  }
}
