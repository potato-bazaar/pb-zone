"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { usePbCoins } from "@/components/providers/PbCoinsProvider";
import { ALL_GAMES, GAME_CATEGORIES, type GameCategory, type GameItem } from "@/data/games";

type Filter = "all" | GameCategory;

/** "POTATO RUN" → "Potato Run", for labels that get read aloud. */
function displayName(title: string) {
  return title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Icons & decoration                                                 */
/* ------------------------------------------------------------------ */

function CategoryIcon({ category, className = "h-5 w-5" }: { category: GameCategory; className?: string }) {
  if (category === "arcade") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M7.3 6.6h9.4c2.2 0 3.9 1.5 4.4 3.6l1 4.7c.5 2.3-.9 4.3-3.1 4.5-.9.1-1.7-.3-2.3-1l-1.1-1.3c-.4-.5-1-.7-1.6-.7h-4c-.6 0-1.2.2-1.6.7l-1.1 1.3c-.6.7-1.4 1.1-2.3 1-2.2-.2-3.6-2.2-3.1-4.5l1-4.7c.5-2.1 2.2-3.6 4.4-3.6Z" fill="#5C6CFF" />
        <path d="M7.4 9.7v1.5H5.9v1.7h1.5v1.5h1.7v-1.5h1.5v-1.7H9.1V9.7Z" fill="#fff" />
        <circle cx="15.7" cy="10.9" r="1.1" fill="#FFD23F" />
        <circle cx="17.9" cy="13" r="1.1" fill="#FF7AC2" />
      </svg>
    );
  }
  if (category === "brain") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <path d="M11.3 5.1C10.8 4.1 9.9 3.5 8.9 3.5c-1.5 0-2.7 1-3 2.4-1.5.4-2.6 1.7-2.6 3.3 0 .7.2 1.3.6 1.8-.6.6-1 1.4-1 2.3 0 1.5 1 2.8 2.4 3.2.2 1.7 1.6 3 3.3 3 1.1 0 2.1-.5 2.7-1.3Z" fill="#FF6FAE" />
        <path d="M12.7 5.1c.5-1 1.4-1.6 2.4-1.6 1.5 0 2.7 1 3 2.4 1.5.4 2.6 1.7 2.6 3.3 0 .7-.2 1.3-.6 1.8.6.6 1 1.4 1 2.3 0 1.5-1 2.8-2.4 3.2-.2 1.7-1.6 3-3.3 3-1.1 0-2.1-.5-2.7-1.3Z" fill="#FF8DC4" />
        <path d="M6.4 9c1.3-.1 2.4.7 2.7 1.9M5.5 13.6c1.1-.7 2.5-.6 3.5.3M17.6 9c-1.3-.1-2.4.7-2.7 1.9M18.5 13.6c-1.1-.7-2.5-.6-3.5.3" fill="none" stroke="#D2357F" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M2.8 5.7c2.9-.9 5.9-.6 8.4 1.1v12.7c-2.5-1.6-5.5-2-8.4-1.1Z" fill="#3CC46A" />
      <path d="M21.2 5.7c-2.9-.9-5.9-.6-8.4 1.1v12.7c2.5-1.6 5.5-2 8.4-1.1Z" fill="#23A04F" />
      <path d="M5 9c1.4-.2 2.8 0 4.1.6M5 11.9c1.4-.2 2.8 0 4.1.6M19 9c-1.4-.2-2.8 0-4.1.6" fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function CrownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" fill="#FFB300" stroke="#8A5A00" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M5 19h14" stroke="#8A5A00" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m9.5 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  );
}

function Sparkle({ className, color = "#FFC531" }: { className: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={color} aria-hidden>
      <path d="M12 0c.8 6.4 5.6 11.2 12 12-6.4.8-11.2 5.6-12 12-.8-6.4-5.6-11.2-12-12C6.4 11.2 11.2 6.4 12 0Z" />
    </svg>
  );
}

