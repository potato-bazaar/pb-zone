/** Tater Match — potato learning match game content + progress. */

export type TaterModeId = "variety" | "disease" | "growth";

export type TaterArtId =
  | "potato-cream"
  | "potato-yellow"
  | "potato-red"
  | "potato-russet"
  | "potato-purple"
  | "leaf-healthy"
  | "leaf-late-blight"
  | "leaf-early-blight"
  | "leaf-nutrient"
  | "leaf-insect"
  | "stage-plant"
  | "stage-sprout"
  | "stage-veg"
  | "stage-tuber"
  | "stage-bulk"
  | "stage-harvest"
  | "tool-planter"
  | "tool-sprayer"
  | "tool-irrigate"
  | "tool-harvest"
  | "quality-good"
  | "quality-green"
  | "quality-sprout"
  | "quality-damage";

export type TaterOption = {
  id: string;
  art: TaterArtId;
  label?: string;
  /** Real photo from the published Tater Match pool; the drawing for `art` is used when absent. */
  imageUrl?: string | null;
  imageCredit?: { source: string; author: string | null; license: string | null } | null;
};

export type TaterQuestion = {
  id: string;
  mode: TaterModeId;
  prompt: string;
  hint: string;
  learn: string;
  correctOptionId: string;
  options: TaterOption[];
  /** For growth sequence mode — ordered labels when using sequence mechanic */
  sequence?: string[];
};

export type TaterModeMeta = {
  id: TaterModeId;
  title: string;
  subtitle: string;
  hindi: string;
  bannerTitle: string;
  bannerSub: string;
  accent: string;
  bannerBg: string;
};

export const TATER_MODES: TaterModeMeta[] = [
  {
    id: "variety",
    title: "Variety Match",
    subtitle: "Know your potato varieties",
    hindi: "Sahi Pehchaan Behtar Utpaadan!",
    bannerTitle: "Know Your Potato Varieties",
    bannerSub: "Identify · Learn · Become an Expert",
    accent: "#2B6DEF",
    bannerBg: "linear-gradient(135deg, #E8F6E4 0%, #D4F0FF 100%)",
  },
  {
    id: "disease",
    title: "Disease Match",
    subtitle: "Spot problems, protect crops",
    hindi: "Swasth Paudha Sampann Kisan!",
    bannerTitle: "Healthy Plants Higher Harvests",
    bannerSub: "Spot Problems · Protect Your Crop",
    accent: "#1F8A47",
    bannerBg: "linear-gradient(135deg, #E7F7EC 0%, #FFF4D6 100%)",
  },
  {
    id: "growth",
    title: "Growth Match",
    subtitle: "Follow the potato journey",
    hindi: "Beej Se Mandi Tak!",
    bannerTitle: "Potato Growth Stages",
    bannerSub: "Order · Match · Master the Cycle",
    accent: "#C45C12",
    bannerBg: "linear-gradient(135deg, #FFF0E0 0%, #E8F6E4 100%)",
  },
];

export const TATER_SCORING = {
  pointsCorrect: 5,
  pointsFast: 2,
  pointsPerfectRound: 10,
  coinsCorrect: 3,
  coinsPerfectRound: 10,
  coinsDaily: 15,
  pointsDaily: 20,
  fastSeconds: 8,
  /** Seconds to answer each question. At 0 the match is missed. */
  answerSeconds: 25,
  questionsPerRound: 10,
} as const;

/** Questions in the Daily Challenge (a shorter mixed round, once a day). */
export const DAILY_QUESTIONS = 5;

