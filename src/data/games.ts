import type { PbGameId } from "@/data/pbEconomy";

export type GameCategory = "arcade" | "brain" | "learn";

export type GameTagIcon = "match" | "fire" | "coin" | "quiz" | "questions" | "word" | "new" | "identify" | "learn" | "puzzle" | "timer" | "sword" | "belt" | "star";

export type GameTag = { label: string; icon: GameTagIcon };

export type GameTheme = {
  /** Colours for the first and second word of the title. */
  title: [string, string];
  /** Outline / extrusion colour behind the title. */
  shade: string;
  /** Play button gradient, top to bottom. */
  button: [string, string];
  /** Darker rim under the play button. Falls back to `shade`. */
  buttonEdge?: string;
  /** Tint washed over the left side of the card so text stays readable. */
  wash: string;
};

export type GameItem = {
  id: string;
  title: string;
  description: string;
  /** Short line for home carousel */
  shortDescription: string;
  /** Wide hero art: subject on the right, soft blurred left half for text. */
  image: string;
  /** All Games art: 16:9 for the featured game, 4:5 for grid cards. Falls back to `image`. */
  cardImage?: string;
  /** One-liner on the All Games card. Falls back to `shortDescription`. */
  blurb?: string;
  cta: string;
  /** Pastel card background */
  bg: string;
  /** Title color */
  titleColor: string;
  /** Play button background */
  buttonBg: string;
  /** Optional CSS object-position for the card artwork */
  imagePosition?: string;
  category: GameCategory;
  tags: GameTag[];
  theme: GameTheme;
  featured?: boolean;
  /** True once the game is actually playable in the app. */
  playable: boolean;
  /** Economy id when it differs from the route id (caps, daily points, leaderboards). */
  pbGameId?: PbGameId;
};

export const GAME_CATEGORIES: { id: "all" | GameCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "arcade", label: "Arcade" },
  { id: "brain", label: "Brain" },
  { id: "learn", label: "Learn" },
];

/**
 * Every routable game (`/games/[id]` 404s for ids missing here). The PB Zone hub shows Potato Quiz,
 * Match & Learn and Spin & Win; Potato Run / Crush / Ninja stay registered so their routes keep working,
 * but nothing links to them.
 */
