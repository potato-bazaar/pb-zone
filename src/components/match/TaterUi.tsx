"use client";

import { useEffect, useId, useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { TaterOptionArt } from "@/components/match/TaterOptionArt";
import { PbCoinIcon, PbStarIcon } from "@/components/pb/PbUi";
import { BarChartIcon, HomeIcon, PlayIcon } from "@/components/quiz/QuizCompleteIcons";
import {
  ArrowRightIcon,
  Burst,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StarShape,
} from "@/components/quiz/QuizHowToIcons";
import { TATER_SCORING, type TaterOption } from "@/data/taterMatch";

/*
 * Shared primitives of the Tater Match "Field Notebook" UI (SPEC §2). The `tm-*` classes live in
 * globals.css (SPEC §3); everything else is Tailwind. Font rule: `font-display` (Fredoka) is loaded
 * at 500/600/700 only, so display text uses `font-bold`, never `font-extrabold`.
 */

/** Folder of the Tater Match art (webp, generated per SPEC §5). */
export const ART = "/games/match";

type ClassValue = string | false | null | undefined | 0;

/**
 * Simple class join. There is no tailwind-merge in the project, so callers must never pass a
 * utility that conflicts with one a primitive already emits (e.g. `pb-*` into TaterScroll).
 */
export function cn(...parts: ClassValue[]): string {
  return parts.filter(Boolean).join(" ");
}

type IconProps = { className?: string };

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/* ------------------------------------------------------------------ */
/*  2.1 Screen chrome                                                  */
/* ------------------------------------------------------------------ */

/** Outer wrapper of every Tater screen: declares the `--tm-*` tokens and paints the canvas. */
export function TaterScreen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "tm-root tm-bg relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** 40px header row under `--header-top`: back button · centre slot · right slot (wallet pills or a 40px spacer). */
export function TaterHeader({
  onBack,
  backLabel,
  children,
  right,
  art,
}: {
  onBack: () => void;
  /** "Back to games" / "Leave round" / "Back" */
  backLabel: string;
  /** Centre slot (TaterTitle or a plain title). */
  children?: ReactNode;
  /** Wallet pills or nothing. */
  right?: ReactNode;
  /** Floating header art (qh-float), e.g. `{ src: `${ART}/mode-disease.webp`, width: 216, height: 216, className: "w-16" }`. */
  art?: { src: string; width: number; height: number; className?: string; inset?: boolean };
}) {
  return (
    <header className="relative shrink-0 px-4" style={{ paddingTop: "var(--header-top)" }}>
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={art.src}
          alt=""
          draggable={false}
          width={art.width}
          height={art.height}
          className={cn(
            "qh-float pointer-events-none absolute select-none object-contain",
            art.inset ? "right-0 top-0" : "-right-2 -top-1",
            art.className,
          )}
        />
      ) : null}
      <div className="relative grid h-10 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          aria-label={backLabel}
          className="tm-back hit-slop flex h-10 w-10 items-center justify-center rounded-full text-[#0F3D22] active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#1F8A47] focus-visible:ring-offset-2"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <div className="min-w-0 justify-self-center">{children}</div>
        <div className="flex items-center gap-1.5 justify-self-end">
          {right ?? <span aria-hidden className="w-10" />}
        </div>
      </div>
    </header>
  );
}

/** Screen title (quiz pattern, green): "How to <accent>Play</accent>" with twinkling bursts either side. */
export function TaterTitle({ first, accent }: { first: string; accent: string }) {
  return (
    <h1 className="relative max-w-full whitespace-nowrap font-display text-[clamp(1.05rem,5.4vw,1.75rem)] font-bold uppercase leading-none tracking-[0.01em] text-[#0F3D22]">
      <Burst
        side="left"
        className="qh-twinkle absolute -left-[0.95em] top-1/2 h-[0.75em] w-[0.75em] -translate-y-1/2 text-[#FDC403]"
      />
      {first} <span className="text-[#17703A]">{accent}</span>
      <Burst className="qh-twinkle absolute -right-[0.95em] top-1/2 h-[0.75em] w-[0.75em] -translate-y-1/2 text-[#FDC403]" />
    </h1>
  );
}

/**
 * Underline bar placed by the caller directly under <TaterHeader> (a sibling in the TaterScreen
 * column). `-mt-px` + 5px lands the header block at exactly 56px (SPEC §2.1 / §4.2 / §4.4).
 */
export function TaterTitleBar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "mx-auto -mt-px block h-[5px] w-11 rounded-full bg-[linear-gradient(90deg,#DDF1DD,#BFE5C6,#DDF1DD)]",
        className,
      )}
    />
  );
}

