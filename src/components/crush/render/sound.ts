/* ------------------------------------------------------------------ */
/*  Tiny synthesized sound kit (no audio assets needed).               */
/* ------------------------------------------------------------------ */

export type SoundName =
  | "swap"
  | "invalid"
  | "pop"
  | "special"
  | "bomb"
  | "create"
  | "blocker"
  | "win"
  | "lose"
  | "coin"
  | "ui"
  | "party"
  | "shuffle";

type WindowWithWebkit = Window & { webkitAudioContext?: typeof AudioContext };

export class SoundKit {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  enabled = true;

  private ensure(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  /** Call from a user gesture to unlock audio on iOS. */
  unlock() {
    this.ensure();
  }

  private tone(
    freq: number,
    duration: number,
    opts: {
      type?: OscillatorType;
      gain?: number;
      slideTo?: number;
      delay?: number;
      attack?: number;
    } = {},
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled) return;
    const t0 = ctx.currentTime + (opts.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration);
    const peak = opts.gain ?? 0.5;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  private noise(duration: number, gain = 0.3, delay = 0, filterFreq = 1800) {
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.enabled) return;
    const t0 = ctx.currentTime + delay;
    const len = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  play(name: SoundName, cascade = 0) {
    if (!this.enabled) return;
    switch (name) {
      case "swap":
        this.tone(420, 0.09, { slideTo: 640, gain: 0.25 });
        break;
      case "invalid":
        this.tone(160, 0.14, { type: "square", gain: 0.12, slideTo: 120 });
        break;
      case "pop": {
        const base = 520 * Math.pow(1.12, Math.min(cascade, 8));
        this.tone(base, 0.16, { type: "triangle", gain: 0.35, slideTo: base * 1.6 });
        this.noise(0.08, 0.12);
        break;
      }
      case "special":
        this.tone(300, 0.32, { type: "sawtooth", gain: 0.18, slideTo: 1400 });
        this.noise(0.25, 0.2, 0, 3000);
        break;
      case "bomb":
        this.tone(130, 0.55, { type: "sine", gain: 0.6, slideTo: 38 });
        this.noise(0.45, 0.35, 0, 900);
        this.tone(900, 0.4, { type: "triangle", gain: 0.12, slideTo: 200, delay: 0.05 });
        break;
      case "create":
        this.tone(880, 0.22, { gain: 0.25 });
        this.tone(1320, 0.28, { gain: 0.2, delay: 0.05 });
        break;
      case "blocker":
        this.noise(0.12, 0.3, 0, 1200);
        this.tone(220, 0.1, { type: "square", gain: 0.1 });
        break;
      case "coin":
        this.tone(1250, 0.1, { gain: 0.2 });
        this.tone(1700, 0.16, { gain: 0.18, delay: 0.06 });
        break;
      case "ui":
        this.tone(760, 0.05, { gain: 0.15 });
        break;
      case "shuffle":
        for (let i = 0; i < 6; i++) this.tone(400 + i * 90, 0.08, { gain: 0.12, delay: i * 0.05 });
        break;
      case "party":
        for (let i = 0; i < 8; i++) {
          this.tone(600 + i * 110, 0.14, { type: "triangle", gain: 0.2, delay: i * 0.07 });
        }
        break;
      case "win":
        [523, 659, 784, 1047, 1319].forEach((f, i) =>
          this.tone(f, 0.28, { type: "triangle", gain: 0.3, delay: i * 0.11 }),
        );
        this.tone(1568, 0.7, { type: "sine", gain: 0.25, delay: 0.55 });
        break;
      case "lose":
        this.tone(440, 0.3, { type: "triangle", gain: 0.25 });
        this.tone(330, 0.35, { type: "triangle", gain: 0.25, delay: 0.25 });
        this.tone(220, 0.6, { type: "triangle", gain: 0.25, delay: 0.5 });
        break;
    }
  }
}

export const sounds = new SoundKit();

export function haptic(pattern: number | number[] = 12) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}