function Cloud({ className, style }: { className: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 64 32" className={className} style={style} aria-hidden>
      <path d="M14 30h38a10 10 0 0 0 1.6-19.9A14 14 0 0 0 27 8.5 10 10 0 0 0 12.2 16 7 7 0 0 0 14 30Z" fill="#fff" />
    </svg>
  );
}

/** Little motion marks either side of the wordmark. Sized in em so they track the title. */
function Burst({ side }: { side: "left" | "right" }) {
  if (side === "left") {
    return (
      <svg viewBox="0 0 20 28" className="absolute -left-[0.6em] top-[0.06em] h-[0.72em] w-[0.5em]" fill="none" strokeWidth="3.2" strokeLinecap="round" aria-hidden>
        <path d="M17 8 9.5 3" stroke="#FFC531" />
        <path d="M15.5 14.5H4" stroke="#FF8A1F" />
        <path d="m17 21-7.5 5" stroke="#FFC531" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 28" className="absolute -right-[0.58em] -top-[0.08em] h-[0.72em] w-[0.5em]" fill="none" strokeWidth="3.2" strokeLinecap="round" aria-hidden>
      <path d="M3 10.5 11 4" stroke="#FF8A1F" />
      <path d="m5 17.5 11-4.5" stroke="#FFC531" />
    </svg>
  );
}

function HeaderDecor() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-52 overflow-hidden" aria-hidden>
      <Cloud className="absolute right-[7.6rem] w-11 opacity-90" style={{ top: "calc(var(--header-top) + 0.2rem)" }} />
      <Cloud className="absolute right-[6.2rem] w-6 opacity-70" style={{ top: "calc(var(--header-top) + 1.7rem)" }} />
      <Image
        src="/games/match/foliage.webp"
        alt=""
        width={177}
        height={220}
        sizes="52px"
        className="absolute -left-5 w-[3.25rem] -rotate-[28deg] opacity-90"
        style={{ top: "calc(var(--header-top) + 2.9rem)" }}
      />
      <Image
        src="/games/match/leaf-sprig.webp"
        alt=""
        width={150}
        height={137}
        sizes="44px"
        className="absolute -right-3 w-11 rotate-[24deg] opacity-90"
        style={{ top: "calc(var(--header-top) + 3rem)" }}
      />
    </div>
  );
}

function PlayIcon({ color }: { color: string }) {
  return (
    <span className="grid h-[1.55em] w-[1.55em] shrink-0 place-items-center rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]">
      <svg viewBox="0 0 24 24" className="ml-[0.1em] h-[0.78em] w-[0.78em]" fill={color} aria-hidden>
        <path d="M7 4.8v14.4c0 .8.9 1.3 1.6.9l11-7.2c.6-.4.6-1.4 0-1.8l-11-7.2C7.9 3.5 7 4 7 4.8Z" />
      </svg>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Cards                                                              */
/* ------------------------------------------------------------------ */

/**
 * The card's only link. Its ::after stretches over the whole card (the nearest positioned
 * ancestor), so a tap anywhere launches the game while screen readers hear one link.
 */
function PlayLink({ game, className = "" }: { game: GameItem; className?: string }) {
  const { theme } = game;
  const verb = game.playable ? "Play" : "Preview";
  return (
    <Link
      href={`/games/${game.id}`}
      aria-label={`${verb} ${displayName(game.title)}`}
      className={`self-start rounded-full outline-none after:absolute after:inset-0 after:z-10 after:content-[''] ${className}`}
    >
      <span
        className="hub-cta inline-flex items-center gap-[0.45em] whitespace-nowrap rounded-full py-[0.38em] pl-[0.38em] pr-[0.95em] font-display font-bold leading-none text-white"
        style={{
          background: `linear-gradient(180deg, ${theme.button[0]} 0%, ${theme.button[1]} 100%)`,
          boxShadow: `0 3px 0 ${theme.buttonEdge ?? theme.shade}, 0 6px 12px rgba(0, 0, 0, 0.14)`,
        }}
      >
        <PlayIcon color={theme.button[1]} />
        {verb} Now
      </span>
    </Link>
  );
}

const CARD_FOCUS = "has-[a:focus-visible]:ring-4 has-[a:focus-visible]:ring-[#7C5CFF]/60";

/** `eager` for anything above the fold; `priority` only for the featured (LCP) art. */
function CardArt({ game, sizes, position, eager = false, priority = false }: { game: GameItem; sizes: string; position: string; eager?: boolean; priority?: boolean }) {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit]" aria-hidden>
      <Image
        src={game.cardImage ?? game.image}
        alt=""
        fill
        sizes={sizes}
        loading={eager || priority ? "eager" : undefined}
        fetchPriority={priority ? "high" : undefined}
        className="hub-art object-cover"
        style={{ objectPosition: position }}
      />
      {/* Light wash behind the text column so dark copy stays readable on any artwork. */}
      <div className="absolute inset-0" style={{ background: `linear-gradient(100deg, ${game.theme.wash} 0%, ${game.theme.wash} 24%, rgba(255, 255, 255, 0) 60%)` }} />
    </div>
  );
}

