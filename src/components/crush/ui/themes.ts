/* ------------------------------------------------------------------ */
/*  Play-screen colour grades. The painted garden backdrop is re-lit   */
/*  per theme (hue / saturation) and the glass panels follow suit.     */
/*  Switched on big moments during a level.                            */
/* ------------------------------------------------------------------ */

export interface CrushTheme {
  id: "forest" | "galaxy" | "ice" | "sunset";
  name: string;
  tagline: string;
  /** CSS custom properties applied to the play screen root. */
  vars: Record<string, string>;
  /** Pixi board plate colour + alpha (behind the cells). */
  plate: { color: number; alpha: number };
  cellAlpha: [number, number];
}

export const THEMES: CrushTheme[] = [
  {
    id: "forest",
    name: "Potato Garden",
    tagline: "Natural. Calm. Playful.",
    vars: {
      "--crush-hue": "0deg",
      "--crush-sat": "1.05",
      "--crush-bright": "1",
      "--crush-glass": "rgba(8, 48, 22, 0.8)",
      "--crush-glass-edge": "rgba(140, 230, 120, 0.55)",
      "--crush-label": "#9be86b",
      "--crush-accent": "#59d63c",
      "--crush-accent-2": "#c6ff6a",
      "--crush-glow": "rgba(120, 230, 90, 0.5)",
      "--crush-glow-color": "#7ef05a",
      "--crush-frame": "rgba(6, 42, 20, 0.9)",
      "--crush-frame-edge": "rgba(150, 240, 120, 0.8)",
    },
    plate: { color: 0x0b3d1e, alpha: 0.9 },
    cellAlpha: [0.14, 0.08],
  },
  {
    id: "galaxy",
    name: "Purple Galaxy",
    tagline: "Cosmic. Modern. Premium.",
    vars: {
      "--crush-hue": "160deg",
      "--crush-sat": "1.1",
      "--crush-bright": "0.9",
      "--crush-glass": "rgba(30, 12, 66, 0.8)",
      "--crush-glass-edge": "rgba(196, 160, 255, 0.55)",
      "--crush-label": "#d3b8ff",
      "--crush-accent": "#b070ff",
      "--crush-accent-2": "#ff8fd0",
      "--crush-glow": "rgba(170, 110, 255, 0.5)",
      "--crush-glow-color": "#b98cff",
      "--crush-frame": "rgba(24, 10, 56, 0.9)",
      "--crush-frame-edge": "rgba(200, 170, 255, 0.8)",
    },
    plate: { color: 0x22104d, alpha: 0.9 },
    cellAlpha: [0.14, 0.08],
  },
  {
    id: "ice",
    name: "Ice Blue",
    tagline: "Clean. Fresh. Energetic.",
    vars: {
      "--crush-hue": "95deg",
      "--crush-sat": "1.05",
      "--crush-bright": "1.05",
      "--crush-glass": "rgba(8, 40, 80, 0.8)",
      "--crush-glass-edge": "rgba(150, 220, 255, 0.55)",
      "--crush-label": "#a8e6ff",
      "--crush-accent": "#4fc3ff",
      "--crush-accent-2": "#c8f4ff",
      "--crush-glow": "rgba(110, 200, 255, 0.5)",
      "--crush-glow-color": "#8fdcff",
      "--crush-frame": "rgba(6, 34, 70, 0.9)",
      "--crush-frame-edge": "rgba(170, 230, 255, 0.8)",
    },
    plate: { color: 0x0b2f5e, alpha: 0.9 },
    cellAlpha: [0.14, 0.08],
  },
  {
    id: "sunset",
    name: "Sunset Orange",
    tagline: "Warm. Bold. Fun.",
    vars: {
      "--crush-hue": "-95deg",
      "--crush-sat": "1.15",
      "--crush-bright": "1",
      "--crush-glass": "rgba(70, 22, 10, 0.8)",
      "--crush-glass-edge": "rgba(255, 200, 140, 0.55)",
      "--crush-label": "#ffd08a",
      "--crush-accent": "#ff9f3c",
      "--crush-accent-2": "#ffe27a",
      "--crush-glow": "rgba(255, 170, 80, 0.5)",
      "--crush-glow-color": "#ffb85c",
      "--crush-frame": "rgba(58, 18, 8, 0.9)",
      "--crush-frame-edge": "rgba(255, 210, 150, 0.8)",
    },
    plate: { color: 0x4a1a0a, alpha: 0.9 },
    cellAlpha: [0.14, 0.08],
  },
];

export function themeForLevel(order: number): CrushTheme {
  return THEMES[(order - 1) % THEMES.length];
}

export function nextTheme(current: CrushTheme): CrushTheme {
  const i = THEMES.findIndex((t) => t.id === current.id);
  return THEMES[(i + 1) % THEMES.length];
}
