import type { TileArt } from "../engine/levels";
import type { Special } from "../engine/types";

/* ------------------------------------------------------------------ */
/*  Procedural, glossy "candy" artwork drawn on 2D canvases.           */
/*  Everything is vector so it stays crisp on any DPR.                 */
/* ------------------------------------------------------------------ */

type Ctx = CanvasRenderingContext2D;

export const TEX_SIZE = 160;

function canvas(size = TEX_SIZE): [HTMLCanvasElement, Ctx] {
  const el = document.createElement("canvas");
  el.width = size;
  el.height = size;
  const ctx = el.getContext("2d")!;
  return [el, ctx];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ---------------------------- silhouettes ---------------------------- */

function potatoPath(ctx: Ctx, s: number) {
  const cx = s / 2;
  const cy = s / 2;
  const w = s * 0.4;
  const h = s * 0.33;
  ctx.beginPath();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.35);
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w, -h * 1.05, -w * 0.35, -h * 1.15, 0.05 * w, -h * 0.95);
  ctx.bezierCurveTo(w * 0.55, -h * 0.8, w, -h * 0.55, w, 0.05 * h);
  ctx.bezierCurveTo(w, h * 0.75, w * 0.45, h * 1.1, -0.05 * w, h * 0.95);
  ctx.bezierCurveTo(-w * 0.55, h * 0.85, -w, h * 0.55, -w, 0);
  ctx.closePath();
  ctx.restore();
}

function sweetPath(ctx: Ctx, s: number) {
  const cx = s / 2;
  const cy = s / 2;
  const w = s * 0.44;
  const h = s * 0.24;
  ctx.beginPath();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.75);
  ctx.moveTo(-w, 0);
  ctx.bezierCurveTo(-w * 0.7, -h * 1.2, w * 0.7, -h * 1.2, w, 0);
  ctx.bezierCurveTo(w * 0.7, h * 1.2, -w * 0.7, h * 1.2, -w, 0);
  ctx.closePath();
  ctx.restore();
}