function FeaturedCard({ game }: { game: GameItem }) {
  const { theme } = game;
  return (
    // The wrapper is the size container: the article's 44% right padding would shrink cqi on the article itself.
    <div className="game-card @container mb-3.5">
      <article
        className={`hub-card relative isolate flex flex-col items-start justify-center rounded-[1.6rem] py-4 pl-4 pr-[44%] shadow-[0_14px_30px_rgba(190,110,10,0.24)] ring-1 ring-white/80 ${CARD_FOCUS}`}
        style={{ minHeight: "calc((min(100vw, 40rem) - 2rem) / 1.9)" }}
      >
        <CardArt game={game} sizes="(max-width: 640px) calc(100vw - 2rem), 608px" position="72% 50%" priority />
        <div className="game-card-shine pointer-events-none absolute inset-0 -z-10 rounded-[inherit]" aria-hidden />

        <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF6DC]/95 px-2 py-[0.3em] text-[clamp(9.5px,2.8cqi,13px)] font-extrabold uppercase tracking-wider text-[#8A4B00] shadow-[0_2px_6px_rgba(138,75,0,0.18)] ring-1 ring-[#FFE1A0]">
          <CrownIcon className="h-[1.3em] w-[1.3em]" />
          Featured
        </span>
        <h2
          className="hub-title mt-[2.2cqi] whitespace-nowrap font-display text-[clamp(28px,10.5cqi,54px)] font-bold uppercase leading-none"
          style={{ color: theme.title[0], ["--shade" as string]: theme.shade }}
        >
          {game.title}
        </h2>
        <p className="mt-[2.4cqi] max-w-[11em] text-[clamp(12.5px,3.9cqi,18px)] font-bold leading-[1.25] text-[#2A1E4F]">{game.blurb ?? game.shortDescription}</p>
        <PlayLink game={game} className="mt-[3.4cqi] text-[clamp(14px,4.6cqi,21px)]" />
      </article>
    </div>
  );
}

