import { Baloo_2 } from "next/font/google";
import Image from "next/image";
import { HubSpinDot } from "@/components/hub/HubSpinDot";
import { HubTile } from "@/components/hub/HubTile";
import { HUB_TILES } from "@/data/hubTiles";

/** The reference's "PB Zone" is heavier than Fredoka 700 goes; loaded here so only the hub fetches it. */
const wordmark = Baloo_2({ subsets: ["latin"], weight: "800", display: "swap" });

/** Leaf sprites for the four viewport corners (sizes are the files' own, cut from the 1024px reference). */
const LEAVES = [
  { corner: "tl", src: "/games/hub-v2/leaves-tl.webp", width: 141, height: 232 },
  { corner: "tr", src: "/games/hub-v2/leaves-tr.webp", width: 138, height: 232 },
  { corner: "bl", src: "/games/hub-v2/leaves-bl.webp", width: 246, height: 129 },
  { corner: "br", src: "/games/hub-v2/leaves-br.webp", width: 232, height: 128 },
] as const;

/** Tiles rise in one after another, this far apart. */
const RISE_STEP_MS = 60;

/** Two short orange strokes radiating away from a heading; mirrored on the right. */
function Sparks({ side, className }: { side: "left" | "right"; className: string }) {
  return (
    <svg
      viewBox="0 0 62 58"
      className={`text-[var(--hub-accent)] ${side === "right" ? "-scale-x-100" : ""} ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="11"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M35.5 5.5 56.5 27.5M5.5 49.5l28 3.5" />
    </svg>
  );
}

/** PB Zone hub: one yellow screen with the four tiles. No header bar, no coin pill, no bottom nav. */
export function PbZoneHub() {
  return (
    <main className="hub-root">
      {LEAVES.map((leaf) => (
        <Image
          key={leaf.corner}
          src={leaf.src}
          alt=""
          width={leaf.width}
          height={leaf.height}
          loading="eager"
          draggable={false}
          className={`hub-leaf hub-leaf-${leaf.corner}`}
          aria-hidden
        />
      ))}

      <div className="hub-col">
        <header className="hub-heading hub-rise-soft">
          {/* One line at any text size: with very large text the sparks shrink to make room, never the words. */}
          <h1
            className={`${wordmark.className} flex items-start justify-center gap-[0.26em] text-[clamp(40px,12.4vw,54px)] leading-[0.75] tracking-[-0.015em] text-[var(--hub-ink)]`}
          >
            <Sparks side="left" className="mt-[0.05em] w-[0.47em] min-w-0" />
            <span className="whitespace-nowrap">PB Zone</span>
            <Sparks side="right" className="mt-[0.05em] w-[0.47em] min-w-0" />
          </h1>
          <p className="mt-[0.05em] text-balance font-display text-[clamp(16px,4.6vw,20px)] font-semibold leading-tight text-[var(--hub-ink)]">
            Play, Learn &amp; Earn Rewards
          </p>
        </header>

        <nav aria-label="PB Zone" className="hub-nav">
          <ul className="hub-grid">
            {HUB_TILES.map((tile, i) => (
              <li key={tile.id} className="hub-rise" style={{ animationDelay: `${(i + 1) * RISE_STEP_MS}ms` }}>
                <HubTile tile={tile} highPriority={i < 2} badge={tile.id === "spin" ? <HubSpinDot /> : null} />
              </li>
            ))}
          </ul>
        </nav>

        <p
          className="hub-tagline hub-rise-soft flex items-end justify-center gap-[0.6em] font-display text-[15px] font-semibold leading-none text-[var(--hub-ink)]"
          style={{ animationDelay: `${(HUB_TILES.length + 1) * RISE_STEP_MS}ms` }}
        >
          <Sparks side="left" className="w-[1.2em] shrink-0" />
          {/* Large text wraps it between the two sentences, centred. */}
          <span className="text-center">
            <span className="whitespace-nowrap">A little fun.</span> <span className="whitespace-nowrap">A lot to learn.</span>
          </span>
          <Sparks side="right" className="w-[1.2em] shrink-0" />
        </p>
      </div>
    </main>
  );
}
