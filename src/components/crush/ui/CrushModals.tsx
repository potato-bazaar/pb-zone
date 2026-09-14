"use client";

import type { ReactNode } from "react";
import { BOOSTER_INFO, MAX_LIVES } from "../engine/levels";
import type { BoosterType, LevelDef } from "../engine/types";
import { CrushButton, HeartIcon, Star, TileIcon } from "./crushUi";
import { LevelObjectiveList } from "./CrushLevelMap";

/* ------------------------------------------------------------------ */
/*  Bottom sheet shell                                                 */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  children,
  tone = "light",
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  tone?: "light" | "dark";
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="crush-fade-in absolute inset-0 bg-[#1a0f3d]/55 backdrop-blur-[2px]"
      />
      <div
        className={`crush-sheet-in relative w-full max-w-screen-sm rounded-t-[1.75rem] px-5 pt-3 shadow-[0_-10px_40px_rgba(0,0,0,0.25)] ${
          tone === "dark" ? "bg-[#2B1A5E] text-white" : "bg-white text-[#1a1a2e]"
        }`}
        style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <span className="mx-auto mb-3 block h-1.5 w-12 rounded-full bg-black/10" aria-hidden />
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pre-level sheet                                                    */
/* ------------------------------------------------------------------ */

export function LevelSheet({
  level,
  stars,
  bestScore,
  lives,
  onPlay,
  onClose,
}: {
  level: LevelDef;
  stars: number;
  bestScore: number;
  lives: number;
  onPlay: () => void;
  onClose: () => void;
}) {
  const diff = { easy: "#2A9B5C", medium: "#E08A00", hard: "#DC2626" }[level.difficulty];
  return (
    <Sheet open onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-[12px] font-bold uppercase tracking-[0.18em] text-[#8B84A8]">
            Level {level.order}
          </p>
          <h2 className="font-display text-[24px] font-extrabold leading-tight text-[#3D2E7A]">{level.name}</h2>
        </div>
        <span
          className="mt-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white"
          style={{ backgroundColor: diff }}
        >
          {level.difficulty}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-1">
        {[1, 2, 3].map((n) => (
          <Star key={n} filled={stars >= n} size={n === 2 ? 40 : 32} className={n === 2 ? "-mt-2" : ""} />
        ))}
      </div>
      {bestScore > 0 ? (
        <p className="mt-1 text-center text-[12px] font-semibold text-[#6B6488]">
          Best score {bestScore.toLocaleString("en-IN")}
        </p>
      ) : null}

      <div className="mt-4">
        <p className="mb-2 font-display text-[12px] font-bold uppercase tracking-[0.18em] text-[#8B84A8]">Objectives</p>
        <LevelObjectiveList level={level} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Stat label="Moves" value={String(level.moves)} />
        <Stat label="Board" value={`${level.cols}×${level.rows}`} />
        <Stat label="Tiles" value={String(level.tileIds.length)} />
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5 overflow-hidden">
        {level.tileIds.map((id) => (
          <TileIcon key={id} id={`${id}#none`} size={30} />
        ))}
      </div>

      <div className="mt-4">
        <CrushButton onClick={onPlay} variant="gold" disabled={lives <= 0}>
          {lives > 0 ? "Play" : "No lives left"}
        </CrushButton>
        <p className="mt-2 text-center text-[11px] text-[#8B84A8]">
          Winning is free. Losing or quitting costs one life.
        </p>
      </div>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F5F3FF] py-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#8B84A8]">{label}</p>
      <p className="font-display text-[18px] font-extrabold text-[#3D2E7A]">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lives sheet                                                        */
/* ------------------------------------------------------------------ */

export function LivesSheet({
  lives,
  countdown,
  coins,
  refillPrice,
  onRefill,
  onClose,
}: {
  lives: number;
  countdown: string | null;
  coins: number;
  refillPrice: number;
  onRefill: () => void;
  onClose: () => void;
}) {
  const full = lives >= MAX_LIVES;
  return (
    <Sheet open onClose={onClose}>
      <h2 className="text-center font-display text-[22px] font-extrabold text-[#3D2E7A]">Lives</h2>
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {Array.from({ length: MAX_LIVES }, (_, i) => (
          <HeartIcon key={i} size={34} dim={i >= lives} />
        ))}
      </div>
      <p className="mt-3 text-center text-[13px] text-[#6B6488]">
        {full
          ? "You are fully stocked. Go crush some spuds!"
          : `Next life in ${countdown ?? "a moment"}. One life refills every 30 minutes.`}
      </p>
      <div className="mt-4">
        <CrushButton onClick={onRefill} variant="gold" disabled={full || coins < refillPrice}>
          Refill all lives · {refillPrice} Coins
        </CrushButton>
        {!full && coins < refillPrice ? (
          <p className="mt-2 text-center text-[11px] font-semibold text-[#DC2626]">Not enough Coins.</p>
        ) : null}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Booster shop sheet                                                 */
/* ------------------------------------------------------------------ */

export function ShopSheet({
  type,
  owned,
  coins,
  onBuy,
  onClose,
}: {
  type: BoosterType;
  owned: number;
  coins: number;
  onBuy: () => void;
  onClose: () => void;
}) {
  const info = BOOSTER_INFO[type];
  return (
    <Sheet open onClose={onClose}>
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F5F3FF] text-[34px]">
          {info.emoji}
        </span>
        <div>
          <h2 className="font-display text-[22px] font-extrabold text-[#3D2E7A]">{info.label}</h2>
          <p className="text-[13px] text-[#6B6488]">{info.blurb}</p>
          <p className="mt-1 text-[12px] font-bold text-[#6A5AE0]">You own {owned}</p>
        </div>
      </div>
      <div className="mt-5">
        <CrushButton onClick={onBuy} variant="gold" disabled={coins < info.price}>
          Buy 1 · {info.price} Coins
        </CrushButton>
        {coins < info.price ? (
          <p className="mt-2 text-center text-[11px] font-semibold text-[#DC2626]">Not enough Coins.</p>
        ) : null}
      </div>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  How to play                                                        */
/* ------------------------------------------------------------------ */

export function HowToSheet({ onClose }: { onClose: () => void }) {
  const rows: { icon: string; title: string; body: string }[] = [
    { icon: "russet#none", title: "Match 3", body: "Swipe a spud into a line of three or more to pop them." },
    { icon: "fries#stripedH", title: "Match 4 → Fryer Line", body: "Clears a whole row or column when popped." },
    { icon: "vitelotte#wrapped", title: "L or T shape → Oil Splash", body: "Explodes twice in a 3×3 area." },
    { icon: "special:bomb", title: "Match 5 → Rainbow Spud", body: "Swap with any tile to clear that colour. Swap with another special for a mega combo." },
    { icon: "blocker:ice", title: "Ice", body: "Frozen tiles can't move. Match them to crack the ice." },
    { icon: "blocker:crate", title: "Crates & Butter", body: "Match right beside them to break them." },
    { icon: "blocker:soil", title: "Soil", body: "Match on top of the soil to clear it." },
  ];
  return (
    <Sheet open onClose={onClose}>
      <h2 className="text-center font-display text-[22px] font-extrabold text-[#3D2E7A]">How to play</h2>
      <ul className="mt-3 flex max-h-[55dvh] flex-col gap-2 overflow-y-auto pr-1">
        {rows.map((r) => (
          <li key={r.title} className="flex items-center gap-3 rounded-2xl bg-[#F5F3FF] px-3 py-2">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
              <TileIcon id={r.icon} size={36} />
            </span>
            <div>
              <p className="font-display text-[14px] font-bold text-[#3D2E7A]">{r.title}</p>
              <p className="text-[12px] leading-snug text-[#6B6488]">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <CrushButton onClick={onClose}>Got it</CrushButton>
      </div>
    </Sheet>
  );
}
