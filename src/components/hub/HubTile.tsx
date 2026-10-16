import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { HubTileItem } from "@/data/hubTiles";

type HubTileProps = {
  tile: HubTileItem;
  /** First row: fetch the art at high priority. */
  highPriority?: boolean;
  /** Corner marker over the art (Spin & Win's free-spin dot). Read after the title and subtitle. */
  badge?: ReactNode;
};

/**
 * One hub tile: illustration on top, cream label below, and the whole tile is one link.
 * Its accessible name is the visible text ("Potato Quiz — Test your potato knowledge"), not an aria-label,
 * so the badge's screen-reader text joins it.
 */
export function HubTile({ tile, highPriority = false, badge }: HubTileProps) {
  return (
    <Link href={tile.href} className="hub-tile" style={{ "--tile-aspect": tile.aspect } as CSSProperties}>
      <span className="hub-tile-art" style={{ background: tile.artBg }}>
        <Image
          src={tile.image}
          alt=""
          fill
          sizes="(max-width: 520px) 46vw, 240px"
          loading="eager"
          fetchPriority={highPriority ? "high" : undefined}
          className="object-cover"
          style={tile.artPosition ? { objectPosition: tile.artPosition } : undefined}
        />
      </span>
      <span className="hub-tile-label">
        {/* As large as "Match & Learn" allows on one line at every phone width (about 4px to spare). */}
        <span className="block font-display text-[clamp(18px,7.4vw_-_6px,23px)] font-bold leading-[1.1] tracking-[-0.01em] text-[var(--tile-title)]">
          {tile.title}
        </span>
        <span className="sr-only"> — </span>
        <span className="block font-sans text-[clamp(11px,2.9vw,13px)] font-semibold leading-tight tracking-[-0.01em] text-[var(--tile-sub)]">
          {tile.subtitle}
        </span>
      </span>
      {badge}
    </Link>
  );
}
