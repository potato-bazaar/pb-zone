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

export const ALL_GAMES: GameItem[] = [
  {
    id: "potato-run",
    title: "POTATO RUN",
    description: "Sprint from farm to cold storage. Dodge, jump, slide and collect!",
    shortDescription: "From farm to a brighter tomorrow!",
    image: "/games/cards/potato-run.webp",
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
    theme: { title: ["#FFD23F", "#C58BFF"], shade: "#3B1D6E", button: ["#FFE066", "#F0A800"], wash: "rgba(70, 140, 220, 0.40)" },
    featured: true,
    playable: true,
    pbGameId: "spud-run",
  },
  {
    id: "potato-crush",
    title: "POTATO CRUSH",
    description: "Match 3 spuds, blast combos and beat 20 juicy levels!",
    shortDescription: "Match & pop the spuds!",
    image: "/games/cards/potato-crush.webp",
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
    theme: { title: ["#FFD23F", "#D9B8FF"], shade: "#4A1D7A", button: ["#A66BFF", "#6E3BD9"], wash: "rgba(112, 68, 196, 0.42)" },
    playable: true,
  },
  {
    id: "potato-ninja",
    title: "POTATO NINJA",
    description: "Slice flying spuds, dodge bombs and chase high scores.",
    shortDescription: "Slice your way to a better harvest!",
    image: "/games/cards/potato-ninja.webp",
    cta: "Play",
    bg: "#FFE9D6",
    titleColor: "#FFC107",
    buttonBg: "#E0572B",
    imagePosition: "70% 50%",
    category: "arcade",
    tags: [
      { label: "Slicing", icon: "sword" },
      { label: "3 Modes", icon: "timer" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFD23F", "#FF6B3D"], shade: "#6E1A0A", button: ["#FF8A4C", "#D9471B"], wash: "rgba(214, 96, 40, 0.38)" },
    playable: true,
  },
  {
    id: "potato-sort",
    title: "POTATO SORT",
    description: "Drag potatoes off the belt into the right bin before time runs out.",
    shortDescription: "Sort right, harvest bright!",
    image: "/games/cards/potato-sort.webp",
    cta: "Play",
    bg: "#DCEBFF",
    titleColor: "#1F4E9E",
    buttonBg: "#2E7D32",
    imagePosition: "72% 50%",
    category: "arcade",
    tags: [
      { label: "Sorting", icon: "belt" },
      { label: "New", icon: "new" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFD23F", "#8FD0FF"], shade: "#0E3A6E", button: ["#4CCB68", "#2E7D32"], wash: "rgba(46, 104, 180, 0.42)" },
    playable: true,
  },
  {
    id: "quiz-time",
    title: "QUIZ TIME",
    description: "Test your knowledge with exciting quizzes.",
    shortDescription: "Test your knowledge!",
    image: "/games/cards/quiz-time.webp",
    cta: "Play",
    bg: "#EDE4FF",
    titleColor: "#5B3FA8",
    buttonBg: "#6A5AE0",
    imagePosition: "76% 50%",
    category: "learn",
    tags: [
      { label: "Quiz", icon: "quiz" },
      { label: "12 Questions", icon: "questions" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#7A4DFF", "#7A4DFF"], shade: "#2A1266", button: ["#8B6CFF", "#5A3ED6"], wash: "rgba(190, 170, 255, 0.55)" },
    playable: true,
  },
  {
    id: "word-scramble",
    title: "WORD SCRAMBLE",
    description: "Unscramble the letters and find the word.",
    shortDescription: "Unscramble the words!",
    image: "/games/cards/word-scramble.webp",
    cta: "Play",
    bg: "#D8F5E4",
    titleColor: "#1F7A4D",
    buttonBg: "#2A9B5C",
    imagePosition: "74% 50%",
    category: "brain",
    tags: [
      { label: "Word", icon: "word" },
      { label: "New", icon: "new" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFD23F", "#FFF4D6"], shade: "#245C2A", button: ["#4CCB68", "#1F8A47"], wash: "rgba(52, 140, 74, 0.40)" },
    playable: false,
  },
  {
    id: "guess-disease",
    title: "GUESS DISEASE",
    description: "Look at the image and guess the disease.",
    shortDescription: "Identify the disease!",
    image: "/games/cards/guess-disease.webp",
    cta: "Play",
    bg: "#FFE6D9",
    titleColor: "#C44D2A",
    buttonBg: "#E86A3C",
    imagePosition: "74% 50%",
    category: "learn",
    tags: [
      { label: "Identify", icon: "identify" },
      { label: "Learn", icon: "learn" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFD23F", "#FFD23F"], shade: "#7A3A12", button: ["#FF8A4C", "#D9531E"], wash: "rgba(232, 140, 70, 0.38)" },
    playable: false,
  },
  {
    id: "fix-puzzle",
    title: "FIX THE PUZZLE",
    description: "Drag and drop the pieces to complete the puzzle.",
    shortDescription: "Complete the puzzle!",
    image: "/games/cards/fix-puzzle.webp",
    cta: "Play",
    bg: "#D9ECFF",
    titleColor: "#1E5FBF",
    buttonBg: "#3B82E6",
    imagePosition: "76% 50%",
    category: "brain",
    tags: [
      { label: "Puzzle", icon: "puzzle" },
      { label: "Relaxing", icon: "star" },
      { label: "Earn PB", icon: "coin" },
    ],
    theme: { title: ["#FFFFFF", "#FFD23F"], shade: "#1D4E9E", button: ["#5C9BFF", "#2E64D6"], wash: "rgba(60, 130, 230, 0.40)" },
    playable: false,
  },
  {
    id: "tater-match",
    title: "TATER MATCH",
    description: "Match, collect and grow your PB Points!",
    shortDescription: "Match & collect taters!",
    image: "/images/home/game-tater-match.png",
    cta: "Play",
    bg: "#D6EEFF",
    titleColor: "#1A5FA8",
    buttonBg: "#2F7FD1",
  },
];