function gemPath(ctx: Ctx, s: number) {
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.42;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function chipPath(ctx: Ctx, s: number) {
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.4;
  const scallops = 11;
  ctx.beginPath();
  for (let i = 0; i <= scallops * 8; i++) {
    const t = (i / (scallops * 8)) * Math.PI * 2;
    const rr = r + Math.sin(t * scallops) * s * 0.025;
    const x = cx + Math.cos(t) * rr;
    const y = cy + Math.sin(t) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function leafPath(ctx: Ctx, s: number) {
  const cx = s / 2;
  const cy = s / 2;
  const w = s * 0.36;
  const h = s * 0.44;
  ctx.beginPath();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(0.6);
  ctx.moveTo(0, -h);
  ctx.bezierCurveTo(w * 1.3, -h * 0.5, w * 1.1, h * 0.7, 0, h);
  ctx.bezierCurveTo(-w * 1.1, h * 0.7, -w * 1.3, -h * 0.5, 0, -h);
  ctx.closePath();
  ctx.restore();
}

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function friesPath(ctx: Ctx, s: number) {
  // Silhouette used for clipping overlays: carton + fries.
  roundRectPath(ctx, s * 0.18, s * 0.1, s * 0.64, s * 0.8, s * 0.14);
}

function silhouette(ctx: Ctx, shape: TileArt["shape"], s: number) {
  switch (shape) {
    case "potato":
      return potatoPath(ctx, s);
    case "sweet":
      return sweetPath(ctx, s);
    case "gem":
      return gemPath(ctx, s);
    case "chip":
      return chipPath(ctx, s);
    case "leaf":
      return leafPath(ctx, s);
    case "fries":
      return friesPath(ctx, s);
  }
}

/* ------------------------------ shading ------------------------------ */

function glossyFill(ctx: Ctx, s: number, colors: [string, string, string], path: () => void) {
  // Drop shadow
  ctx.save();
  path();
  ctx.shadowColor = "rgba(20,10,40,0.35)";
  ctx.shadowBlur = s * 0.06;
  ctx.shadowOffsetY = s * 0.04;
  ctx.fillStyle = colors[1];
  ctx.fill();
  ctx.restore();

  // Body gradient
  ctx.save();
  path();
  ctx.clip();
  const g = ctx.createRadialGradient(s * 0.38, s * 0.34, s * 0.04, s * 0.5, s * 0.5, s * 0.55);
  g.addColorStop(0, colors[0]);
  g.addColorStop(0.55, colors[1]);
  g.addColorStop(1, colors[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);

  // Inner rim (darker edge)
  path();
  ctx.lineWidth = s * 0.07;
  ctx.strokeStyle = rgba(colors[2], 0.45);
  ctx.stroke();

  // Bottom bounce light
  const bl = ctx.createLinearGradient(0, s * 0.55, 0, s * 0.92);
  bl.addColorStop(0, "rgba(255,255,255,0)");
  bl.addColorStop(1, "rgba(255,255,255,0.22)");
  ctx.fillStyle = bl;
  ctx.fillRect(0, s * 0.55, s, s * 0.4);
  ctx.restore();
}

function specular(ctx: Ctx, s: number, path: () => void, strength = 0.55) {
  ctx.save();
  path();
  ctx.clip();
  ctx.fillStyle = `rgba(255,255,255,${strength})`;
  ctx.beginPath();
  ctx.ellipse(s * 0.38, s * 0.3, s * 0.13, s * 0.08, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${strength * 0.5})`;
  ctx.beginPath();
  ctx.ellipse(s * 0.3, s * 0.42, s * 0.035, s * 0.025, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/* ----------------------------- details ------------------------------ */

function potatoDetails(ctx: Ctx, s: number, art: TileArt) {
  ctx.save();
  potatoPath(ctx, s);
  ctx.clip();
  ctx.fillStyle = rgba(art.colors[2], 0.55);
  const eyes: [number, number, number][] = [
    [0.36, 0.55, 0.035],
    [0.58, 0.4, 0.03],
    [0.62, 0.62, 0.028],
    [0.45, 0.68, 0.022],
  ];
  for (const [x, y, r] of eyes) {
    ctx.beginPath();
    ctx.ellipse(s * x, s * y, s * r, s * r * 0.7, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function friesDetails(ctx: Ctx, s: number, art: TileArt) {
  // Golden fries fanning out
  const fries = [
    { x: 0.5, top: 0.12, tilt: 0 },
    { x: 0.36, top: 0.18, tilt: -0.22 },
    { x: 0.64, top: 0.18, tilt: 0.22 },
    { x: 0.43, top: 0.24, tilt: -0.08 },
    { x: 0.57, top: 0.24, tilt: 0.08 },
  ];
  for (const f of fries) {
    ctx.save();
    ctx.translate(s * f.x, s * 0.62);
    ctx.rotate(f.tilt);
    const h = (0.62 - f.top) * s;
    const w = s * 0.1;
    const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    g.addColorStop(0, art.colors[1]);
    g.addColorStop(0.5, art.colors[0]);
    g.addColorStop(1, "#E39A00");
    roundRectPath(ctx, -w / 2, -h, w, h + s * 0.05, w * 0.35);
    ctx.fillStyle = g;
    ctx.shadowColor = "rgba(0,0,0,0.2)";
    ctx.shadowBlur = 3;
    ctx.fill();
    ctx.restore();
  }
  // Red carton
  ctx.save();
  const x0 = s * 0.22;
  const x1 = s * 0.78;
  const y0 = s * 0.5;
  const y1 = s * 0.9;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.lineTo(x1 - s * 0.06, y1 - s * 0.06);
  ctx.quadraticCurveTo(x1 - s * 0.07, y1, x1 - s * 0.13, y1);
  ctx.lineTo(x0 + s * 0.13, y1);
  ctx.quadraticCurveTo(x0 + s * 0.07, y1, x0 + s * 0.06, y1 - s * 0.06);
  ctx.closePath();
  ctx.shadowColor = "rgba(20,10,40,0.35)";
  ctx.shadowBlur = s * 0.05;
  ctx.shadowOffsetY = s * 0.03;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#FF6B5E");
  g.addColorStop(0.5, "#E63B2E");
  g.addColorStop(1, "#A61E14");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = "transparent";
  // Carton stripe + shine
  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.fillRect(x0 + s * 0.05, y0 + s * 0.06, s * 0.08, y1 - y0 - s * 0.14);
  ctx.fillStyle = "#FFE082";
  ctx.beginPath();
  ctx.arc(s * 0.5, s * 0.7, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#C62828";
  ctx.font = `bold ${s * 0.09}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("PB", s * 0.5, s * 0.705);
  ctx.restore();
}

function sweetDetails(ctx: Ctx, s: number) {
  ctx.save();
  sweetPath(ctx, s);
  ctx.clip();
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = s * 0.02;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(s * (0.3 + i * 0.12), s * (0.72 - i * 0.05));
    ctx.lineTo(s * (0.44 + i * 0.12), s * (0.56 - i * 0.05));
    ctx.stroke();
  }
  ctx.restore();
}

function gemDetails(ctx: Ctx, s: number, art: TileArt) {
  ctx.save();
  gemPath(ctx, s);
  ctx.clip();
  const cx = s / 2;
  const cy = s / 2;
  const r = s * 0.42;
  const ri = s * 0.22;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = s * 0.015;
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * ri, cy + Math.sin(a) * ri);
    ctx.stroke();
  }
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    const x = cx + Math.cos(a) * ri;
    const y = cy + Math.sin(a) * ri;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(art.colors[0], 0.35);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function chipDetails(ctx: Ctx, s: number, art: TileArt) {
  ctx.save();
  chipPath(ctx, s);
  ctx.clip();
  ctx.fillStyle = rgba(art.colors[2], 0.35);
  const spots: [number, number, number][] = [
    [0.4, 0.62, 0.03],
    [0.62, 0.36, 0.025],
    [0.66, 0.6, 0.02],
    [0.5, 0.75, 0.018],
    [0.33, 0.45, 0.02],
  ];
  for (const [x, y, r] of spots) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function leafDetails(ctx: Ctx, s: number, art: TileArt) {
  ctx.save();
  leafPath(ctx, s);
  ctx.clip();
  ctx.translate(s / 2, s / 2);
  ctx.rotate(0.6);
  ctx.strokeStyle = rgba(art.colors[0], 0.7);
  ctx.lineWidth = s * 0.022;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.38);
  ctx.lineTo(0, s * 0.4);
  ctx.stroke();
  ctx.lineWidth = s * 0.014;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * s * 0.12);
    ctx.lineTo(s * 0.16, i * s * 0.12 + s * 0.09);
    ctx.moveTo(0, i * s * 0.12);
    ctx.lineTo(-s * 0.16, i * s * 0.12 + s * 0.09);
    ctx.stroke();
  }
  ctx.restore();
}