const VARIETY_BANK: TaterQuestion[] = [
  {
    id: "v1",
    mode: "variety",
    prompt: "Which one is Kufri Jyoti?",
    hint: "Look at the potato pictures and choose the correct variety.",
    learn: "Kufri Jyoti · White/cream skin · Ovoid · Shallow eyes. Popular for good yield and wide adaptability.",
    correctOptionId: "a",
    options: [
      { id: "a", art: "potato-cream", label: "Cream" },
      { id: "b", art: "potato-yellow", label: "Yellow" },
      { id: "c", art: "potato-red", label: "Red" },
      { id: "d", art: "potato-russet", label: "Russet" },
    ],
  },
  {
    id: "v2",
    mode: "variety",
    prompt: "Which potato has red / pink skin?",
    hint: "Match the skin colour you see in the field.",
    learn: "Red-skinned varieties stand out by colour. Skin colour helps quick grading at mandi.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "potato-cream" },
      { id: "b", art: "potato-yellow" },
      { id: "c", art: "potato-red", label: "Red skin" },
      { id: "d", art: "potato-russet" },
    ],
  },
  {
    id: "v3",
    mode: "variety",
    prompt: "Which looks most like a russet / brown baking potato?",
    hint: "Think netted brown skin and oval shape.",
    learn: "Russet types have netted brown skin and are common for fries and baking.",
    correctOptionId: "d",
    options: [
      { id: "a", art: "potato-cream" },
      { id: "b", art: "potato-yellow" },
      { id: "c", art: "potato-red" },
      { id: "d", art: "potato-russet", label: "Russet" },
    ],
  },
  {
    id: "v4",
    mode: "variety",
    prompt: "Kufri Chipsona is best known for which use?",
    hint: "Match the variety to its processing use.",
    learn: "Chipsona group varieties are bred for chips / processing — dry matter and colour matter.",
    correctOptionId: "b",
    options: [
      { id: "a", art: "potato-cream", label: "Table only" },
      { id: "b", art: "potato-yellow", label: "Chipping" },
      { id: "c", art: "potato-red", label: "Salad only" },
      { id: "d", art: "potato-purple", label: "Ornamental" },
    ],
  },
  {
    id: "v5",
    mode: "variety",
    prompt: "Which tuber shows purple / blue skin?",
    hint: "Specialty coloured potatoes.",
    learn: "Purple potatoes often have high anthocyanins — useful for nutrition messaging.",
    correctOptionId: "d",
    options: [
      { id: "a", art: "potato-cream" },
      { id: "b", art: "potato-yellow" },
      { id: "c", art: "potato-red" },
      { id: "d", art: "potato-purple", label: "Purple" },
    ],
  },
  {
    id: "v6",
    mode: "variety",
    prompt: "Which skin colour usually means cream / white flesh table potato?",
    hint: "Pick the lightest skin.",
    learn: "Cream/white skin varieties like Kufri Jyoti are widely grown table potatoes in India.",
    correctOptionId: "a",
    options: [
      { id: "a", art: "potato-cream", label: "Cream" },
      { id: "b", art: "potato-yellow" },
      { id: "c", art: "potato-red" },
      { id: "d", art: "potato-russet" },
    ],
  },
  {
    id: "v7",
    mode: "variety",
    prompt: "Which potato is typically yellow-fleshed / yellow-skinned?",
    hint: "Warm golden colour.",
    learn: "Yellow varieties are popular for boiling and everyday cooking — mild, creamy flesh.",
    correctOptionId: "b",
    options: [
      { id: "a", art: "potato-cream" },
      { id: "b", art: "potato-yellow", label: "Yellow" },
      { id: "c", art: "potato-red" },
      { id: "d", art: "potato-russet" },
    ],
  },
  {
    id: "v8",
    mode: "variety",
    prompt: "For cold storage grading, which looks damaged / poor quality?",
    hint: "Spot the problem tuber.",
    learn: "Damaged tubers should be sorted out before storage or mandi sale to protect price.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "quality-good", label: "Good" },
      { id: "b", art: "potato-cream", label: "Fresh" },
      { id: "c", art: "quality-damage", label: "Damaged" },
      { id: "d", art: "potato-yellow", label: "Yellow" },
    ],
  },
  {
    id: "v9",
    mode: "variety",
    prompt: "Which potato should not go to premium sale (greened)?",
    hint: "Green skin = light exposure.",
    learn: "Green potatoes can contain higher solanine — remove from eating / premium lots.",
    correctOptionId: "b",
    options: [
      { id: "a", art: "quality-good", label: "Good" },
      { id: "b", art: "quality-green", label: "Greened" },
      { id: "c", art: "potato-cream" },
      { id: "d", art: "potato-yellow" },
    ],
  },
  {
    id: "v10",
    mode: "variety",
    prompt: "Which tuber is sprouting and needs careful handling?",
    hint: "Look for eyes growing shoots.",
    learn: "Sprouted seed can be used for planting after proper treatment — not ideal for table sale.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "quality-good" },
      { id: "b", art: "potato-russet" },
      { id: "c", art: "quality-sprout", label: "Sprouted" },
      { id: "d", art: "potato-cream" },
    ],
  },
];

