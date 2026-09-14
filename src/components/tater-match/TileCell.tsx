"use client";

import type { TileKind } from "@/components/tater-match/taterMatchTypes";

const TILE_META: Record<
  TileKind,
  { label: string; emoji: string; bg: string }
> = {
  potato: {
    label: "Potato",
    emoji: "🥔",
    bg: "from-[#FFE8B8] to-[#F5C878]",
  },
  bag: {
    label: "PB Bag",
    emoji: "🛍️",
    bg: "from-[#E8D4FF] to-[#B794F6]",
  },
  leaf: {
    label: "Leaf",
    emoji: "🍃",
    bg: "from-[#D4F5DE] to-[#86EFAC]",
  },
  tractor: {
    label: "Tractor",
    emoji: "🚜",
    bg: "from-[#FECACA] to-[#F87171]",
  },
  onion: {
    label: "Onion",
    emoji: "🧅",
    bg: "from-[#FDE2E2] to-[#FB7185]",
  },
  crate: {
    label: "Crate",
    emoji: "📦",
    bg: "from-[#D6EBFF] to-[#7DD3FC]",
  },
};

type TileCellProps = {
  kind: TileKind;
  selected?: boolean;
  matched?: boolean;
  size?: "sm" | "md";
};

export function TileCell({
  kind,
  selected = false,
  matched = false,
  size = "md",
}: TileCellProps) {
  const meta = TILE_META[kind];
  const dim = size === "sm" ? "h-7 w-7 text-sm" : "h-full w-full text-[1.35rem] sm:text-[1.5rem]";

  return (
    <span
      className={`relative flex ${dim} items-center justify-center rounded-[0.7rem] bg-gradient-to-b ${meta.bg} shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_2px_4px_rgba(15,40,80,0.12)] transition-transform ${
        selected ? "scale-105 ring-[3px] ring-[#F5C518] ring-offset-1" : ""
      } ${matched ? "scale-110 brightness-110" : ""}`}
      aria-label={meta.label}
    >
      <span className="drop-shadow-sm" aria-hidden>
        {meta.emoji}
      </span>
      {kind === "bag" ? (
        <span className="absolute bottom-0.5 text-[7px] font-extrabold leading-none text-[#5B21B6]">
          PB
        </span>
      ) : null}
    </span>
  );
}

export function GoalPotatoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center text-base ${className}`} aria-hidden>
      🥔
    </span>
  );
}
