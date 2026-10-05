"use client";

import type { TaterArtId } from "@/data/taterMatch";

/** Illustrated option tiles — potato-specific, works offline without photo pack. */
export function TaterOptionArt({
  art,
  className = "",
}: {
  art: TaterArtId;
  className?: string;
}) {
  switch (art) {
    case "potato-cream":
      return <PotatoSvg className={className} skin="#F3E2B8" eyes="#C9A86A" />;
    case "potato-yellow":
      return <PotatoSvg className={className} skin="#E8C84A" eyes="#B89220" />;
    case "potato-red":
      return <PotatoSvg className={className} skin="#D96B6B" eyes="#A33D3D" />;
    case "potato-russet":
      return <PotatoSvg className={className} skin="#B8895A" eyes="#7A5330" netted />;
    case "potato-purple":
      return <PotatoSvg className={className} skin="#7B5CA8" eyes="#4A3270" />;
    case "quality-good":
      return <PotatoSvg className={className} skin="#E8C84A" eyes="#B89220" badge="✓" />;
    case "quality-green":
      return <PotatoSvg className={className} skin="#7BC47D" eyes="#3E8A42" />;
    case "quality-sprout":
      return <PotatoSvg className={className} skin="#F3E2B8" eyes="#C9A86A" sprout />;
    case "quality-damage":
      return <PotatoSvg className={className} skin="#C4A574" eyes="#8A6A3A" damaged />;
    case "leaf-healthy":
      return <LeafSvg className={className} kind="healthy" />;
    case "leaf-late-blight":
      return <LeafSvg className={className} kind="late" />;
    case "leaf-early-blight":
      return <LeafSvg className={className} kind="early" />;
    case "leaf-nutrient":
      return <LeafSvg className={className} kind="nutrient" />;
    case "leaf-insect":
      return <LeafSvg className={className} kind="insect" />;
    case "stage-plant":
      return <StageSvg className={className} kind="plant" />;
    case "stage-sprout":
      return <StageSvg className={className} kind="sprout" />;
    case "stage-veg":
      return <StageSvg className={className} kind="veg" />;
    case "stage-tuber":
      return <StageSvg className={className} kind="tuber" />;
    case "stage-bulk":
      return <StageSvg className={className} kind="bulk" />;
    case "stage-harvest":
      return <StageSvg className={className} kind="harvest" />;
    case "tool-planter":
    case "tool-sprayer":
    case "tool-irrigate":
    case "tool-harvest":
      return <StageSvg className={className} kind="plant" />;
    default:
      return <PotatoSvg className={className} skin="#F3E2B8" eyes="#C9A86A" />;
  }
}

function PotatoSvg({
  className,
  skin,
  eyes,
  netted,
  sprout,
  damaged,
  badge,
}: {
  className?: string;
  skin: string;
  eyes: string;
  netted?: boolean;
  sprout?: boolean;
  damaged?: boolean;
  badge?: string;
}) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <defs>
        <linearGradient id={`pg-${skin}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="55%" stopColor={skin} />
          <stop offset="100%" stopColor={eyes} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <ellipse cx="38" cy="58" rx="28" ry="22" fill={`url(#pg-${skin})`} stroke={eyes} strokeWidth="1.5" />
      <ellipse cx="78" cy="52" rx="26" ry="20" fill={skin} stroke={eyes} strokeWidth="1.5" opacity="0.95" />
      {netted ? (
        <>
          <path d="M55 40c8 6 14 14 16 24M68 38c6 8 10 16 10 26" fill="none" stroke={eyes} strokeWidth="1" opacity="0.35" />
          <path d="M62 44c6 5 10 12 12 20" fill="none" stroke={eyes} strokeWidth="1" opacity="0.3" />
        </>
      ) : null}
      <circle cx="28" cy="54" r="2.2" fill={eyes} opacity="0.55" />
      <circle cx="42" cy="62" r="1.8" fill={eyes} opacity="0.45" />
      <circle cx="70" cy="48" r="2" fill={eyes} opacity="0.5" />
      <circle cx="86" cy="56" r="1.6" fill={eyes} opacity="0.4" />
      {sprout ? (
        <>
          <path d="M72 34c2-10 8-14 8-14" fill="none" stroke="#3E8A42" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="84" cy="22" rx="6" ry="3.5" fill="#4CCB68" transform="rotate(-20 84 22)" />
        </>
      ) : null}
      {damaged ? (
        <>
          <path d="M88 44c4 2 6 6 4 10" fill="none" stroke="#6B3A12" strokeWidth="2" />
          <circle cx="92" cy="58" r="5" fill="#8B4513" opacity="0.45" />
        </>
      ) : null}
      {badge ? (
        <g>
          <circle cx="98" cy="22" r="12" fill="#2A9B5C" />
          <text x="98" y="26" textAnchor="middle" fontSize="12" fill="#fff" fontWeight="700">
            {badge}
          </text>
        </g>
      ) : null}
      <ellipse cx="60" cy="88" rx="34" ry="4" fill="#000" opacity="0.08" />
    </svg>
  );
}