const DISEASE_BANK: TaterQuestion[] = [
  {
    id: "d1",
    mode: "disease",
    prompt: "Which picture shows Late Blight?",
    hint: "Tap the affected leaf.",
    learn: "Late blight can produce dark lesions on leaves and stems, often with yellowing around the spots.",
    correctOptionId: "b",
    options: [
      { id: "a", art: "leaf-healthy", label: "Healthy Leaf" },
      { id: "b", art: "leaf-late-blight", label: "Late Blight" },
      { id: "c", art: "leaf-nutrient", label: "Nutrient Deficiency" },
      { id: "d", art: "leaf-insect", label: "Insect Damage" },
    ],
  },
  {
    id: "d2",
    mode: "disease",
    prompt: "Which leaf is healthy?",
    hint: "Even green colour, no spots or holes.",
    learn: "Healthy leaves are the first sign of a strong crop — scout fields regularly.",
    correctOptionId: "a",
    options: [
      { id: "a", art: "leaf-healthy", label: "Healthy" },
      { id: "b", art: "leaf-late-blight", label: "Late Blight" },
      { id: "c", art: "leaf-early-blight", label: "Early Blight" },
      { id: "d", art: "leaf-insect", label: "Insect" },
    ],
  },
  {
    id: "d3",
    mode: "disease",
    prompt: "Which shows Early Blight (target-like spots)?",
    hint: "Concentric rings on older leaves.",
    learn: "Early blight often shows bullseye / target spots on older foliage — remove debris after harvest.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "leaf-healthy" },
      { id: "b", art: "leaf-late-blight", label: "Late Blight" },
      { id: "c", art: "leaf-early-blight", label: "Early Blight" },
      { id: "d", art: "leaf-nutrient", label: "Deficiency" },
    ],
  },
  {
    id: "d4",
    mode: "disease",
    prompt: "Which leaf shows nutrient deficiency (yellowing)?",
    hint: "Chlorosis between veins or overall pale leaf.",
    learn: "Yellowing often means nutrient stress — soil test before heavy fertiliser use.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "leaf-healthy" },
      { id: "b", art: "leaf-late-blight" },
      { id: "c", art: "leaf-nutrient", label: "Deficiency" },
      { id: "d", art: "leaf-insect" },
    ],
  },
  {
    id: "d5",
    mode: "disease",
    prompt: "Which damage is from insects (holes)?",
    hint: "Chewed holes across the leaf.",
    learn: "Insect chewing is different from blight — check underside of leaves for pests.",
    correctOptionId: "d",
    options: [
      { id: "a", art: "leaf-healthy" },
      { id: "b", art: "leaf-late-blight" },
      { id: "c", art: "leaf-nutrient" },
      { id: "d", art: "leaf-insect", label: "Insect Damage" },
    ],
  },
  {
    id: "d6",
    mode: "disease",
    prompt: "Dark watery lesions spreading fast — what is it?",
    hint: "Dangerous in humid weather.",
    learn: "Late blight spreads fast in cool, wet weather — act early with approved sprays and remove infected plants.",
    correctOptionId: "b",
    options: [
      { id: "a", art: "leaf-healthy", label: "Healthy" },
      { id: "b", art: "leaf-late-blight", label: "Late Blight" },
      { id: "c", art: "leaf-insect", label: "Insects" },
      { id: "d", art: "leaf-nutrient", label: "Deficiency" },
    ],
  },
  {
    id: "d7",
    mode: "disease",
    prompt: "Match: dry brown target spots on older leaves.",
    hint: "Not the fast watery blight.",
    learn: "Early blight is slower than late blight and prefers warmer, drier conditions on older leaves.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "leaf-healthy" },
      { id: "b", art: "leaf-late-blight" },
      { id: "c", art: "leaf-early-blight", label: "Early Blight" },
      { id: "d", art: "leaf-insect" },
    ],
  },
  {
    id: "d8",
    mode: "disease",
    prompt: "Farmer sees chewed holes — best first match?",
    hint: "Identify the symptom type.",
    learn: "Confirm pest type before spraying — wrong spray wastes money and may harm beneficial insects.",
    correctOptionId: "d",
    options: [
      { id: "a", art: "leaf-healthy" },
      { id: "b", art: "leaf-late-blight" },
      { id: "c", art: "leaf-early-blight" },
      { id: "d", art: "leaf-insect", label: "Insect Damage" },
    ],
  },
  {
    id: "d9",
    mode: "disease",
    prompt: "Pale yellow leaf with green veins — what category?",
    hint: "Often nutrition, not fungus.",
    learn: "Interveinal chlorosis often points to nutrient issues — match symptom before assuming disease.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "leaf-late-blight" },
      { id: "b", art: "leaf-insect" },
      { id: "c", art: "leaf-nutrient", label: "Nutrient Deficiency" },
      { id: "d", art: "leaf-early-blight" },
    ],
  },
  {
    id: "d10",
    mode: "disease",
    prompt: "Which leaf should you keep as the healthy reference?",
    hint: "Uniform green, no lesions.",
    learn: "Compare suspect leaves next to a healthy sample — it makes field diagnosis clearer.",
    correctOptionId: "a",
    options: [
      { id: "a", art: "leaf-healthy", label: "Healthy Leaf" },
      { id: "b", art: "leaf-late-blight" },
      { id: "c", art: "leaf-early-blight" },
      { id: "d", art: "leaf-nutrient" },
    ],
  },
];