const SCROLL_PAD = { 1: "pb-1", 3: "pb-3", 6: "pb-6" } as const;

/**
 * The only scrolling element of a screen. Exactly ONE `pb-*` class is ever emitted (`fade` → `pb-8`,
 * else `pad`), so callers must not put `pb-*`/`pt-*` in `className`. `fade` is for Result only.
 * Home/How-to: default pad 3 · Play: pad={1} gutter={3} · Progress: pad={6} · Result: fade.
 */
export function TaterScroll({
  children,
  className,
  fade = false,
  gutter = 4,
  pad = 3,
  scrollRef,
  style,
}: {
  children: ReactNode;
  className?: string;
  fade?: boolean;
  gutter?: 3 | 4;
  pad?: 1 | 3 | 6;
  scrollRef?: Ref<HTMLDivElement>;
  /** Inline styles the region needs (Play: `{ scrollPaddingBottom: 4 }`, SPEC §6 note 1). */
  style?: CSSProperties;
}) {
  return (
    <div
      ref={scrollRef}
      className={cn(
        "relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]",
        gutter === 3 ? "px-3" : "px-4",
        fade ? "qh-scroll-fade pb-8" : SCROLL_PAD[pad],
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}

const FOOTER_TOP = { 1: "pt-1", 1.5: "pt-1.5", 2: "pt-2" } as const;

/** Pinned footer (CTA row). Single `pt-*` class from `top`; `bottom` is rem added to the safe-area inset. */
export function TaterFooter({
  children,
  className,
  top = 1.5,
  bottom = 0.75,
}: {
  children: ReactNode;
  className?: string;
  top?: 1 | 1.5 | 2;
  bottom?: 0.75 | 1;
}) {
  return (
    <div
      className={cn("relative z-20 shrink-0 px-4", FOOTER_TOP[top], className)}
      style={{ paddingBottom: `calc(${bottom}rem + env(safe-area-inset-bottom, 0px))` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2.2 Wallet pills                                                   */
/* ------------------------------------------------------------------ */

const PILL =
  "tm-pill flex h-8 items-center gap-1 rounded-full pl-1.5 pr-2.5 text-[12px] font-extrabold tabular-nums text-[#0F3D22]";

const PILL_3D =
  "relative flex h-7 min-w-[96px] items-center rounded-full pl-[30px] pr-[3px] text-[13px] font-extrabold tabular-nums";
const PILL_SKIN = { dark: "tm-pill-dark text-white", cream: "tm-pill-cream text-[#173B26]" } as const;

/** "+" glyph for the dark pills (decorative: there is no top-up flow, and leaving mid-round would lose the round). */
function PlusIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="3.5" {...STROKE} aria-hidden>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  );
}

function Pill3d({ icon, text, label, skin }: { icon: string; text: string; label: string; skin: keyof typeof PILL_SKIN }) {
  return (
    <span role="status" aria-label={label} className={cn(PILL_3D, PILL_SKIN[skin])}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/${icon}.webp`}
        alt=""
        draggable={false}
        width={96}
        height={96}
        className="absolute -left-1.5 top-1/2 h-[31px] w-[31px] -translate-y-1/2 select-none object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
      />
      <span className="flex-1 text-center">{text}</span>
      <span aria-hidden className="tm-pill-plus ml-1.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-white">
        <PlusIcon className="h-3 w-3" />
      </span>
    </span>
  );
}

/**
 * Coin + PB Points pills. `light` (default) sits in a header row; `dark` (Play) and `cream` (Home)
 * are the 3D-icon pills with the decorative "+" — the caller lays them out (stacked or side by side).
 */
export function WalletPills({ coins, points, variant = "light" }: { coins: number; points: number; variant?: "light" | "dark" | "cream" }) {
  const coinText = coins.toLocaleString("en-IN");
  const pointText = points.toLocaleString("en-IN");
  if (variant === "dark" || variant === "cream") {
    return (
      <>
        <Pill3d skin={variant} icon="coin-3d" text={coinText} label={`${coinText} coins`} />
        <Pill3d skin={variant} icon="star-3d" text={pointText} label={`${pointText} PB points`} />
      </>
    );
  }
  return (
    <>
      <span role="status" aria-label={`${coinText} coins`} className={PILL}>
        <PbCoinIcon className="h-5 w-5" />
        {coinText}
      </span>
      <span role="status" aria-label={`${pointText} PB points`} className={PILL}>
        <PbStarIcon className="h-5 w-5" />
        {pointText}
      </span>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  2.3 Primary 3D CTA · 2.4 Ghost button                              */
/* ------------------------------------------------------------------ */

type CtaIcon = "arrow" | "play" | "check" | "star";

function CtaGlyph({ icon }: { icon: CtaIcon }) {
  if (icon === "play") return <PlayIcon className="ml-0.5 h-[18px] w-[18px]" />;
  if (icon === "check") return <CheckIcon className="h-5 w-5" />;
  if (icon === "star") return <StarShape className="h-5 w-5" />;
  return <ArrowRightIcon className="h-5 w-5" />;
}

/**
 * The one gold (or green, for state changes) 3D CTA per screen. `ariaDisabled` keeps the button
 * focusable but inert (Play's CTA waits for an answer this way); `disabled` also drops it from the tab
 * order and no screen uses it today. A held-down Enter/Space never re-activates it.
 */
export function TaterCta({
  tone = "gold",
  label,
  icon = "arrow",
  onClick,
  disabled,
  ariaDisabled,
  size = "md",
  bursts = false,
  className,
  ref,
  leaf = false,
}: {
  tone?: "gold" | "green";
  label: string;
  icon?: CtaIcon;
  onClick: () => void;
  disabled?: boolean;
  ariaDisabled?: boolean;
  size?: "md" | "lg" | "xl";
  bursts?: boolean;
  /** Applied to the wrapper (margins/width). */
  className?: string;
  /** The <button>, for moving focus (Play moves focus here after a reveal). */
  ref?: Ref<HTMLButtonElement>;
  /** A small leaf sprig tucked into the left end (Play's footer button); the label stays centred. */
  leaf?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      {bursts ? (
        <Burst side="left" className="qh-twinkle absolute -left-1 -top-2 h-6 w-6 text-[#FFD23F]" />
      ) : null}
      {bursts ? <Burst className="qh-twinkle absolute -right-1 -top-2 h-6 w-6 text-[#4CCB68]" /> : null}
      <button
        ref={ref}
        type="button"
        onClick={() => {
          if (!ariaDisabled) onClick();
        }}
        onKeyDown={(e) => {
          // Key auto-repeat must not chain presses (answer a photo, then skip its verdict straight to the next question).
          if (e.repeat && (e.key === "Enter" || e.key === " ")) e.preventDefault();
        }}
        disabled={disabled}
        aria-disabled={ariaDisabled || undefined}
        className={cn(
          "tm-cta relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full font-display font-bold forced-colors:border-2",
          size === "xl" ? "h-[60px] text-[25px]" : size === "lg" ? "h-[56px] text-[20px]" : "h-[52px] text-[20px]",
          tone === "green"
            ? "tm-cta--green text-white [text-shadow:0_1px_2px_rgba(20,92,50,0.45)]"
            : "text-[#3A2A00]",
        )}
      >
        <span aria-hidden className="qh-sheen pointer-events-none absolute inset-0" />
        {leaf ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${ART}/leaf-sprig.webp`}
            alt=""
            draggable={false}
            width={150}
            height={137}
            className="tm-cta-leaf pointer-events-none absolute bottom-[-3px] left-3 h-auto w-[34px] -rotate-6 select-none"
          />
        ) : null}
        <span className={cn("relative", leaf ? "px-9" : "pr-8")}>{label}</span>
        <span
          aria-hidden
          className={cn(
            "tm-cta-disc absolute right-1.5 flex h-10 w-10 items-center justify-center rounded-full",
            tone === "green" ? "text-[#17703A]" : "text-[#7A4A00]",
          )}
        >
          <CtaGlyph icon={icon} />
        </span>
      </button>
    </div>
  );
}

/** Secondary ghost pill (green twin of .qd-home). Both sizes are ≥ 44px tall. */
export function TaterGhost({
  label,
  icon,
  onClick,
  size = "md",
  className,
}: {
  label: string;
  icon?: "home" | "help" | "chart";
  onClick: () => void;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tm-ghost flex w-full cursor-pointer items-center justify-center gap-2 rounded-full font-display font-bold text-[#17703A] forced-colors:border-2",
        size === "sm" ? "h-11 text-[14px]" : "h-12 text-[16px]",
        className,
      )}
    >
      {icon === "home" ? <HomeIcon className="h-5 w-5 text-[#1F8A47]" /> : null}
      {icon === "help" ? <HelpIcon className="h-5 w-5 text-[#1F8A47]" /> : null}
      {icon === "chart" ? <BarChartIcon className="h-5 w-5 text-[#1F8A47]" /> : null}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  2.5 Card, tile, panel, chip                                        */
/* ------------------------------------------------------------------ */

/** White card with a green rim that rises in; `delay` (ms) staggers the entrance. */
export function TaterCard({
  children,
  className,
  delay,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "li" | "section";
}) {
  const Tag = as;
  return (
    <Tag
      className={cn("tm-card qh-rise rounded-[20px]", className)}
      style={delay != null ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

export type TaterTone = "variety" | "disease" | "growth" | "gold";

/** Per-tone colour sets (fills are never used under text; `ink` goes on `wash`/white/canvas). */
export const TM_TONES: Record<
  TaterTone,
  {
    tile: string;
    glow: string;
    badge: string;
    digit: string;
    title: string;
    detailBg: string;
    detailText: string;
    wash: string;
    ink: string;
    accent: string;
    line: string;
  }
> = {
  variety: {
    tile: "linear-gradient(180deg,#EAF2FF,#DCE9FF)",
    glow: "rgba(43,109,239,.35)",
    badge: "#DCE9FF",
    digit: "#1E4BB8",
    title: "#1E4BB8",
    detailBg: "#EAF2FF",
    detailText: "#1E4BB8",
    wash: "#EAF2FF",
    ink: "#1E4BB8",
    accent: "#2B6DEF",
    line: "#CADBFB",
  },
  disease: {
    tile: "linear-gradient(180deg,#E7F7EC,#D8F2E0)",
    glow: "rgba(31,138,71,.35)",
    badge: "#D8F2E0",
    digit: "#17703A",
    title: "#17703A",
    detailBg: "#E7F7EC",
    detailText: "#17703A",
    wash: "#E7F7EC",
    ink: "#17703A",
    accent: "#1F8A47",
    line: "#C7E6D1",
  },
  growth: {
    tile: "linear-gradient(180deg,#FFF1E4,#FFE6CF)",
    glow: "rgba(196,92,18,.35)",
    badge: "#FFE6CF",
    digit: "#A64A0A",
    title: "#A64A0A",
    detailBg: "#FFF1E4",
    detailText: "#A64A0A",
    wash: "#FFF1E4",
    ink: "#A64A0A",
    accent: "#C45C12",
    line: "#F0D6C4",
  },
  gold: {
    tile: "linear-gradient(180deg,#FFF6D9,#FFECB8)",
    glow: "rgba(240,168,0,.4)",
    badge: "#FFE9A8",
    digit: "#7A4A00",
    title: "#7A4A00",
    detailBg: "#FFF4CE",
    detailText: "#7A4A00",
    wash: "#FFF4CE",
    ink: "#7A4A00",
    accent: "#F0A800",
    line: "#F2DFA6",
  },
};

const TILE_SIZE = {
  sm: { box: "h-9 w-9", img: "h-7 w-7" }, // 36px box / 28px img — Progress stats, learn rows
  md: { box: "h-10 w-10", img: "h-8 w-8" }, // 40 / 32 — Home modes & daily, How-to steps
  lg: { box: "h-11 w-11", img: "h-9 w-9" }, // 44 / 36
  xl: { box: "h-[52px] w-[52px]", img: "h-11 w-11" }, // 52 / 44 — Play banner
} as const;

/** Tinted square tile holding a webp icon with a tone-coloured drop shadow and (optionally) a tiny burst. */
export function TaterTile({
  tone,
  src,
  size = "md",
  burst = true,
  className,
}: {
  tone: TaterTone;
  src: string;
  size?: "sm" | "md" | "lg" | "xl";
  burst?: boolean;
  className?: string;
}) {
  const s = TILE_SIZE[size];
  const t = TM_TONES[tone];
  return (
    <span
      aria-hidden
      className={cn("tm-tile relative flex shrink-0 items-center justify-center rounded-xl", s.box, className)}
      style={{ background: t.tile }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        width={192}
        height={192}
        className={cn(s.img, "object-contain")}
        style={{ filter: `drop-shadow(0 5px 6px ${t.glow})` }}
      />
      {burst ? <Burst className="absolute right-0 top-0.5 h-3 w-3 text-[#FDC403]" /> : null}
    </span>
  );
}

/** Gradient-bordered panel with a centred heading and a white inner box (green twin of .qh-panel). */
export function TaterPanel({
  title,
  icon,
  id,
  children,
  className,
  delay,
}: {
  title: string;
  icon?: ReactNode;
  /** Heading id for `aria-labelledby`; generated when omitted. */
  id?: string;
  children: ReactNode;
  className?: string;
  /** When set, the panel rises in (`qh-rise`) after this many ms. */
  delay?: number;
}) {
  const autoId = useId();
  const headingId = id ?? autoId;
  return (
    <section
      aria-labelledby={headingId}
      className={cn("tm-panel relative overflow-hidden rounded-2xl p-1.5 pt-2", delay != null && "qh-rise", className)}
      style={delay != null ? { animationDelay: `${delay}ms` } : undefined}
    >
      <StarShape className="pointer-events-none absolute left-[5%] top-4 h-3.5 w-3.5 text-[#CDEBD3]" />
      <StarShape className="pointer-events-none absolute right-[5%] top-2.5 h-4 w-4 text-[#CDEBD3]" />
      <StarShape className="pointer-events-none absolute right-[11%] top-8 h-2.5 w-2.5 text-[#CDEBD3]" />
      <h2
        id={headingId}
        className="relative flex items-center justify-center gap-1.5 font-display text-[16px] font-bold uppercase tracking-[0.03em] text-[#17703A]"
      >
        {icon}
        {title}
      </h2>
      <div className="relative mt-1.5 rounded-xl bg-white px-2.5 shadow-[0_4px_14px_-8px_rgba(31,138,71,0.25),inset_0_0_0_1px_#EEF8F0]">
        {children}
      </div>
    </section>
  );
}

const CHIP_TONE = {
  pb: "bg-[#EDE7FF] text-[#4B2AAE]",
  coin: "bg-[#FFF4CE] text-[#6E3A04]",
  fast: "bg-[#FFE9A8] text-[#7A4A00]",
  green: "bg-[#E7F7EC] text-[#17703A]",
  wrong: "bg-[#FFF1F0] text-[#9B1C1C]",
  muted: "bg-[#DDEBDF] text-[#4F6B58]",
} as const;

/** 18px reward/status chip. `pb`, `coin` and `fast` carry their icon automatically. */
export function Chip({
  tone,
  children,
  className,
}: {
  tone: keyof typeof CHIP_TONE;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center gap-1 rounded-full px-2 text-[11px] font-extrabold tabular-nums",
        CHIP_TONE[tone],
        className,
      )}
    >
      {tone === "pb" ? <PbStarIcon className="h-3.5 w-3.5" /> : null}
      {tone === "coin" ? <PbCoinIcon className="h-3.5 w-3.5" /> : null}
      {tone === "fast" ? <BoltIcon className="h-3 w-3" /> : null}
      {children}
      {/* The coin glyph is aria-hidden, so give the number its unit for screen readers. */}
      {tone === "coin" ? <span className="sr-only"> coins</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  2.6 Lettering (copied, not refactored, from QuizCompleteScreen)    */
/* ------------------------------------------------------------------ */

type Lettering = "title" | "gold" | "headline";

const LETTERING_LAYERS: Record<Lettering, { layers: string[]; fill: string }> = {
  // "Round", "MATCH": white outline around a green fill.
  title: { layers: ["tm-layer-white"], fill: "tm-fill-green" },
  // "Complete!", "TATER": white outside a deep-green outline around a gold fill.
  gold: { layers: ["tm-layer-white-thick", "tm-layer-green"], fill: "qd-fill-gold" },
  // "+34 PB Points": white outline with a mint drop under it.
  headline: { layers: ["tm-layer-headline"], fill: "tm-fill-headline" },
};

/**
 * Game lettering built from stacked copies of the same text (strokes behind, gradient fill in
 * front). Every copy is decorative; callers provide the accessible text.
 */
export function OutlinedText({
  children,
  variant,
  className = "",
}: {
  children: string;
  variant: Lettering;
  className?: string;
}) {
  const { layers, fill } = LETTERING_LAYERS[variant];
  return (
    <span aria-hidden className={`relative inline-block ${className}`}>
      {layers.map((layer) => (
        <span key={layer} className={`${layer} absolute inset-0`}>
          {children}
        </span>
      ))}
      <span className={`qd-text-fill relative ${fill}`}>{children}</span>
    </span>
  );
}

/** Eased count-up to `target` after `delay` ms; under reduced motion returns `target` immediately. */
export function useCountUp(target: number, duration = 1100, delay = 500) {
  // Reduced motion: show the final value from the very first render (no count-up, no "+0" frame).
  // Safe to read matchMedia here: this screen only mounts on the client, after the round finishes.
  const [reduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    let start = 0;
    const timer = window.setTimeout(() => {
      const tick = (t: number) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, duration, delay, reduce]);
  return reduce ? target : value;
}

/* ------------------------------------------------------------------ */
/*  2.7 Trail, fast chip, option card, learn sheet                     */
/* ------------------------------------------------------------------ */

/** Potato silhouette (18×16 box when className="h-[16px] w-[18px]"). */
export function PotatoDot({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 18" aria-hidden className={className}>
      <path
        d="M10 1.5c4.6 0 8.5 3.2 8.5 7.6S14.6 16.5 10 16.5 1.5 13.5 1.5 9.1 5.4 1.5 10 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

export type TrailState = "ok" | "miss" | "now" | "next";

/**
 * Question-by-question trail of potato dots (the progressbar of the round). `results` holds one
 * entry per answered question; the current question is "now" until it is revealed.
 */
export function TaterTrail({
  total,
  index,
  revealed,
  results,
}: {
  total: number;
  index: number;
  revealed: boolean;
  results: ("ok" | "miss")[];
}) {
  const okCount = results.filter((r) => r === "ok").length;
  return (
    <div
      role="progressbar"
      aria-label="Round progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={index + (revealed ? 1 : 0)}
      aria-valuetext={`Question ${index + 1} of ${total}, ${okCount} correct so far`}
      className="tm-trail flex items-center gap-[5px]"
    >
      {Array.from({ length: total }, (_, i) => {
        let state: TrailState = "next";
        if (i < results.length) state = results[i];
        else if (i === index && !revealed) state = "now";
        return (
          <span key={i} className={cn("tm-dot", `tm-dot--${state}`)}>
            {state === "ok" ? <TrailCheck className="h-[10px] w-[10px] text-white" /> : null}
            {state === "miss" ? <TrailCross className="h-[10px] w-[10px] text-white" /> : null}
          </span>
        );
      })}
    </div>
  );
}

/**
 * "+2 fast" hint chip: ON (butter, draining gold bar) while the fast window is open, then OFF (grey).
 * Mount it with `key={startedAt}`: the elapsed time is captured once per mount and fed to the drain
 * bar as a negative animation-delay, so re-renders never restart it. It is informational only — the
 * fast bonus itself is decided by `answer()` in TaterMatchPlay (question start to the tap).
 */
export function FastChip({ startedAt, seconds }: { startedAt: number; seconds: number }) {
  const windowMs = seconds * 1000;
  const [elapsedAtMount] = useState(() => Math.min(windowMs, Math.max(0, Date.now() - startedAt)));
  const [on, setOn] = useState(elapsedAtMount < windowMs);
  useEffect(() => {
    const remaining = windowMs - (Date.now() - startedAt);
    const t = window.setTimeout(() => setOn(false), Math.max(0, remaining));
    return () => window.clearTimeout(t);
  }, [startedAt, windowMs]);
  return (
    <span
      aria-hidden
      className={cn(
        "tm-fast relative inline-flex h-6 w-[58px] items-center justify-center gap-1 overflow-hidden rounded-full text-[13px] font-extrabold",
        !on && "tm-fast--off",
      )}
    >
      {on ? (
        <span
          className="tm-fast-bar absolute inset-y-0 left-0 w-full bg-[#FFD23F]/70"
          style={{ animationDuration: `${seconds}s`, animationDelay: `-${elapsedAtMount}ms` }}
        />
      ) : null}
      <BoltIcon className="tm-fast-bolt relative h-3.5 w-3.5" />
      <span className="relative">+{TATER_SCORING.pointsFast}</span>
    </span>
  );
}

/** The sr-only rule behind FastChip; render it once per screen (not per question). */
export function FastChipHint({ seconds = TATER_SCORING.fastSeconds }: { seconds?: number }) {
  return (
    <span className="sr-only">
      Answer within {seconds} seconds for +{TATER_SCORING.pointsFast} PB
    </span>
  );
}

export type OptionState = "idle" | "correct" | "wrong" | "dim";

/**
 * One answer tile: square photo (or the drawn fallback when there is no photo / it fails to load),
 * letter tab, the same green caption bar on every tile, and a verdict stamp after reveal.
 * One tap answers, so the tile is a plain button (no toggle state); after the reveal it is
 * aria-disabled (still focusable) and its name carries the verdict.
 */
export function OptionCard({
  letter,
  option,
  state,
  revealed,
  showLabel,
  onSelect,
}: {
  letter: "A" | "B" | "C" | "D";
  option: TaterOption;
  state: OptionState;
  revealed: boolean;
  /** Name inside the bar. Omitted when only some options are labeled, so the bar stays the same green. */
  showLabel: boolean;
  /** Called with this option's id; the parent passes its handler by reference (no per-tile closure). */
  onSelect: (id: string) => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photo = option.imageUrl && option.imageUrl !== failedUrl ? option.imageUrl : null;
  const verdict = state === "correct" ? " — correct answer" : state === "wrong" ? " — your answer, wrong" : "";
  return (
    <li className="min-h-0 min-w-0">
      <button
        type="button"
        aria-disabled={revealed || undefined}
        onClick={() => {
          if (!revealed) onSelect(option.id);
        }}
        aria-label={`Option ${letter}${showLabel && option.label ? `, ${option.label}` : ""}${verdict}`}
        className={cn(
          "tm-opt relative block h-full min-h-0 w-full overflow-hidden rounded-[16px] bg-[#EDE6D3] text-left",
          `tm-opt--${state}`,
        )}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            draggable={false}
            width={600}
            height={600}
            loading="eager"
            decoding="async"
            className="h-full w-full object-cover"
            onError={() => setFailedUrl(photo)}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-[#EDE6D3] p-[12%]">
            <TaterOptionArt art={option.art} className="h-full w-full" />
          </span>
        )}
        <span
          aria-hidden
          className="tm-opt-letter absolute left-2 top-2 flex h-[30px] w-[30px] items-center justify-center rounded-full font-display text-[15px] font-bold"
        >
          {letter}
        </span>
        <span aria-hidden className="tm-opt-plate absolute inset-x-0 bottom-0 flex h-[30px] items-center justify-center">
          {showLabel && option.label ? (
            <span className="truncate px-2 font-display text-[13px] font-semibold leading-none text-white">{option.label}</span>
          ) : null}
        </span>
        {state === "correct" || state === "wrong" ? (
          <span
            aria-hidden
            className={cn(
              "tm-opt-stamp absolute right-2 top-2 flex h-[30px] w-[30px] items-center justify-center rounded-full",
              state === "correct" ? "bg-[#1F8A47]" : "bg-[#D9342B]",
            )}
          >
            {state === "correct" ? (
              <CheckIcon className="h-4 w-4 text-white" />
            ) : (
              <CrossIcon className="h-[14px] w-[14px] text-white" />
            )}
          </span>
        ) : null}
      </button>
    </li>
  );
}

/**
 * Verdict + tip sheet docked above the Play CTA. ALWAYS rendered: before the reveal it is the
 * sr-only, persistent `role="status"` node, so the announcement works on the first reveal. The
 * expand control is a separate button inside it with a constant accessible name (only `aria-expanded`
 * changes), so toggling the tip does not re-announce the atomic region.
 */
export function LearnSheet({
  revealed,
  ok,
  label,
  tip,
  points,
  coins,
  fast,
  timedOut = false,
  expanded,
  onToggle,
  statusId,
}: {
  revealed: boolean;
  ok: boolean;
  label: string;
  tip: string;
  points: number;
  coins: number;
  fast: boolean;
  timedOut?: boolean;
  expanded: boolean;
  onToggle: () => void;
  statusId: string;
}) {
  if (!revealed) {
    return <div id={statusId} role="status" aria-live="polite" aria-atomic="true" className="sr-only" />;
  }
  return (
    <div
      id={statusId}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        "tm-learn qh-rise relative mb-2 flex gap-2 rounded-[18px] p-2",
        ok ? "tm-learn--ok" : "tm-learn--miss",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${ART}/${ok ? "mascot-cheer" : "mascot-oops"}.webp`}
        alt=""
        draggable={false}
        width={192}
        height={192}
        className="qh-pop h-14 w-14 shrink-0 self-center object-contain"
      />
      <div className="min-w-0 flex-1 pr-9">
        <p className={cn("text-[13px] font-extrabold leading-[1.3] text-pretty", ok ? "text-[#17703A]" : "text-[#9B1C1C]")}>
          {ok ? `Correct! ${label}` : timedOut ? `Time's up — it's ${label}` : `Not quite — it's ${label}`}
          {ok ? (
            <span className="ml-1 inline-flex flex-wrap gap-1 align-middle">
              <Chip tone="green">+{points} PB</Chip>
              <Chip tone="coin">+{coins}</Chip>
              {fast ? <Chip tone="fast">+{TATER_SCORING.pointsFast} fast</Chip> : null}
            </span>
          ) : null}
        </p>
        <p className={cn("mt-0.5 text-[12px] font-semibold leading-[1.25] text-[#3F5A48]", !expanded && "line-clamp-2")}>
          {tip}
        </p>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label="Full tip"
        onClick={onToggle}
        className="hit-slop absolute! right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-[#4F8F66] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#145C32]"
      >
        <ChevronRightIcon
          className={cn(
            "h-[18px] w-[18px] transition-transform duration-300 motion-reduce:transition-none",
            expanded ? "-rotate-90" : "rotate-90",
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  2.8 Medallion, loader, glyphs                                      */
/* ------------------------------------------------------------------ */

/** Badge-shelf cell (`li`, `col-span-2` in the 6-col shelf; pass `className="col-start-2"` for the centred 4th). */
export function Medallion({
  src,
  label,
  hint,
  unlocked,
  delay,
  className,
}: {
  src: string;
  label: string;
  hint: string;
  unlocked: boolean;
  /** `qh-rise` delay in ms (shelf: 300 + 70·i). */
  delay: number;
  className?: string;
}) {
  return (
    <li
      className={cn(
        "tm-card qh-rise col-span-2 flex flex-col items-center rounded-[18px] px-1.5 pb-2 pt-2 text-center",
        !unlocked && "tm-badge--locked",
        className,
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="sr-only">{unlocked ? "Unlocked badge: " : "Locked badge: "}</span>
      <span className="tm-badge-rim relative flex h-[60px] w-[60px] items-center justify-center rounded-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          width={168}
          height={168}
          className={cn("h-14 w-14 object-contain", unlocked && "qh-pop")}
        />
        {unlocked ? (
          <Burst className="absolute -right-1 -top-1 h-3.5 w-3.5 text-[#FFD23F]" />
        ) : (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#4F6B58] ring-2 ring-white">
            <LockIcon className="h-3 w-3 text-white" />
          </span>
        )}
      </span>
      <span className={cn("mt-1.5 font-display text-[12px] font-bold leading-[1.2]", unlocked ? "text-[#0F3D22]" : "text-[#4F6B58]")}>
        {label}
      </span>
      <span className="mt-0.5 text-[10px] font-semibold leading-[1.3] text-[#4F6B58]">{hint}</span>
    </li>
  );
}

const LOADER_DELAYS = [0, 0.15, 0.3] as const;

/** "Picking fresh photos…" overlay (SPEC §4.6), rendered by TaterMatchApp while a round loads. */
export function TaterLoader() {
  return (
    <div className="tm-loader fixed inset-0 z-50 flex items-center justify-center">
      <div className="tm-card qh-pop flex w-[208px] flex-col items-center rounded-[22px] px-4 py-4 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ART}/mascot-look.webp`}
          alt=""
          draggable={false}
          width={288}
          height={288}
          className="tm-bob h-[72px] w-[72px] select-none object-contain"
        />
        <span aria-hidden className="mt-1.5 flex gap-1.5">
          {LOADER_DELAYS.map((d) => (
            <span key={d} className="tm-loader-dot inline-flex" style={{ animationDelay: `${d}s` }}>
              <PotatoDot className="h-3 w-3" />
            </span>
          ))}
        </span>
        <p role="status" aria-live="polite" className="mt-2 font-display text-[15px] font-bold leading-tight text-[#0F3D22]">
          Picking fresh photos…
        </p>
        <p className="mt-0.5 text-[11px] font-semibold text-[#4F6B58]">Real field photos, one round</p>
      </div>
    </div>
  );
}

/** 24-unit cross (strokeWidth 3.25): stamps at 14px → ≈ 1.9px stroke. Use ≥ 14px only. */
export function CrossIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="3.25" {...STROKE} aria-hidden>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

/** 12-unit check for the 10px trail dots (strokeWidth 2.4 → ≈ 2px). */
export function TrailCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" className={className} strokeWidth="2.4" {...STROKE} aria-hidden>
      <path d="m2.5 6.4 2.4 2.4L9.5 3.6" />
    </svg>
  );
}

/** 12-unit cross for the 10px trail dots (strokeWidth 2.4 → ≈ 2px). */
export function TrailCross({ className }: IconProps) {
  return (
    <svg viewBox="0 0 12 12" className={className} strokeWidth="2.4" {...STROKE} aria-hidden>
      <path d="M3.2 3.2l5.6 5.6M8.8 3.2l-5.6 5.6" />
    </svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

export function BoltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M13.2 2 5 13.4h5.3L9.6 22l8.4-11.6h-5.3L13.2 2Z" />
    </svg>
  );
}

/** "?" in a circle (TaterGhost icon="help"). */
export function HelpIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth="2.4" {...STROKE} aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.8.4-1 .9-1 1.7M12 17h.01" />
    </svg>
  );
}

/** Green/gold confetti palette for `<WinBurst colors={TM_CONFETTI} />` (module constant → stable memo). */
export const TM_CONFETTI = ["#1F8A47", "#FFD23F", "#F0A800", "#4CCB68", "#FF5208", "#2B6DEF", "#96EB3D"];
