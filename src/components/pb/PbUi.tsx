"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { DAILY_CAP_MESSAGE, PB_GAME_LABELS, milestoneProgress } from "@/data/pbEconomy";
import type { PbReceipt } from "@/components/providers/PbPointsProvider";

/* ------------------------------------------------------------------ */
/*  PB identity: a purple star. Never a coin (FRD §23).                */
/* ------------------------------------------------------------------ */

export function PbStarIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="pbStarGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9C8CFF" />
          <stop offset="0.55" stopColor="#6A5AE0" />
          <stop offset="1" stopColor="#4A3BB8" />
        </linearGradient>
      </defs>
      <path
        d="M12 2.2l2.9 6.1 6.7.8-4.9 4.6 1.3 6.6L12 17.1l-6 3.2 1.3-6.6L2.4 9.1l6.7-.8L12 2.2z"
        fill="url(#pbStarGrad)"
        stroke="#3D2E9E"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path d="M12 6.2l1.6 3.4 3.7.4-2.7 2.5.7 3.7L12 14.4" fill="#fff" opacity="0.28" />
    </svg>
  );
}

export function PbPointsPill({
  points,
  className = "",
  size = "md",
  id,
}: {
  points: number;
  className?: string;
  size?: "sm" | "md";
  id?: string;
}) {
  const display = Math.max(0, Math.floor(points)).toLocaleString("en-IN");
  return (
    <span
      id={id}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#E1DBFF] bg-white shadow-[0_2px_8px_rgba(106,90,224,0.12)] ${
        size === "sm" ? "py-1 pl-1.5 pr-2.5" : "py-1.5 pl-2 pr-3"
      } ${className}`}
      role="status"
      aria-label={`${display} PB points`}
    >
      <PbStarIcon className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      <span className={`font-extrabold tabular-nums text-[#241A5E] ${size === "sm" ? "text-[12px]" : "text-sm"}`}>
        {display} <span className="text-[#6A5AE0]">PB</span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Rank movement  (#21 → #17 ↑4)                                      */
/* ------------------------------------------------------------------ */

export function MovementBadge({ delta, size = "sm" }: { delta: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "text-[13px] px-2.5 py-1" : "text-[11px] px-1.5 py-0.5";
  if (delta > 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full bg-[#E6F7EC] font-extrabold text-[#1E8A3E] ${cls}`}>
        ↑{delta}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className={`inline-flex items-center gap-0.5 rounded-full bg-[#FDECEC] font-extrabold text-[#C62828] ${cls}`}>
        ↓{Math.abs(delta)}
      </span>
    );
  }
  return <span className={`inline-flex items-center rounded-full bg-[#F0EEF8] font-extrabold text-[#8B84A8] ${cls}`}>—</span>;
}

export function RankMovement({ from, to, size = "md" }: { from: number; to: number; size?: "sm" | "md" }) {
  const delta = from - to;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className={`flex items-center gap-2 font-display font-extrabold text-[#241A5E] ${size === "sm" ? "text-[17px]" : "text-[22px]"}`}>
        <span className="text-[#8B84A8]">#{from}</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#6A5AE0]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
        <span>#{to}</span>
      </div>
      {delta > 0 ? (
        <span className="rounded-full bg-[#E6F7EC] px-3 py-1 text-[13px] font-extrabold text-[#1E8A3E]">↑ {delta} {delta === 1 ? "place" : "places"}!</span>
      ) : delta < 0 ? (
        <span className="rounded-full bg-[#FDECEC] px-3 py-1 text-[13px] font-extrabold text-[#C62828]">↓ {Math.abs(delta)} {delta === -1 ? "place" : "places"}</span>
      ) : (
        <span className="rounded-full bg-[#F0EEF8] px-3 py-1 text-[13px] font-extrabold text-[#8B84A8]">Holding steady</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lifetime milestone progress  (420 / 500 PB → PB Bottle)            */
/* ------------------------------------------------------------------ */

export function MilestoneProgressBar({ lifetimePoints, compact = false }: { lifetimePoints: number; compact?: boolean }) {
  const p = milestoneProgress(lifetimePoints);
  if (!p.next) {
    return (
      <div className={compact ? "text-[12px]" : "text-[13px]"}>
        <p className="font-extrabold text-[#1E8A3E]">All milestones unlocked!</p>
        <p className="text-[#6B6488]">Lifetime PB: {lifetimePoints.toLocaleString("en-IN")}</p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <p className={`truncate font-display font-extrabold text-[#241A5E] ${compact ? "text-[13px]" : "text-[15px]"}`}>{p.next.label}</p>
        <p className={`shrink-0 font-bold tabular-nums text-[#6A5AE0] ${compact ? "text-[11px]" : "text-[12px]"}`}>
          {lifetimePoints.toLocaleString("en-IN")} / {p.next.points.toLocaleString("en-IN")} PB
        </p>
      </div>
      <div className={`mt-1.5 overflow-hidden rounded-full bg-[#E6E0F8] ${compact ? "h-2" : "h-2.5"}`}>
        <div className="h-full rounded-full bg-gradient-to-r from-[#9C8CFF] to-[#6A5AE0] transition-[width] duration-700" style={{ width: `${p.pct}%` }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page chrome                                                        */
/* ------------------------------------------------------------------ */

export function PbHeader({
  title,
  backHref,
  onBack,
  right,
  tone = "light",
}: {
  title: string;
  backHref?: string;
  onBack?: () => void;
  right?: ReactNode;
  tone?: "light" | "dark";
}) {
  const iconCls =
    tone === "dark"
      ? "bg-white/15 text-white ring-1 ring-white/25"
      : "bg-white text-[#241A5E] shadow-[0_2px_8px_rgba(106,90,224,0.12)]";
  const back = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
  return (
    <header className="relative z-30 px-4 pb-2" style={{ paddingTop: "var(--header-top)" }}>
      <div className="relative flex min-h-[2.75rem] items-center justify-center">
        {backHref ? (
          <Link href={backHref} aria-label="Back" className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full ${iconCls}`}>
            {back}
          </Link>
        ) : onBack ? (
          <button type="button" onClick={onBack} aria-label="Back" className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full ${iconCls}`}>
            {back}
          </button>
        ) : null}
        <h1 className={`mx-12 truncate font-display text-[20px] font-extrabold ${tone === "dark" ? "text-white" : "text-[#241A5E]"}`}>{title}</h1>
        {right ? <div className="absolute right-0 flex items-center">{right}</div> : null}
      </div>
    </header>
  );
}

export function PlayerAvatar({
  size = "md",
  ringClass = "ring-white",
  src = "/images/home/avatar.png",
}: {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  ringClass?: string;
  src?: string;
}) {
  const cls = {
    xs: "h-7 w-7 ring-2",
    sm: "h-9 w-9 ring-2",
    md: "h-12 w-12 ring-[3px]",
    lg: "h-16 w-16 ring-[3.5px]",
    xl: "h-24 w-24 ring-4",
  }[size];
  return <Image src={src} alt="" width={96} height={96} className={`${cls} shrink-0 rounded-full bg-white object-cover ${ringClass}`} unoptimized />;
}

export function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[1.35rem] bg-white p-4 shadow-[0_4px_18px_rgba(36,26,94,0.06)] ${className}`}>{children}</section>;
}

/* ------------------------------------------------------------------ */
/*  Game Complete summary — Coins and Points shown separately          */
/* ------------------------------------------------------------------ */

function CoinIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="pbUiCoin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE566" />
          <stop offset="0.5" stopColor="#F5C518" />
          <stop offset="1" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#pbUiCoin)" stroke="#C4920A" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="7" fill="none" stroke="#FFF3A8" strokeWidth="1" opacity="0.7" />
      <text x="12" y="15.3" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#8B6914" fontFamily="system-ui, sans-serif">
        PB
      </text>
    </svg>
  );
}

export function RewardPills({ points, coins, size = "md" }: { points: number; coins: number; size?: "sm" | "md" }) {
  const big = size === "md";
  return (
    <div className={`flex flex-wrap items-center justify-center ${big ? "gap-3" : "gap-2"}`}>
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#EDE7FF] font-display font-extrabold text-[#3D2E7A] ring-1 ring-[#D4C8FF] ${big ? "px-4 py-2 text-[18px]" : "px-3 py-1.5 text-[14px]"}`}>
        <PbStarIcon className={big ? "h-6 w-6" : "h-5 w-5"} />+{points.toLocaleString("en-IN")} PB Points
      </span>
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-[#FFF6D6] font-display font-extrabold text-[#8A5A00] ring-1 ring-[#FFE082] ${big ? "px-4 py-2 text-[18px]" : "px-3 py-1.5 text-[14px]"}`}>
        <CoinIcon className={big ? "h-6 w-6" : "h-5 w-5"} />+{coins.toLocaleString("en-IN")} Coins
      </span>
    </div>
  );
}

/**
 * The "how you earned PB" block (FRD §23): breakdown, cap notice,
 * leaderboard movement and any milestone unlocked by this run.
 */
export function PbBreakdownCard({ receipt, compact = false }: { receipt: PbReceipt; compact?: boolean }) {
  const capped = receipt.cappedBy !== null && receipt.applied < receipt.requested;
  const zeroDay = receipt.cappedBy === "daily" && receipt.applied === 0;
  const moved = receipt.applied > 0 && receipt.rankAfter !== receipt.rankBefore;
  const gameMoved = receipt.applied > 0 && receipt.gameRankAfter !== receipt.gameRankBefore;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <div className={`rounded-2xl bg-[#F5F3FF] ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
        <div className="flex items-center justify-between">
          <p className={`font-display font-extrabold text-[#241A5E] ${compact ? "text-[13px]" : "text-[15px]"}`}>PB Breakdown</p>
          <PbStarIcon className="h-4 w-4" />
        </div>
        {receipt.duplicate ? (
          <p className="mt-1.5 text-[12px] font-semibold text-[#8B84A8]">This run was already credited.</p>
        ) : receipt.lines.length === 0 ? (
          <p className="mt-1.5 text-[12px] font-semibold text-[#8B84A8]">No PB this time. Points reward accuracy, speed and completed objectives.</p>
        ) : (
          <ul className={`mt-1.5 divide-y divide-[#E6E0F8] ${compact ? "text-[12px]" : "text-[13px]"}`}>
            {receipt.lines.map((line) => (
              <li key={line.label} className="flex items-center justify-between py-1.5">
                <span className="font-semibold text-[#3D2E7A]">{line.label}</span>
                <span className="font-extrabold tabular-nums text-[#241A5E]">+{line.points}</span>
              </li>
            ))}
            <li className="flex items-center justify-between pt-2">
              <span className="font-display font-extrabold text-[#241A5E]">Total</span>
              <span className="font-display font-extrabold tabular-nums text-[#6A5AE0]">+{receipt.applied} PB</span>
            </li>
          </ul>
        )}
        {capped ? (
          <p className="mt-2 rounded-xl bg-[#FFF3C4] px-3 py-2 text-[11.5px] font-bold text-[#8A5A00]">
            {zeroDay
              ? DAILY_CAP_MESSAGE
              : receipt.cappedBy === "daily"
                ? `Daily PB limit reached: ${receipt.applied} of ${receipt.requested} PB counted. ${DAILY_CAP_MESSAGE}`
                : `Daily limit for this game reached: ${receipt.applied} of ${receipt.requested} PB counted. Coins keep flowing.`}
          </p>
        ) : null}
      </div>

      {receipt.applied > 0 ? (
        <div className={`rounded-2xl bg-[#EDE7FF] ${compact ? "px-3 py-2.5" : "px-4 py-3"}`}>
          <p className={`font-display font-extrabold text-[#241A5E] ${compact ? "text-[13px]" : "text-[15px]"}`}>Leaderboard Movement</p>

          {/* This game's own board */}
          <div className="mt-2 rounded-xl bg-white/70 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6A5AE0]">{PB_GAME_LABELS[receipt.gameId]} board</p>
              <Link href={`/pb?game=${receipt.gameId}`} className="text-[11px] font-extrabold text-[#6A5AE0] underline underline-offset-2">
                View
              </Link>
            </div>
            <div className="mt-1">
              {gameMoved ? (
                <RankMovement from={receipt.gameRankBefore} to={receipt.gameRankAfter} size="sm" />
              ) : (
                <p className="text-[12.5px] font-semibold text-[#3D2E7A]">
                  Rank <span className="font-display text-[16px] font-extrabold text-[#241A5E]">#{receipt.gameRankAfter}</span> · {receipt.gamePointsAfter.toLocaleString("en-IN")} PB in this game
                </p>
              )}
            </div>
          </div>

          {/* Overall season board */}
          <div className="mt-2 rounded-xl bg-white/70 px-3 py-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#6A5AE0]">Overall season board</p>
              <Link href="/pb" className="text-[11px] font-extrabold text-[#6A5AE0] underline underline-offset-2">
                View
              </Link>
            </div>
            <div className="mt-1">
              {moved ? (
                <RankMovement from={receipt.rankBefore} to={receipt.rankAfter} size="sm" />
              ) : (
                <p className="text-[12.5px] font-semibold text-[#3D2E7A]">
                  Rank <span className="font-display text-[16px] font-extrabold text-[#241A5E]">#{receipt.rankAfter}</span> · {receipt.seasonPointsAfter.toLocaleString("en-IN")} season PB
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {receipt.unlocked.map((m) => (
        <div key={m.id} className={`flex items-center gap-3 rounded-2xl bg-[#E6F7EC] ring-1 ring-[#A9E9B2] ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
          <span className="text-[24px] leading-none">{m.emoji}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#1E8A3E]">Milestone unlocked</p>
            <p className="truncate font-display text-[14px] font-extrabold text-[#241A5E]">
              {m.points.toLocaleString("en-IN")} PB · {m.label}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