const GROWTH_BANK: TaterQuestion[] = [
  {
    id: "g1",
    mode: "growth",
    prompt: "Which stage comes first after planting seed?",
    hint: "Eyes wake up and shoots appear.",
    learn: "Sprouting starts the crop cycle — good seed and soil moisture matter here.",
    correctOptionId: "b",
    options: [
      { id: "a", art: "stage-harvest", label: "Harvest" },
      { id: "b", art: "stage-sprout", label: "Sprouting" },
      { id: "c", art: "stage-bulk", label: "Bulking" },
      { id: "d", art: "stage-tuber", label: "Tuber set" },
    ],
  },
  {
    id: "g2",
    mode: "growth",
    prompt: "Which card shows vegetative green growth?",
    hint: "Leaves and stems filling the row.",
    learn: "Vegetative growth builds the plant canopy that later feeds tubers.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "stage-plant", label: "Planting" },
      { id: "b", art: "stage-harvest", label: "Harvest" },
      { id: "c", art: "stage-veg", label: "Vegetative" },
      { id: "d", art: "stage-bulk", label: "Bulking" },
    ],
  },
  {
    id: "g3",
    mode: "growth",
    prompt: "When do small tubers first form underground?",
    hint: "After canopy is established.",
    learn: "Tuber initiation / formation is sensitive to stress — water and nutrition count.",
    correctOptionId: "d",
    options: [
      { id: "a", art: "stage-plant", label: "Planting" },
      { id: "b", art: "stage-sprout", label: "Sprouting" },
      { id: "c", art: "stage-harvest", label: "Harvest" },
      { id: "d", art: "stage-tuber", label: "Tuber Formation" },
    ],
  },
  {
    id: "g4",
    mode: "growth",
    prompt: "Which stage is tuber bulking (size increase)?",
    hint: "Tubers swell rapidly.",
    learn: "During bulking, consistent moisture protects yield and quality.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "stage-sprout" },
      { id: "b", art: "stage-plant" },
      { id: "c", art: "stage-bulk", label: "Tuber Bulking" },
      { id: "d", art: "stage-harvest" },
    ],
  },
  {
    id: "g5",
    mode: "growth",
    prompt: "Which image matches harvest / lifting?",
    hint: "Tubers out of the soil.",
    learn: "Harvest when skins are set — reduces damage in storage and transport.",
    correctOptionId: "a",
    options: [
      { id: "a", art: "stage-harvest", label: "Harvest" },
      { id: "b", art: "stage-sprout", label: "Sprouting" },
      { id: "c", art: "stage-veg", label: "Vegetative" },
      { id: "d", art: "stage-plant", label: "Planting" },
    ],
  },
  {
    id: "g6",
    mode: "growth",
    prompt: "Match the planting / seed placement stage.",
    hint: "Seed tuber going into the ridge.",
    learn: "Correct depth and spacing at planting affects stand and eventual yield.",
    correctOptionId: "a",
    options: [
      { id: "a", art: "stage-plant", label: "Planting" },
      { id: "b", art: "stage-bulk", label: "Bulking" },
      { id: "c", art: "stage-harvest", label: "Harvest" },
      { id: "d", art: "stage-tuber", label: "Formation" },
    ],
  },
  {
    id: "g7",
    mode: "growth",
    prompt: "Correct order start: Planting → ?",
    hint: "What happens next.",
    learn: "Planting → Sprouting → Vegetative → Tuber formation → Bulking → Harvest.",
    correctOptionId: "b",
    options: [
      { id: "a", art: "stage-harvest" },
      { id: "b", art: "stage-sprout", label: "Sprouting" },
      { id: "c", art: "stage-bulk" },
      { id: "d", art: "stage-tuber" },
    ],
  },
  {
    id: "g8",
    mode: "growth",
    prompt: "After vegetative growth, what comes next?",
    hint: "Tubers begin underground.",
    learn: "Tuber formation follows strong vegetative growth when conditions are right.",
    correctOptionId: "d",
    options: [
      { id: "a", art: "stage-plant" },
      { id: "b", art: "stage-sprout" },
      { id: "c", art: "stage-harvest" },
      { id: "d", art: "stage-tuber", label: "Tuber Formation" },
    ],
  },
  {
    id: "g9",
    mode: "growth",
    prompt: "Just before harvest, tubers are mostly in which phase?",
    hint: "Filling size and dry matter.",
    learn: "Late bulking / maturity prepares skins — timing harvest protects market quality.",
    correctOptionId: "c",
    options: [
      { id: "a", art: "stage-sprout" },
      { id: "b", art: "stage-plant" },
      { id: "c", art: "stage-bulk", label: "Bulking / Maturity" },
      { id: "d", art: "stage-veg" },
    ],
  },
  {
    id: "g10",
    mode: "growth",
    prompt: "End of the cycle — which card?",
    hint: "Crop leaving the field.",
    learn: "Harvest links farm to mandi — grade, store, and list quality lots on Potato Bazaar.",
    correctOptionId: "a",
    options: [
      { id: "a", art: "stage-harvest", label: "Harvest" },
      { id: "b", art: "stage-sprout" },
      { id: "c", art: "stage-plant" },
      { id: "d", art: "stage-veg" },
    ],
  },
];

