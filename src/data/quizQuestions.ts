export type QuizOption = {
  id: "A" | "B" | "C" | "D";
  text: string;
};

export type QuizQuestion = {
  id: string;
  question: string;
  options: QuizOption[];
  /** Correct option id */
  correctId: "A" | "B" | "C" | "D";
  /** Shown on wrong-answer feedback */
  explanation: string;
};

/** Seconds per question */
export const QUIZ_TIME_PER_QUESTION = 12;

/** Total questions in a run */
export const QUIZ_QUESTION_COUNT = 12;

/** Points */
export const QUIZ_POINTS_CORRECT = 20;
export const QUIZ_POINTS_FAST = 5;
export const QUIZ_POINTS_COMPLETE = 30;

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "Which potato variety is widely used for making french fries?",
    options: [
      { id: "A", text: "Kufri Chipsona-1" },
      { id: "B", text: "Kufri Frysona" },
      { id: "C", text: "Kufri Jyoti" },
      { id: "D", text: "Kufri Bahar" },
    ],
    correctId: "B",
    explanation:
      "Kufri Frysona is a processed variety ideal for french fries.",
  },
  {
    id: "q2",
    question: "What nutrient in potatoes helps with energy?",
    options: [
      { id: "A", text: "Protein" },
      { id: "B", text: "Carbohydrates" },
      { id: "C", text: "Calcium" },
      { id: "D", text: "Iron" },
    ],
    correctId: "B",
    explanation:
      "Carbohydrates in potatoes are the main source of energy for the body.",
  },
  {
    id: "q3",
    question: "Which part of the potato plant do we usually eat?",
    options: [
      { id: "A", text: "Leaf" },
      { id: "B", text: "Flower" },
      { id: "C", text: "Tuber" },
      { id: "D", text: "Stem tip" },
    ],
    correctId: "C",
    explanation:
      "We eat the tuber — the underground storage part of the potato plant.",
  },
  {
    id: "q4",
    question: "Green potatoes may contain which harmful substance?",
    options: [
      { id: "A", text: "Solanine" },
      { id: "B", text: "Glucose" },
      { id: "C", text: "Starch only" },
      { id: "D", text: "Vitamin C" },
    ],
    correctId: "A",
    explanation:
      "Green potatoes can contain solanine, which is harmful if eaten in large amounts.",
  },
  {
    id: "q5",
    question: "Which Indian state is a major potato producer?",
    options: [
      { id: "A", text: "Kerala" },
      { id: "B", text: "Uttar Pradesh" },
      { id: "C", text: "Goa" },
      { id: "D", text: "Rajasthan desert" },
    ],
    correctId: "B",
    explanation:
      "Uttar Pradesh is one of India’s largest potato-producing states.",
  },
  {
    id: "q6",
    question: "Potatoes grow best in which climate?",
    options: [
      { id: "A", text: "Cool temperate" },
      { id: "B", text: "Extreme desert heat" },
      { id: "C", text: "Frozen arctic only" },
      { id: "D", text: "Underwater" },
    ],
    correctId: "A",
    explanation:
      "Potatoes grow best in cool temperate climates with moderate temperatures.",
  },
  {
    id: "q7",
    question: "What is the scientific name related to potato?",
    options: [
      { id: "A", text: "Solanum tuberosum" },
      { id: "B", text: "Oryza sativa" },
      { id: "C", text: "Triticum aestivum" },
      { id: "D", text: "Zea mays" },
    ],
    correctId: "A",
    explanation:
      "The scientific name of the common potato is Solanum tuberosum.",
  },
  {
    id: "q8",
    question: "Which cooking method keeps more nutrients in potatoes?",
    options: [
      { id: "A", text: "Deep frying only" },
      { id: "B", text: "Boiling with peel on" },
      { id: "C", text: "Burning on open fire" },
      { id: "D", text: "Leaving raw forever" },
    ],
    correctId: "B",
    explanation:
      "Boiling potatoes with the peel on helps retain more nutrients.",
  },
  {
    id: "q9",
    question: "Late blight in potato is mainly caused by?",
    options: [
      { id: "A", text: "Virus only" },
      { id: "B", text: "Fungus-like pathogen" },
      { id: "C", text: "Too much sunlight" },
      { id: "D", text: "Lack of water only" },
    ],
    correctId: "B",
    explanation:
      "Late blight is mainly caused by a fungus-like pathogen (Phytophthora infestans).",
  },
  {
    id: "q10",
    question: "PB Points in Quiz Time are earned when you?",
    options: [
      { id: "A", text: "Skip every question" },
      { id: "B", text: "Answer correctly" },
      { id: "C", text: "Close the app" },
      { id: "D", text: "Change the theme" },
    ],
    correctId: "B",
    explanation:
      "You earn PB points in Quiz Time when you answer questions correctly.",
  },
  {
    id: "q11",
    question: "Which vitamin is found in good amounts in potatoes?",
    options: [
      { id: "A", text: "Vitamin C" },
      { id: "B", text: "Vitamin B12" },
      { id: "C", text: "Vitamin D only" },
      { id: "D", text: "Vitamin K2 only" },
    ],
    correctId: "A",
    explanation:
      "Potatoes are a good source of Vitamin C, especially when cooked gently.",
  },
  {
    id: "q12",
    question: "Seed potatoes are used for?",
    options: [
      { id: "A", text: "Making chips only" },
      { id: "B", text: "Planting next crop" },
      { id: "C", text: "Animal feed only" },
      { id: "D", text: "Decoration" },
    ],
    correctId: "B",
    explanation:
      "Seed potatoes are specially grown tubers used for planting the next crop.",
  },
];