function LeafSvg({
  className,
  kind,
}: {
  className?: string;
  kind: "healthy" | "late" | "early" | "nutrient" | "insect";
}) {
  const base =
    kind === "nutrient" ? "#C9D96A" : kind === "healthy" ? "#4CCB68" : "#5BBF6A";
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <ellipse cx="60" cy="90" rx="28" ry="4" fill="#000" opacity="0.07" />
      <path
        d="M60 88C28 78 18 48 32 28c10-14 28-18 40-8 14 12 18 40-2 58-4 4-7 7-10 10z"
        fill={base}
        stroke="#2F7A3E"
        strokeWidth="1.5"
      />
      <path d="M60 86C52 64 48 46 52 30" fill="none" stroke="#2F7A3E" strokeWidth="1.6" />
      {kind === "late" ? (
        <>
          <ellipse cx="48" cy="42" rx="12" ry="9" fill="#5A3A1A" opacity="0.75" />
          <ellipse cx="68" cy="55" rx="10" ry="8" fill="#3D2914" opacity="0.7" />
          <ellipse cx="48" cy="42" rx="16" ry="12" fill="#E8C84A" opacity="0.25" />
        </>
      ) : null}
      {kind === "early" ? (
        <>
          <circle cx="50" cy="44" r="9" fill="none" stroke="#8B5A2B" strokeWidth="2" />
          <circle cx="50" cy="44" r="5" fill="none" stroke="#8B5A2B" strokeWidth="1.5" />
          <circle cx="70" cy="58" r="7" fill="none" stroke="#8B5A2B" strokeWidth="1.8" />
        </>
      ) : null}
      {kind === "nutrient" ? (
        <>
          <path d="M42 50h28M40 60h32" stroke="#F5F5DC" strokeWidth="3" opacity="0.55" />
          <path d="M44 38c8-4 16-4 24 0" fill="none" stroke="#F8F6D8" strokeWidth="4" opacity="0.4" />
        </>
      ) : null}
      {kind === "insect" ? (
        <>
          <circle cx="46" cy="40" r="3.5" fill="#E8F6E4" stroke="#2F7A3E" />
          <circle cx="62" cy="52" r="4" fill="#E8F6E4" stroke="#2F7A3E" />
          <circle cx="72" cy="38" r="2.8" fill="#E8F6E4" stroke="#2F7A3E" />
          <circle cx="54" cy="64" r="3" fill="#E8F6E4" stroke="#2F7A3E" />
        </>
      ) : null}
    </svg>
  );
}

function StageSvg({
  className,
  kind,
}: {
  className?: string;
  kind: "plant" | "sprout" | "veg" | "tuber" | "bulk" | "harvest";
}) {
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <rect x="8" y="70" width="104" height="18" rx="4" fill="#C4A574" />
      <rect x="8" y="70" width="104" height="6" fill="#8B6A3A" opacity="0.35" />
      {kind === "plant" ? (
        <ellipse cx="60" cy="62" rx="14" ry="10" fill="#E8C84A" stroke="#8B6A3A" />
      ) : null}
      {kind === "sprout" ? (
        <>
          <ellipse cx="60" cy="68" rx="12" ry="8" fill="#E8C84A" stroke="#8B6A3A" />
          <path d="M60 60v-18" stroke="#2F7A3E" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="54" cy="40" rx="7" ry="4" fill="#4CCB68" />
          <ellipse cx="66" cy="42" rx="7" ry="4" fill="#3E9B52" />
        </>
      ) : null}
      {kind === "veg" ? (
        <>
          <path d="M60 72V34" stroke="#2F7A3E" strokeWidth="3" />
          <ellipse cx="44" cy="44" rx="14" ry="8" fill="#4CCB68" />
          <ellipse cx="76" cy="40" rx="14" ry="8" fill="#3E9B52" />
          <ellipse cx="60" cy="30" rx="12" ry="7" fill="#5AD678" />
        </>
      ) : null}
      {kind === "tuber" ? (
        <>
          <path d="M60 72V40" stroke="#2F7A3E" strokeWidth="2.5" />
          <ellipse cx="48" cy="40" rx="10" ry="6" fill="#4CCB68" />
          <ellipse cx="72" cy="38" rx="10" ry="6" fill="#3E9B52" />
          <ellipse cx="48" cy="74" rx="8" ry="5" fill="#E8C84A" opacity="0.9" />
          <ellipse cx="68" cy="76" rx="7" ry="4.5" fill="#D4B060" opacity="0.9" />
        </>
      ) : null}
      {kind === "bulk" ? (
        <>
          <path d="M60 70V36" stroke="#2F7A3E" strokeWidth="2.5" />
          <ellipse cx="42" cy="36" rx="12" ry="7" fill="#4CCB68" />
          <ellipse cx="78" cy="34" rx="12" ry="7" fill="#3E9B52" />
          <ellipse cx="42" cy="76" rx="12" ry="7" fill="#E8C84A" />
          <ellipse cx="62" cy="78" rx="11" ry="7" fill="#D4B060" />
          <ellipse cx="82" cy="75" rx="10" ry="6" fill="#C9A24A" />
        </>
      ) : null}
      {kind === "harvest" ? (
        <>
          <ellipse cx="36" cy="58" rx="14" ry="10" fill="#E8C84A" stroke="#8B6A3A" />
          <ellipse cx="60" cy="52" rx="13" ry="9" fill="#D4B060" stroke="#8B6A3A" />
          <ellipse cx="84" cy="58" rx="12" ry="9" fill="#C9A24A" stroke="#8B6A3A" />
          <path d="M20 40h20l-6 8h16" fill="none" stroke="#5B6472" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : null}
    </svg>
  );
}