/* ----------------------------- specials ----------------------------- */

function stripes(ctx: Ctx, s: number, art: TileArt, dir: "H" | "V") {
  ctx.save();
  silhouette(ctx, art.shape, s);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 2;
  const band = s * 0.075;
  for (let i = 0; i < 4; i++) {
    const pos = s * (0.22 + i * 0.19);
    if (dir === "H") ctx.fillRect(0, pos - band / 2, s, band);
    else ctx.fillRect(pos - band / 2, 0, band, s);
  }
  ctx.restore();
}

function wrapper(ctx: Ctx, s: number, art: TileArt) {
  // Glow halo around the tile
  ctx.save();
  silhouette(ctx, art.shape, s);
  ctx.shadowColor = art.glow;
  ctx.shadowBlur = s * 0.12;
  ctx.lineWidth = s * 0.05;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.stroke();
  ctx.stroke();
  ctx.restore();

  // Sparkles
  ctx.save();
  ctx.fillStyle = "#FFFFFF";
  const stars: [number, number, number][] = [
    [0.2, 0.22, 0.06],
    [0.8, 0.28, 0.045],
    [0.24, 0.78, 0.045],
    [0.78, 0.76, 0.06],
  ];
  for (const [x, y, r] of stars) {
    sparklePath(ctx, s * x, s * y, s * r);
    ctx.fill();
  }
  ctx.restore();
}

export function sparklePath(ctx: Ctx, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? r : r * 0.32;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

const RAINBOW = ["#FF5252", "#FFB300", "#FFEB3B", "#4CAF50", "#29B6F6", "#AB47BC", "#FF4081"];

export function drawBomb(size = TEX_SIZE): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const s = size;
  const path = () => {
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
  };
  glossyFill(ctx, s, ["#7A4B2A", "#3E2413", "#150A04"], path);
  ctx.save();
  path();
  ctx.clip();
  // Sprinkles
  let seed = 7;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const d = Math.sqrt(rnd()) * s * 0.34;
    const x = s / 2 + Math.cos(a) * d;
    const y = s / 2 + Math.sin(a) * d;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rnd() * Math.PI);
    ctx.fillStyle = RAINBOW[i % RAINBOW.length];
    roundRectPath(ctx, -s * 0.045, -s * 0.014, s * 0.09, s * 0.028, s * 0.014);
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 2;
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  specular(ctx, s, path, 0.6);
  // Gold ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.4, 0, Math.PI * 2);
  ctx.lineWidth = s * 0.035;
  ctx.strokeStyle = "#FFD54F";
  ctx.shadowColor = "#FFEB3B";
  ctx.shadowBlur = s * 0.08;
  ctx.stroke();
  ctx.restore();
  return el;
}

