/** The PB Zone hub's tiles in screen order (2×2: left to right, top to bottom). Reorder or add a tile here. */

export type HubTileId = "quiz" | "match" | "spin" | "rewards";

export type HubTileItem = {
  id: HubTileId;
  title: string;
  subtitle: string;
  href: string;
  /** Illustration from public/games/hub-v2. */
  image: string;
  /** CSS background behind the illustration; it is what shows while the image loads. */
  artBg: string;
  /**
   * Tile width ÷ height, from its art: 0.86 for the 480×381 illustrations, 0.8 for the taller 480×432 ones.
   * The label is equally tall either way, so the extra height goes to the art. Tiles in one row must match.
   */
  aspect: number;
  /** CSS object-position for the illustration, so its subject stays in frame where the tile crops it. */
  artPosition?: string;
};

export const HUB_TILES: readonly HubTileItem[] = [
  {
    id: "quiz",
    title: "Potato Quiz",
    subtitle: "Test your potato knowledge",
    href: "/games/quiz-time",
    image: "/games/hub-v2/tile-quiz.webp",
    artBg: "var(--tile-quiz-bg)",
    aspect: 0.86,
  },
  {
    id: "match",
    title: "Match & Learn",
    subtitle: "Match. Discover. Learn.",
    href: "/games/tater-match",
    image: "/games/hub-v2/tile-match.webp",
    artBg: "var(--tile-match-bg)",
    aspect: 0.86,
  },
  {
    id: "spin",
    title: "Spin & Win",
    subtitle: "Spin for a surprise",
    href: "/games/spin-win",
    image: "/games/hub-v2/tile-spin.webp",
    artBg: "var(--tile-spin-bg)",
    aspect: 0.8,
    // Short screens crop the art: keep the wheel's pointer, trim the ground.
    artPosition: "50% 15%",
  },
  {
    id: "rewards",
    title: "My Rewards",
    subtitle: "View your points & rewards",
    href: "/rewards",
    image: "/games/hub-v2/tile-rewards.webp",
    artBg: "var(--tile-rewards-bg)",
    aspect: 0.8,
    // Short screens crop the art: keep the bursts above the gift, trim the ground.
    artPosition: "50% 25%",
  },
];