function GameCard({ game, index }: { game: GameItem; index: number }) {
  const { theme } = game;
  const [first, ...rest] = game.title.split(" ");
  const category = GAME_CATEGORIES.find((c) => c.id === game.category);

  return (
    <li className="game-card" style={{ animationDelay: `${(index + 1) * 70}ms` }}>
      <article
        className={`hub-card @container relative isolate flex h-full flex-col rounded-[1.4rem] p-[clamp(0.7rem,3.2vw,1.1rem)] shadow-[0_10px_24px_rgba(52,34,140,0.16)] ring-1 ring-white/70 ${CARD_FOCUS}`}
        style={{ minHeight: "calc((min(100vw, 40rem) - 2.75rem) / 1.8)" }}
      >
        <CardArt game={game} sizes="(max-width: 640px) 46vw, 300px" position="70% 38%" eager={index < 2} />

        <h2
          className="hub-title font-display text-[clamp(17px,12.5cqi,30px)] font-bold uppercase leading-[0.95]"
          style={{ ["--shade" as string]: theme.shade }}
        >
          <span className="block" style={{ color: theme.title[0] }}>{first}</span>{" "}
          {rest.length ? <span className="block" style={{ color: theme.title[1] }}>{rest.join(" ")}</span> : null}
        </h2>
        {category ? (
          <span className="mt-[3.6cqi] inline-flex items-center gap-[0.3em] self-start rounded-full bg-white/90 py-[0.2em] pl-[0.3em] pr-[0.65em] text-[clamp(10px,6.2cqi,13px)] font-extrabold text-[#3B2F7A] shadow-[0_1px_4px_rgba(0,0,0,0.12)]">
            <CategoryIcon category={game.category} className="h-[1.35em] w-[1.35em]" />
            {category.label}
          </span>
        ) : null}
        <p className="mt-[3cqi] max-w-[max(52%,4.75rem)] text-[clamp(11.5px,6.9cqi,15px)] font-bold leading-[1.22] text-[#22184A]">{game.blurb ?? game.shortDescription}</p>

        <div className="mt-auto flex items-center gap-1.5 pt-[4.5cqi]">
          <PlayLink game={game} className="text-[clamp(12.5px,8.2cqi,17px)]" />
          {!game.playable ? (
            <span className="rounded-full bg-[#111A2F]/70 px-2 py-[3px] text-[9px] font-extrabold uppercase tracking-wider text-white ring-1 ring-white/30">Soon</span>
          ) : null}
        </div>
      </article>
    </li>
  );
}