export function drawTile(art: TileArt, special: Special, size = TEX_SIZE): HTMLCanvasElement {
  if (special === "bomb") return drawBomb(size);
  const [el, ctx] = canvas(size);
  const s = size;

  if (special === "wrapped") {
    ctx.translate(s / 2, s / 2);
    ctx.scale(0.86, 0.86);
    ctx.translate(-s / 2, -s / 2);
  }

  const path = () => silhouette(ctx, art.shape, s);

  if (art.shape === "fries") {
    friesDetails(ctx, s, art);
  } else {
    glossyFill(ctx, s, art.colors, path);
    switch (art.shape) {
      case "potato":
        potatoDetails(ctx, s, art);
        break;
      case "sweet":
        sweetDetails(ctx, s);
        break;
      case "gem":
        gemDetails(ctx, s, art);
        break;
      case "chip":
        chipDetails(ctx, s, art);
        break;
      case "leaf":
        leafDetails(ctx, s, art);
        break;
    }
    specular(ctx, s, path, art.shape === "gem" ? 0.7 : 0.55);
  }

  if (special === "stripedH") stripes(ctx, s, art, "H");
  if (special === "stripedV") stripes(ctx, s, art, "V");
  if (special === "wrapped") wrapper(ctx, s, art);
  return el;
}

/* ----------------------------- blockers ----------------------------- */

export function drawIce(level: 1 | 2, size = TEX_SIZE): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const s = size;
  const pad = s * 0.04;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.16);
  const g = ctx.createLinearGradient(0, 0, s, s);
  g.addColorStop(0, level === 2 ? "rgba(225,247,255,0.92)" : "rgba(225,247,255,0.7)");
  g.addColorStop(1, level === 2 ? "rgba(140,205,240,0.9)" : "rgba(140,205,240,0.62)");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = s * 0.03;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.stroke();
  // Frost highlight
  ctx.save();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.16);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.beginPath();
  ctx.ellipse(s * 0.3, s * 0.22, s * 0.2, s * 0.08, -0.5, 0, Math.PI * 2);
  ctx.fill();
  // Cracks
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = s * 0.018;
  ctx.lineCap = "round";
  const cracks =
    level === 1
      ? [
          [0.2, 0.3, 0.45, 0.5],
          [0.45, 0.5, 0.4, 0.8],
          [0.45, 0.5, 0.8, 0.35],
          [0.8, 0.35, 0.9, 0.2],
          [0.45, 0.5, 0.6, 0.7],
        ]
      : [[0.6, 0.62, 0.75, 0.78]];
  for (const [x0, y0, x1, y1] of cracks) {
    ctx.beginPath();
    ctx.moveTo(s * x0, s * y0);
    ctx.lineTo(s * x1, s * y1);
    ctx.stroke();
  }
  ctx.restore();
  return el;
}

export function drawCrate(hp: 1 | 2, size = TEX_SIZE): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const s = size;
  const pad = s * 0.07;
  ctx.save();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.1);
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = s * 0.05;
  ctx.shadowOffsetY = s * 0.03;
  const g = ctx.createLinearGradient(0, pad, 0, s - pad);
  g.addColorStop(0, "#D9A366");
  g.addColorStop(1, "#8F5A2B");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.1);
  ctx.clip();
  // planks
  ctx.strokeStyle = "rgba(90,50,15,0.55)";
  ctx.lineWidth = s * 0.02;
  for (let i = 1; i < 3; i++) {
    const y = pad + ((s - pad * 2) * i) / 3;
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(s - pad, y);
    ctx.stroke();
  }
  // grain
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = s * 0.012;
  for (let i = 0; i < 7; i++) {
    const y = pad + s * 0.05 + i * s * 0.12;
    ctx.beginPath();
    ctx.moveTo(pad + s * 0.05, y);
    ctx.bezierCurveTo(s * 0.4, y - s * 0.03, s * 0.6, y + s * 0.03, s - pad - s * 0.05, y);
    ctx.stroke();
  }
  // diagonal brace
  ctx.strokeStyle = "rgba(120,70,20,0.75)";
  ctx.lineWidth = s * 0.09;
  ctx.beginPath();
  ctx.moveTo(pad, s - pad);
  ctx.lineTo(s - pad, pad);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,225,170,0.35)";
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(pad + s * 0.02, s - pad - s * 0.06);
  ctx.lineTo(s - pad - s * 0.06, pad + s * 0.02);
  ctx.stroke();
  // nails
  ctx.fillStyle = "#4B2C12";
  for (const [x, y] of [
    [0.16, 0.16],
    [0.84, 0.16],
    [0.16, 0.84],
    [0.84, 0.84],
  ]) {
    ctx.beginPath();
    ctx.arc(s * x, s * y, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  if (hp === 1) {
    ctx.strokeStyle = "rgba(40,20,5,0.8)";
    ctx.lineWidth = s * 0.02;
    ctx.beginPath();
    ctx.moveTo(s * 0.55, s * 0.12);
    ctx.lineTo(s * 0.45, s * 0.42);
    ctx.lineTo(s * 0.6, s * 0.55);
    ctx.lineTo(s * 0.48, s * 0.88);
    ctx.stroke();
  }
  ctx.restore();
  // frame
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.1);
  ctx.lineWidth = s * 0.035;
  ctx.strokeStyle = "#5C3714";
  ctx.stroke();
  return el;
}