export const ALL_GAMES: GameItem[] = [
  {
    id: "quiz-time",
    title: "QUIZ TIME",
    description: "",
    shortDescription: "Test your knowledge!",
    image: "/games/cards/quiz-time.webp",
    cardImage: "/games/hub/quiz-time.webp",
    blurb: "Test your knowledge and earn rewards!",
    cta: "Play",
    bg: "#EDE4FF",
    titleColor: "#5B3FA8",
    buttonBg: "#6A5AE0",
    imagePosition: "76% 50%",
    category: "learn",
    tags: [],
    theme: { title: ["#9A6BFF", "#9A6BFF"], shade: "#2A1266", button: ["#8B6CFF", "#5A3ED6"], buttonEdge: "#3A1F9E", wash: "rgba(255, 238, 178, 0.8)" },
    featured: true,
    playable: true,
  },
  {
    id: "potato-run",
    title: "POTATO RUN",
    description: "Sprint from farm to cold storage. Dodge, jump, slide and collect!",
    shortDescription: "From farm to a brighter tomorrow!",
    image: "/games/cards/potato-run.webp",
    cardImage: "/games/hub/potato-run.webp",
    blurb: "Run, collect and earn rewards!",
    cta: "Play",
    bg: "#DFF2FF",
    titleColor: "#7B2CBF",
    buttonBg: "#F5B400",
    imagePosition: "74% 50%",
    category: "arcade",
    tags: [
      { label: "Runner", icon: "timer" },
      { label: "New", icon: "new" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFD23F", "#A675FF"], shade: "#3B1D6E", button: ["#FFD84A", "#F59E0B"], buttonEdge: "#B86A00", wash: "rgba(228, 243, 255, 0.85)" },
    playable: true,
    pbGameId: "spud-run",
  },
  {
    id: "potato-crush",
    title: "POTATO CRUSH",
    description: "Match 3 spuds, blast combos and beat 20 juicy levels!",
    shortDescription: "Match & pop the spuds!",
    image: "/games/cards/potato-crush.webp",
    cardImage: "/games/hub/potato-crush.webp",
    blurb: "Match, blast and score big!",
    cta: "Play",
    bg: "#FFE9F3",
    titleColor: "#7B2CBF",
    buttonBg: "#8E44E3",
    imagePosition: "80% 50%",
    category: "arcade",
    tags: [
      { label: "Match-3", icon: "match" },
      { label: "Popular", icon: "fire" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFD23F", "#D9B8FF"], shade: "#4A1D7A", button: ["#FF6FB8", "#E2338A"], buttonEdge: "#9C1660", wash: "rgba(247, 232, 255, 0.85)" },
    playable: true,
  },
  {
    id: "tater-match",
    title: "MATCH & LEARN",
    description: "Match the right potato or plant — spot varieties and healthy crops!",
    shortDescription: "Spot it. Match it. Grow smarter!",
    image: "/games/cards/tater-match.webp",
    cardImage: "/games/hub/tater-match.webp",
    blurb: "Find, match and learn about plants!",
    cta: "Play",
    bg: "#E8F6E4",
    titleColor: "#1F7A4D",
    buttonBg: "#2A9B5C",
    imagePosition: "78% 45%",
    category: "learn",
    tags: [
      { label: "Identify", icon: "identify" },
      { label: "Learn", icon: "learn" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: {
      title: ["#FFD23F", "#4CCB68"],
      shade: "#145C32",
      button: ["#4CCB68", "#1F8A47"],
      buttonEdge: "#14602F",
      wash: "rgba(234, 250, 228, 0.85)",
    },
    playable: true,
  },
  {
    id: "potato-ninja",
    title: "POTATO NINJA",
    description: "Slice flying spuds, dodge bombs and chase high scores.",
    shortDescription: "Slice your way to a better harvest!",
    image: "/games/cards/potato-ninja.webp",
    cardImage: "/games/hub/potato-ninja.webp",
    blurb: "Slice, focus and boost your skills!",
    cta: "Play",
    bg: "#FFE9D6",
    titleColor: "#FFC107",
    buttonBg: "#E0572B",
    imagePosition: "70% 50%",
    category: "brain",
    tags: [
      { label: "Slicing", icon: "sword" },
      { label: "3 Modes", icon: "timer" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFD23F", "#FF6B3D"], shade: "#6E1A0A", button: ["#FF9A4D", "#E2531C"], buttonEdge: "#9A2E08", wash: "rgba(255, 238, 222, 0.85)" },
    playable: true,
  },
  // Luck, not skill: pays PB Coins only, never PB Points — so no pbGameId, and not in PbGameId or LEADERBOARD_GAMES.
  {
    id: "spin-win",
    title: "SPIN & WIN",
    description: "Spin the wheel once a day for PB Coins.",
    shortDescription: "Spin the wheel once a day for PB Coins",
    image: "/games/hub-v2/tile-spin.webp",
    cardImage: "/games/hub-v2/tile-spin.webp",
    blurb: "Spin the wheel once a day for PB Coins",
    cta: "Spin",
    bg: "#FFF4D6",
    titleColor: "#0B3B22",
    buttonBg: "#F39A12",
    imagePosition: "70% 50%",
    category: "arcade",
    tags: [
      { label: "Daily", icon: "timer" },
      { label: "PB Coins", icon: "coin" },
    ],
    theme: {
      title: ["#FFD84A", "#4CCB68"],
      shade: "#0B3B22",
      button: ["#FFB547", "#F39A12"],
      buttonEdge: "#B86A00",
      wash: "rgba(255, 244, 214, 0.85)",
    },
    playable: true,
  },
  // --- Coming later (uncomment when ready) ---
  // {
  //   id: "potato-sort",
  //   title: "POTATO SORT",
  //   description: "Drag potatoes off the belt into the right bin before time runs out.",
  //   shortDescription: "Sort right, harvest bright!",
  //   image: "/games/cards/potato-sort.webp",
  //   cta: "Play",
  //   bg: "#DCEBFF",
  //   titleColor: "#1F4E9E",
  //   buttonBg: "#2E7D32",
  //   imagePosition: "72% 50%",
  //   category: "arcade",
  //   tags: [
  //     { label: "Sorting", icon: "belt" },
  //     { label: "New", icon: "new" },
  //     { label: "Earn PB", icon: "coin" },
  //   ],
  //   theme: { title: ["#FFD23F", "#8FD0FF"], shade: "#0E3A6E", button: ["#4CCB68", "#2E7D32"], wash: "rgba(46, 104, 180, 0.42)" },
  //   playable: true,
  // },
  // {
  //   id: "word-scramble",
  //   title: "WORD SCRAMBLE",
  //   description: "Unscramble the letters and find the word.",
  //   shortDescription: "Unscramble the words!",
  //   image: "/games/cards/word-scramble.webp",
  //   cta: "Play",
  //   bg: "#D8F5E4",
  //   titleColor: "#1F7A4D",
  //   buttonBg: "#2A9B5C",
  //   imagePosition: "74% 50%",
  //   category: "brain",
  //   tags: [
  //     { label: "Word", icon: "word" },
  //     { label: "New", icon: "new" },
  //     { label: "Earn PB", icon: "coin" },
  //   ],
  //   theme: { title: ["#FFD23F", "#FFF4D6"], shade: "#245C2A", button: ["#4CCB68", "#1F8A47"], wash: "rgba(52, 140, 74, 0.40)" },
  //   playable: false,
  // },
  // {
  //   id: "guess-disease",
  //   title: "GUESS DISEASE",
  //   description: "Look at the image and guess the disease.",
  //   shortDescription: "Identify the disease!",
  //   image: "/games/cards/guess-disease.webp",
  //   cta: "Play",
  //   bg: "#FFE6D9",
  //   titleColor: "#C44D2A",
  //   buttonBg: "#E86A3C",
  //   imagePosition: "74% 50%",
  //   category: "learn",
  //   tags: [
  //     { label: "Identify", icon: "identify" },
  //     { label: "Learn", icon: "learn" },
  //     { label: "Earn PB", icon: "coin" },
  //   ],
  //   theme: { title: ["#FFD23F", "#FFD23F"], shade: "#7A3A12", button: ["#FF8A4C", "#D9531E"], wash: "rgba(232, 140, 70, 0.38)" },
  //   playable: false,
  // },
  // {
  //   id: "fix-puzzle",
  //   title: "FIX THE PUZZLE",
  //   description: "Drag and drop the pieces to complete the puzzle.",
  //   shortDescription: "Complete the puzzle!",
  //   image: "/games/cards/fix-puzzle.webp",
  //   cta: "Play",
  //   bg: "#D9ECFF",
  //   titleColor: "#1E5FBF",
  //   buttonBg: "#3B82E6",
  //   imagePosition: "76% 50%",
  //   category: "brain",
  //   tags: [
  //     { label: "Puzzle", icon: "puzzle" },
  //     { label: "Relaxing", icon: "star" },
  //     { label: "Earn PB", icon: "coin" },
  //   ],
  //   theme: { title: ["#FFFFFF", "#FFD23F"], shade: "#1D4E9E", button: ["#5C9BFF", "#2E64D6"], wash: "rgba(60, 130, 230, 0.40)" },
  //   playable: false,
  // },
];