function RewardsBanner() {
  return (
    <Link
      href="/rewards"
      className="hub-card group relative isolate mt-4 flex min-h-[5.75rem] items-center gap-2 rounded-[1.4rem] py-3 pr-3 pl-[clamp(7.25rem,35%,10.5rem)] shadow-[0_10px_24px_rgba(150,100,20,0.14)] ring-1 ring-white/80 outline-none focus-visible:ring-4 focus-visible:ring-[#7C5CFF]/60"
    >
      <span className="absolute inset-0 -z-10 overflow-hidden rounded-[inherit] bg-[linear-gradient(100deg,#FFE7B0_0%,#FFF3D6_34%,#FFF8EC_66%,#F4EEFF_100%)]" aria-hidden>
        <Sparkle className="absolute left-[30%] top-2 w-3" />
        <Sparkle className="absolute left-2 top-3 w-2.5" color="#FFD966" />
        <Sparkle className="absolute bottom-3 left-[33%] w-2" color="#FFD966" />
      </span>
      <Image
        src="/games/hub/rewards-gift.webp"
        alt=""
        width={520}
        height={422}
        sizes="(max-width: 640px) 34vw, 168px"
        className="hub-art pointer-events-none absolute bottom-1.5 left-2 w-[clamp(6.5rem,32%,9.75rem)] drop-shadow-[0_6px_8px_rgba(120,70,0,0.22)]"
      />
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[clamp(16px,4.8vw,22px)] font-bold leading-[1.08] text-[#2B1677]">
          Play Games<span className="sr-only">,</span>{" "}
          <br />
          Earn Rewards
        </h2>
        <p className="mt-1 text-[clamp(11px,3.1vw,13px)] font-semibold leading-snug text-[#6A6290]">The more you play, the more you earn!</p>
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#5B3FE0] shadow-[0_4px_10px_rgba(76,52,170,0.18)] ring-1 ring-[#EEE8FF] transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden>
        <ChevronIcon className="h-5 w-5" />
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen                                                             */
/* ------------------------------------------------------------------ */

function FilterBar({ value, onChange }: { value: Filter; onChange: (next: Filter) => void }) {
  return (
    <div role="group" aria-label="Filter games by category" className="mt-3.5 grid grid-cols-4 gap-[clamp(0.375rem,2vw,0.625rem)] pb-3">
      {GAME_CATEGORIES.map((cat) => {
        const active = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(cat.id)}
            className={`hit-slop inline-flex h-10 min-w-0 items-center justify-center gap-[0.3em] rounded-full px-1 text-[clamp(11.5px,3.6vw,15px)] font-extrabold transition-[transform,box-shadow,color] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CFF] ${
              active
                ? "bg-gradient-to-b from-[#9277FF] to-[#5B3FE0] text-white shadow-[0_6px_14px_rgba(91,63,224,0.35)]"
                : "bg-white text-[#2B1677] shadow-[0_3px_10px_rgba(76,52,170,0.08)] ring-1 ring-[#E9E3FF]"
            }`}
          >
            {cat.id === "all" ? null : (
              <span className={`grid shrink-0 place-items-center rounded-full p-[0.1em] ${active ? "bg-white" : ""}`}>
                <CategoryIcon category={cat.id} className="h-[1.3em] w-[1.3em]" />
              </span>
            )}
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

const GUTTER: CSSProperties = {
  paddingLeft: "max(1rem, env(safe-area-inset-left, 0px))",
  paddingRight: "max(1rem, env(safe-area-inset-right, 0px))",
};

/* The pinned header stays put; content fades out under its edge instead of a hard cut. */
const SCROLL_FADE = "linear-gradient(to bottom, transparent 0, #000 0.75rem)";

export function AllGamesScreen() {
  const { coins } = usePbCoins();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = filter === "all" ? ALL_GAMES : ALL_GAMES.filter((g) => g.category === filter);
  const featured = visible.find((g) => g.featured);
  const grid = visible.filter((g) => g !== featured);
  const coinsDisplay = Number.isFinite(coins) ? Math.max(0, Math.floor(coins)).toLocaleString("en-IN") : "0";

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden">
      <div className="games-bg pointer-events-none absolute inset-0" aria-hidden />
      <HeaderDecor />

      <div className="relative z-20 shrink-0" style={{ ...GUTTER, paddingTop: "var(--header-top)" }}>
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0 pl-[clamp(0.9rem,4.2vw,1.25rem)]">
            <h1 className="font-display text-[clamp(30px,9.4vw,42px)] font-bold leading-none">
              <span className="relative inline-block">
                <Burst side="left" />
                <span className="hub-brand">PB Zone</span>
                <Burst side="right" />
              </span>
            </h1>
            <p className="mt-1.5 text-[clamp(12px,3.6vw,15px)] font-bold tracking-[0.01em] text-[#5E5592]">Play. Learn. Earn. Grow.</p>
          </div>
          <Link
            href="/rewards"
            aria-label={`${coinsDisplay} coins. Open rewards`}
            className="mt-0.5 flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white pl-1.5 pr-2.5 shadow-[0_6px_18px_rgba(43,31,122,0.14)] ring-1 ring-[#ECE8FA] transition-transform duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7C5CFF]"
          >
            <Image src="/images/home/coin-transparent.png" alt="" width={64} height={64} sizes="28px" className="h-7 w-7 shrink-0 object-contain" />
            <span className="font-display text-[17px] font-bold tabular-nums text-[#2B1677]">{coinsDisplay}</span>
            <ChevronIcon className="h-4 w-4 text-[#8C84B8]" />
          </Link>
        </header>

        <FilterBar value={filter} onChange={setFilter} />
      </div>

      <main
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain pt-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]"
        style={{ ...GUTTER, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.5rem)", maskImage: SCROLL_FADE, WebkitMaskImage: SCROLL_FADE }}
      >
        {featured ? <FeaturedCard key={`featured-${filter}`} game={featured} /> : null}

        {grid.length > 0 ? (
          <ul key={filter} className="grid grid-cols-2 gap-3">
            {grid.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} />
            ))}
          </ul>
        ) : null}

        {!featured && grid.length === 0 ? (
          <p className="rounded-[1.4rem] bg-white/70 px-4 py-8 text-center text-[13px] font-bold text-[#6A6290]">No games here yet. Check back soon!</p>
        ) : null}

        <RewardsBanner />
      </main>
    </div>
  );
}