export function drawButter(size = TEX_SIZE): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const s = size;
  const x = s * 0.12;
  const y = s * 0.22;
  const w = s * 0.76;
  const h = s * 0.56;
  ctx.save();
  roundRectPath(ctx, x, y, w, h, s * 0.1);
  ctx.shadowColor = "rgba(120,80,0,0.35)";
  ctx.shadowBlur = s * 0.05;
  ctx.shadowOffsetY = s * 0.03;
  const g = ctx.createLinearGradient(x, y, x, y + h);
  g.addColorStop(0, "#FFF4B0");
  g.addColorStop(0.4, "#FFD84D");
  g.addColorStop(1, "#E0A800");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  // top face
  ctx.save();
  roundRectPath(ctx, x, y, w, h, s * 0.1);
  ctx.clip();
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.3);
  ctx.lineTo(x + w * 0.12, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w * 0.88, y + h * 0.3);
  ctx.closePath();
  ctx.fill();
  // drips
  ctx.fillStyle = "#FFB300";
  for (const [dx, dh] of [
    [0.25, 0.16],
    [0.55, 0.22],
    [0.78, 0.12],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x + w * dx, y + h - s * 0.02, s * 0.05, s * dh, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = "#B8860B";
  ctx.font = `800 ${s * 0.13}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("BUTTER", s / 2, y + h * 0.62);
  return el;
}

export function drawSoil(level: 1 | 2, size = TEX_SIZE): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const s = size;
  const pad = s * 0.03;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.16);
  const g = ctx.createLinearGradient(0, 0, s, s);
  if (level === 2) {
    g.addColorStop(0, "#6B3F1D");
    g.addColorStop(1, "#3E2211");
  } else {
    g.addColorStop(0, "#A26A3C");
    g.addColorStop(1, "#6E4322");
  }
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.16);
  ctx.clip();
  let seed = level * 31 + 5;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < (level === 2 ? 34 : 20); i++) {
    ctx.fillStyle = rnd() > 0.5 ? "rgba(0,0,0,0.22)" : "rgba(255,220,170,0.16)";
    ctx.beginPath();
    ctx.ellipse(rnd() * s, rnd() * s, s * (0.02 + rnd() * 0.035), s * (0.015 + rnd() * 0.025), rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  ctx.lineWidth = s * 0.025;
  ctx.strokeStyle = "rgba(255,230,200,0.25)";
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.16);
  ctx.stroke();
  return el;
}

export function drawCell(alt: boolean, size = TEX_SIZE): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const s = size;
  const pad = s * 0.03;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.16);
  ctx.fillStyle = alt ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.2)";
  ctx.fill();
  ctx.lineWidth = s * 0.015;
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();
  return el;
}

export function drawSoftCircle(size = 64): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.5, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return el;
}

export function drawSparkle(size = 64): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = size * 0.15;
  sparklePath(ctx, size / 2, size / 2, size * 0.45);
  ctx.fill();
  return el;
}

export function drawRing(size = 128): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.42, 0, Math.PI * 2);
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = "#fff";
  ctx.shadowColor = "#fff";
  ctx.shadowBlur = size * 0.1;
  ctx.stroke();
  return el;
}

export function drawSelectRing(size = TEX_SIZE): HTMLCanvasElement {
  const [el, ctx] = canvas(size);
  const s = size;
  const pad = s * 0.035;
  roundRectPath(ctx, pad, pad, s - pad * 2, s - pad * 2, s * 0.18);
  ctx.lineWidth = s * 0.05;
  ctx.strokeStyle = "#FFFFFF";
  ctx.shadowColor = "#FFF176";
  ctx.shadowBlur = s * 0.12;
  ctx.stroke();
  ctx.stroke();
  return el;
}

export function drawBeam(length = 256, thickness = 48): HTMLCanvasElement {
  const [el, ctx] = canvas(Math.max(length, thickness));
  el.width = length;
  el.height = thickness;
  const g = ctx.createLinearGradient(0, 0, 0, thickness);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,1)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, length, thickness);
  return el;
}