const BANK: Record<TaterModeId, TaterQuestion[]> = {
  variety: VARIETY_BANK,
  disease: DISEASE_BANK,
  growth: GROWTH_BANK,
};

export function modeMeta(id: TaterModeId) {
  return TATER_MODES.find((m) => m.id === id) ?? TATER_MODES[0]!;
}

export function buildRound(mode: TaterModeId, count: number = TATER_SCORING.questionsPerRound): TaterQuestion[] {
  const source = [...BANK[mode]];
  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j]!, source[i]!];
  }
  return source.slice(0, Math.min(count, source.length)).map((q) => ({
    ...q,
    options: shuffleOptions(q.options),
  }));
}

/** Normal play: questions mixed from every mode. */
export function buildMixedRound(count: number = TATER_SCORING.questionsPerRound): TaterQuestion[] {
  const source = [...VARIETY_BANK, ...DISEASE_BANK, ...GROWTH_BANK];
  for (let i = source.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [source[i], source[j]] = [source[j]!, source[i]!];
  }
  return source.slice(0, Math.min(count, source.length)).map((q) => ({
    ...q,
    options: shuffleOptions(q.options),
  }));
}

function shuffleOptions(options: TaterOption[]) {
  const next = [...options];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

/* ------------------------------------------------------------------ */
/*  Local progress                                                     */
/* ------------------------------------------------------------------ */

export type TaterProgress = {
  streak: number;
  bestCorrect: number;
  roundsPlayed: number;
  totalCorrect: number;
  lastPlayDate: string | null;
  dailyDoneDate: string | null;
  unlockedModes: TaterModeId[];
  badges: string[];
  learned: string[];
};

const STORAGE_KEY = "pb-zone:tater-match:v2";

export function todayKey(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function yesterdayKey(now = new Date()) {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return todayKey(d);
}

export const INITIAL_TATER_PROGRESS: TaterProgress = {
  streak: 0,
  bestCorrect: 0,
  roundsPlayed: 0,
  totalCorrect: 0,
  lastPlayDate: null,
  dailyDoneDate: null,
  unlockedModes: ["variety", "disease", "growth"],
  badges: [],
  learned: [],
};

export function loadTaterProgress(): TaterProgress {
  if (typeof window === "undefined") return INITIAL_TATER_PROGRESS;
  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ||
      window.localStorage.getItem("pb-zone:tater-match:v1");
    if (!raw) return INITIAL_TATER_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<TaterProgress>;
    return { ...INITIAL_TATER_PROGRESS, ...parsed };
  } catch {
    return INITIAL_TATER_PROGRESS;
  }
}

export function saveTaterProgress(progress: TaterProgress) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function applyRoundToProgress(
  progress: TaterProgress,
  correct: number,
  learnTips: string[],
  daily: boolean,
): TaterProgress {
  const today = todayKey();
  let streak = progress.streak;
  if (progress.lastPlayDate === today) {
    /* same day — keep streak */
  } else if (progress.lastPlayDate === yesterdayKey()) {
    streak += 1;
  } else {
    streak = 1;
  }

  const badges = new Set(progress.badges);
  if (progress.roundsPlayed + 1 >= 1) badges.add("potato-starter");
  if (progress.roundsPlayed + 1 >= 10) badges.add("crop-learner");
  if (correct >= 8) badges.add("sharp-matcher");
  if (streak >= 7) badges.add("potato-streaker");

  const learned = [...progress.learned];
  for (const tip of learnTips) {
    const short = tip.split("·")[0]?.trim() || tip.slice(0, 40);
    if (short && !learned.includes(short)) learned.unshift(short);
  }

  return {
    ...progress,
    streak,
    bestCorrect: Math.max(progress.bestCorrect, correct),
    roundsPlayed: progress.roundsPlayed + 1,
    totalCorrect: progress.totalCorrect + correct,
    lastPlayDate: today,
    dailyDoneDate: daily ? today : progress.dailyDoneDate,
    badges: [...badges],
    learned: learned.slice(0, 12),
  };
}

export const TATER_BADGES: { id: string; label: string; hint: string }[] = [
  { id: "potato-starter", label: "Potato Starter", hint: "Complete first round" },
  { id: "crop-learner", label: "Crop Learner", hint: "Finish 10 rounds" },
  { id: "sharp-matcher", label: "Sharp Matcher", hint: "Score 8+/10 in a round" },
  { id: "potato-streaker", label: "Potato Streaker", hint: "Keep a 7-day streak" },
  { id: "disease-detective", label: "Disease Detective", hint: "Play Disease Match" },
];
