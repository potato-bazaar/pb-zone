export type GameItem = {
  id: string;
  title: string;
  description: string;
  /** Short line for home carousel */
  shortDescription: string;
  image: string;
  cta: string;
  /** Pastel card background */
  bg: string;
  /** Title color */
  titleColor: string;
  /** Play button background */
  buttonBg: string;
};

export const ALL_GAMES: GameItem[] = [
  {
    id: "quiz-time",
    title: "QUIZ TIME",
    description: "Test your knowledge with exciting quizzes.",
    shortDescription: "Test your knowledge!",
    image: "/images/home/game-quiz-time.png",
    cta: "Play",
    bg: "#EDE4FF",
    titleColor: "#5B3FA8",
    buttonBg: "#6A5AE0",
  },
  {
    id: "word-scramble",
    title: "WORD SCRAMBLE",
    description: "Unscramble the letters and find the word.",
    shortDescription: "Unscramble the words!",
    image: "/images/home/game-word-scramble.png",
    cta: "Play",
    bg: "#D8F5E4",
    titleColor: "#1F7A4D",
    buttonBg: "#2A9B5C",
  },
  {
    id: "guess-disease",
    title: "GUESS DISEASE",
    description: "Look at the image and guess the disease.",
    shortDescription: "Identify the disease!",
    image: "/images/home/game-guess-disease.png",
    cta: "Play",
    bg: "#FFE6D9",
    titleColor: "#C44D2A",
    buttonBg: "#E86A3C",
  },
  {
    id: "fix-puzzle",
    title: "FIX THE PUZZLE",
    description: "Drag and drop the pieces to complete the puzzle.",
    shortDescription: "Complete the puzzle!",
    image: "/images/home/game-fix-puzzle.png",
    cta: "Play",
    bg: "#D9ECFF",
    titleColor: "#1E5FBF",
    buttonBg: "#3B82E6",
  },
];
