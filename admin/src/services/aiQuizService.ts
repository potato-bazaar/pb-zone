import { GeneratorConfig, Quiz, QuizQuestion, QuestionOption, Game, GameFormat } from '../types/quiz';
import { groqChatJson, hasGroqKey } from './groqClient';

// Fallback pool of alternative potato questions for single-question regeneration or offline generation
const ALTERNATIVE_POTATO_QUESTIONS: Omit<QuizQuestion, 'id' | 'order'>[] = [
  {
    question: 'What is the world\'s most expensive commercially harvested potato, selling for up to $600 per kilogram in France?',
    options: [
      { id: 'A', text: 'La Bonnotte (from the Île de Noirmoutier)', isCorrect: true },
      { id: 'B', text: 'Kipfler Royale (from Vienna)', isCorrect: false },
      { id: 'C', text: 'Golden Yukon Diamond', isCorrect: false },
      { id: 'D', text: 'Alba Truffle Spud', isCorrect: false },
    ],
    explanation: 'La Bonnotte is grown on the French island of Noirmoutier and fertilized exclusively with marine seaweed, yielding only 100 tons annually hand-picked in one week.',
    funFact: 'Chefs describe its flavor as tasting of sea salt, hazelnuts, and lemon.',
    difficulty: 'hard',
    topicTag: 'Gastronomy & Luxury',
    points: 15,
    timeLimitSeconds: 25,
    aiConfidence: 0.98,
  },
  {
    question: 'Which country is currently the world\'s single largest producer of potatoes by volume?',
    options: [
      { id: 'A', text: 'China', isCorrect: true },
      { id: 'B', text: 'India', isCorrect: false },
      { id: 'C', text: 'Russia', isCorrect: false },
      { id: 'D', text: 'United States', isCorrect: false },
    ],
    explanation: 'China leads global potato production with over 90 million metric tons per year, followed closely by India.',
    funFact: 'The Chinese Ministry of Agriculture launched a nationwide campaign designating the potato as a core national staple grain alongside rice and wheat.',
    difficulty: 'medium',
    topicTag: 'Agriculture',
    points: 10,
    timeLimitSeconds: 20,
    aiConfidence: 0.97,
  },
  {
    question: 'What happens to the sugar and starch in potatoes when they are stored below 4°C (39°F) in a household refrigerator?',
    options: [
      { id: 'A', text: 'Cold sweetening: starches convert into reducing sugars, causing premature browning when fried', isCorrect: true },
      { id: 'B', text: 'The skin turns solid green and generates fatal cyanide gas', isCorrect: false },
      { id: 'C', text: 'The potato rapidly absorbs ambient odors and shrinks by 50%', isCorrect: false },
      { id: 'D', text: 'Internal moisture crystallizes and causes the potato to explode', isCorrect: false },
    ],
    explanation: 'At temperatures below 40°F, potato starches hydrolyze into reducing sugars (glucose and fructose). When fried, these excess sugars react with amino acids (Maillard reaction), causing soggy blackening.',
    funFact: 'For perfect crispy chips or fries, potatoes should be stored in a dark, ventilated cellar at 7°C to 10°C (45°F–50°F).',
    difficulty: 'hard',
    topicTag: 'Food Chemistry',
    points: 15,
    timeLimitSeconds: 25,
    aiConfidence: 0.96,
  },
  {
    question: 'What Spanish conquistador is generally credited with first describing and documenting potatoes in South America around 1537?',
    options: [
      { id: 'A', text: 'Pedro Cieza de León', isCorrect: true },
      { id: 'B', text: 'Francisco Pizarro', isCorrect: false },
      { id: 'C', text: 'Hernán Cortés', isCorrect: false },
      { id: 'D', text: 'Vasco Núñez de Balboa', isCorrect: false },
    ],
    explanation: 'Pedro Cieza de León mentioned encountering "papas" (potatoes) in his Chronicle of Peru in 1537, noting they were like earthy truffles.',
    funFact: 'Europeans were initially terrified of potatoes because they were not mentioned in the Holy Bible and grew underground!',
    difficulty: 'hard',
    topicTag: 'History',
    points: 15,
    timeLimitSeconds: 25,
    aiConfidence: 0.95,
  },
  {
    question: 'Which beloved fast-food chain in the US has waffle-cut potato fries as its #1 most-ordered menu item?',
    options: [
      { id: 'A', text: 'Chick-fil-A', isCorrect: true },
      { id: 'B', text: 'Wendy\'s', isCorrect: false },
      { id: 'C', text: 'Carl\'s Jr.', isCorrect: false },
      { id: 'D', text: 'Arby\'s', isCorrect: false },
    ],
    explanation: 'Chick-fil-A introduced waffle potato fries cooked in canola oil in 1985, and they remain the single most popular menu item in company history.',
    funFact: 'Arby\'s is famous for seasoned spiral curly fries, while Chick-fil-A made the criss-cross waffle cut legendary.',
    difficulty: 'easy',
    topicTag: 'Snack Culture',
    points: 10,
    timeLimitSeconds: 20,
    aiConfidence: 0.99,
  },
  {
    question: 'How do Sweet Potatoes (Ipomoea batatas) differ scientifically from true Potatoes (Solanum tuberosum)?',
    options: [
      { id: 'A', text: 'Sweet potatoes belong to the Morning Glory family (Convolvulaceae) and are true root tubers', isCorrect: true },
      { id: 'B', text: 'Sweet potatoes are genetically modified yams developed in laboratory greenhouses', isCorrect: false },
      { id: 'C', text: 'Sweet potatoes grow on tall fruit trees rather than underground', isCorrect: false },
      { id: 'D', text: 'They are identical botanical clones differing only in food dye applied after harvest', isCorrect: false },
    ],
    explanation: 'Sweet potatoes are part of the Convolvulaceae (morning glory) family and are storage roots, whereas true potatoes belong to Solanaceae and are modified stems (tubers).',
    funFact: 'True yams (Dioscorea) are yet another completely distinct monocot botanical family originating in West Africa and Asia!',
    difficulty: 'medium',
    topicTag: 'Botany',
    points: 10,
    timeLimitSeconds: 20,
    aiConfidence: 0.97,
  },
  {
    question: 'What is the secret double-fry technique essential for creating world-class Belgian fries (frites)?',
    options: [
      { id: 'A', text: 'First blanching fry at ~150°C (300°F) to cook the interior, followed by a hot crisping fry at ~190°C (375°F)', isCorrect: true },
      { id: 'B', text: 'Frying in melted chocolate, freezing overnight, then frying in olive oil', isCorrect: false },
      { id: 'C', text: 'Frying once with skins on, peeling while scalding hot, then re-frying', isCorrect: false },
      { id: 'D', text: 'Steaming for 3 hours, then dipping in boiling vinegar', isCorrect: false },
    ],
    explanation: 'Authentic Belgian frites are double-fried in rendered beef tallow (blanc de bœuf): first poached at ~150°C to soften the potato core, rested, then flash-crisped at ~190°C.',
    funFact: 'Belgian frites are traditionally served in a paper cone (cornet) crowned with a dollop of mayonnaise.',
    difficulty: 'medium',
    topicTag: 'Culinary Technique',
    points: 10,
    timeLimitSeconds: 20,
    aiConfidence: 0.99,
  },
  {
    question: 'What potato specialty is the national comfort food dish of Switzerland, made of grated fried potato patties?',
    options: [
      { id: 'A', text: 'Rösti', isCorrect: true },
      { id: 'B', text: 'Fondue Neuchâteloise', isCorrect: false },
      { id: 'C', text: 'Raclette', isCorrect: false },
      { id: 'D', text: 'Spätzle', isCorrect: false },
    ],
    explanation: 'Rösti was originally eaten as a breakfast staple by Bernese farmers and has evolved into Switzerland\'s quintessential potato dish.',
    funFact: 'The cultural boundary dividing German-speaking and French-speaking Switzerland is colloquially called the "Röstigraben" (Rösti ditch).',
    difficulty: 'easy',
    topicTag: 'Gastronomy',
    points: 10,
    timeLimitSeconds: 20,
    aiConfidence: 0.98,
  },
  {
    question: 'What is the famous cylindrical chip brand invented by Fredric Baur that famously stacks uniform dehydrated potato flakes in an airtight can?',
    options: [
      { id: 'A', text: 'Pringles', isCorrect: true },
      { id: 'B', text: 'Lay\'s Stax', isCorrect: false },
      { id: 'C', text: 'Doritos', isCorrect: false },
      { id: 'D', text: 'Ruffles', isCorrect: false },
    ],
    explanation: 'Pringles were engineered in the 1960s with a hyperbolic paraboloid shape to prevent breakage and allow aerodynamic stacking in iconic cans.',
    funFact: 'Chemist Fredric Baur was so proud of the Pringles tube design that his ashes were buried in an original Pringles can upon his death in 2008!',
    difficulty: 'easy',
    topicTag: 'Snack Lore',
    points: 10,
    timeLimitSeconds: 20,
    aiConfidence: 0.99,
  },
  {
    question: 'What green color develops on potato skins exposed to light, and why should you avoid eating it?',
    options: [
      { id: 'A', text: 'Chlorophyll synthesis accompanied by toxic solanine alkaloid buildup', isCorrect: true },
      { id: 'B', text: 'Harmless radioactive moss that purifies antioxidants', isCorrect: false },
      { id: 'C', text: 'Natural spearmint flavoring secreted during photosynthesis', isCorrect: false },
      { id: 'D', text: 'Copper mineral oxidation that tastes like candy', isCorrect: false },
    ],
    explanation: 'While chlorophyll itself is harmless, sunlight stimulates the potato to produce glycoalkaloids, primarily solanine, which tastes bitter and can cause stomach cramps or illness in high doses.',
    funFact: 'Commercial potato bags are deliberately tinted or opaque to shield spuds from fluorescent grocery store lighting.',
    difficulty: 'medium',
    topicTag: 'Science & Safety',
    points: 10,
    timeLimitSeconds: 20,
    aiConfidence: 0.97,
  }
];

const ALTERNATIVE_WORD_SCRAMBLE_POOL: {
  targetWord: string;
  clue: string;
  explanation: string;
  funFact: string;
  topicTag: string;
  difficulty: 'easy' | 'medium' | 'hard';
}[] = [
  {
    targetWord: 'POTATO',
    clue: 'The beloved humble edible tuber cultivated worldwide and worshipped by ancient Incas.',
    explanation: 'POTATO: Solanum tuberosum was first cultivated near Lake Titicaca in Peru over 7,000 years ago.',
    funFact: 'The Incas measured time by how long it took to boil a pot of potatoes!',
    topicTag: 'Spud Basics',
    difficulty: 'easy',
  },
  {
    targetWord: 'RUSSET',
    clue: 'The quintessential brown-skinned potato famous for baking and crispy french fries.',
    explanation: 'RUSSET: Luther Burbank developed the Russet Burbank in 1875 to resist late blight.',
    funFact: 'Russet Burbank makes up over 70% of all processed French fries in North America.',
    topicTag: 'Varieties',
    difficulty: 'easy',
  },
  {
    targetWord: 'FRIES',
    clue: 'Golden crispy batons of fried potato dipped in ketchup, mayo, or vinegar.',
    explanation: 'FRIES: Belgium and France both claim the historical origin of thin-sliced fried potato batons.',
    funFact: 'Americans consume roughly 30 pounds of french fries per person every year!',
    topicTag: 'Street Food',
    difficulty: 'easy',
  },
  {
    targetWord: 'POUTINE',
    clue: 'Famous Canadian comfort food: crispy fries topped with cheese curds and warm gravy.',
    explanation: 'POUTINE: Created in 1950s rural Quebec, "poutine" is regional slang for a tasty mess.',
    funFact: 'Fresh cheese curds must "squeak" against your teeth to be certified authentic Quebec poutine!',
    topicTag: 'Culinary Dishes',
    difficulty: 'medium',
  },
  {
    targetWord: 'GNOCCHI',
    clue: 'Tender Italian pillow dumplings rolled from boiled mashed potato and flour.',
    explanation: 'GNOCCHI: Classic Italian potato dumplings tossed in brown sage butter, gorgonzola, or pesto.',
    funFact: 'On the 29th of each month, South Americans eat gnocchi with money placed under plates for luck!',
    topicTag: 'Gastronomy',
    difficulty: 'hard',
  },
  {
    targetWord: 'CRISPS',
    clue: 'British name for paper-thin, crunchy salted potato slices packed in bags.',
    explanation: 'CRISPS: In the UK, "crisps" refer to potato chips, while "chips" mean thick-cut hot french fries.',
    funFact: 'The most popular crisp flavor in the United Kingdom is Cheese & Onion!',
    topicTag: 'Snacks',
    difficulty: 'easy',
  },
  {
    targetWord: 'ANDES',
    clue: 'The majestic South American mountain range where indigenous peoples first bred potatoes.',
    explanation: 'ANDES: Farmers high in the Andes mountains cultivated over 4,000 indigenous potato varieties.',
    funFact: 'Andean farmers freeze-dried potatoes in mountain frost and sunshine to invent "chuño", which lasts 10 years!',
    topicTag: 'History',
    difficulty: 'easy',
  },
  {
    targetWord: 'STARCH',
    clue: 'Complex carbohydrate molecule that gives potatoes their fluffy, mealy, or waxy texture.',
    explanation: 'STARCH: High-starch potatoes absorb butter and liquids best, making them ideal for fluffy mash.',
    funFact: 'Potato starch is widely used today to produce biodegradable eco-friendly plastics and straws!',
    topicTag: 'Food Science',
    difficulty: 'medium',
  },
  {
    targetWord: 'TUBER',
    clue: 'Botanical term for an enlarged swollen underground storage stem with sprouted eyes.',
    explanation: 'TUBER: Unlike carrots which are true storage roots, potatoes are botanically underground stems.',
    funFact: 'Because potatoes are stems, their eyes are actually bud nodes that can grow entire new clones!',
    topicTag: 'Botany',
    difficulty: 'easy',
  },
  {
    targetWord: 'ROESTI',
    clue: 'Crispy Swiss national dish made by frying grated parboiled potatoes into a golden round.',
    explanation: 'ROESTI: Originally an early morning meal for Swiss farmers, now celebrated worldwide.',
    funFact: 'The cultural divide between German and French speaking Switzerland is called the "Röstigraben"!',
    topicTag: 'Gastronomy',
    difficulty: 'medium',
  },
  {
    targetWord: 'YUKON',
    clue: 'Beloved Canadian potato variety famous for golden yellow buttery flesh.',
    explanation: 'YUKON GOLD: Bred in Ontario in the 1960s by Gary Johnston, recognized for its yellow color.',
    funFact: 'Yukon Gold was the first Canadian potato variety to be promoted by brand name on grocery shelves!',
    topicTag: 'Varieties',
    difficulty: 'easy',
  },
  {
    targetWord: 'KNISH',
    clue: 'Eastern European baked golden pastry filled with seasoned mashed potatoes and onions.',
    explanation: 'KNISH: Brought to New York by Jewish immigrants from Eastern Europe in the early 1900s.',
    funFact: 'Yonah Schimmel Knish Bakery on Manhattan\'s Lower East Side has baked knishes since 1910!',
    topicTag: 'Street Food',
    difficulty: 'medium',
  },
  {
    targetWord: 'LATKES',
    clue: 'Traditional fried shredded potato pancakes eaten with applesauce during Hanukkah.',
    explanation: 'LATKES: Fried in oil to commemorate the miracle of the oil that burned for eight days in the Temple.',
    funFact: 'The debate between dipping latkes in sour cream versus sweet applesauce is an age-old holiday rivalry!',
    topicTag: 'Traditions',
    difficulty: 'medium',
  },
  {
    targetWord: 'KENNEBEC',
    clue: 'Maine-bred white-skinned potato variety prized by burger shacks for making the crispiest chips.',
    explanation: 'KENNEBEC: Released in 1948 by USDA and Maine breeders, famous for frying without turning dark.',
    funFact: 'In-N-Out Burger and gourmet food trucks specifically demand Kennebec potatoes for fresh-cut fries!',
    topicTag: 'Varieties',
    difficulty: 'hard',
  },
  {
    targetWord: 'TATER',
    clue: 'Affectionate colloquial Southern American slang word for a delicious spud.',
    explanation: 'TATER: Rooted in rural Southern dialects, also popularised by the bite-sized cylindrical "Tater Tots" invented by Ore-Ida.',
    funFact: 'Over 70 million pounds of Tater Tots are devoured annually in the United States!',
    topicTag: 'Slang & Snacks',
    difficulty: 'easy',
  }
];


/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

function scrambleLetters(word: string): string[] {
  const letters = word.toUpperCase().split('');
  let shuffled = [...letters].sort(() => Math.random() - 0.5);
  if (shuffled.join('') === word.toUpperCase() && letters.length > 2) {
    shuffled = [shuffled[1], shuffled[0], ...shuffled.slice(2)];
  }
  return shuffled;
}

type QDifficulty = 'easy' | 'medium' | 'hard';
const OPTION_IDS = ['A', 'B', 'C', 'D'];
const DECK_SIZE = 20;

interface ScrambleWord {
  targetWord: string;
  clue: string;
  explanation: string;
  funFact: string;
  topicTag: string;
  difficulty: QDifficulty;
}

const SCRAMBLE_POOL: ScrambleWord[] = ALTERNATIVE_WORD_SCRAMBLE_POOL.map((w) => ({
  targetWord: w.targetWord,
  clue: w.clue,
  explanation: w.explanation,
  funFact: w.funFact || '',
  topicTag: w.topicTag,
  difficulty: w.difficulty as QDifficulty,
}));

interface PictureItem {
  question: string;
  correct: string;
  distractors: string[];
  explanation: string;
  funFact: string;
  topicTag: string;
  difficulty: QDifficulty;
  imagePrompt: string;
  pictureUrl: string;
}

/* Offline fallback rounds for "Guess the Potato". Pictures point at the bundled game artwork
   so the deck is playable immediately; the image brief tells the admin what to swap in. */
const ALTERNATIVE_PICTURE_POOL: PictureItem[] = [
  {
    question: 'Which classic dish is shown in this picture?',
    correct: 'Poutine',
    distractors: ['Chili Cheese Fries', 'Loaded Nachos', 'Currywurst'],
    explanation: 'Poutine is fries topped with cheese curds and brown gravy, born in rural Québec in the 1950s.',
    funFact: 'Canada celebrates a national Poutine Week every February.',
    topicTag: 'Street Food',
    difficulty: 'easy',
    imagePrompt: 'Close-up of a paper boat of golden fries covered in melting cheese curds and glossy brown gravy on a rustic wooden table.',
    pictureUrl: '/games/guess-the-potato.jpg',
  },
  {
    question: 'What potato preparation is pictured here?',
    correct: 'Hasselback Potato',
    distractors: ['Baked Potato', 'Potato Gratin', 'Fondant Potato'],
    explanation: 'Hasselback potatoes are sliced thinly almost all the way through and fanned open while roasting.',
    funFact: 'The dish is named after the Hasselbacken restaurant in Stockholm where it was created in the 1950s.',
    topicTag: 'Classic Dishes',
    difficulty: 'medium',
    imagePrompt: 'A roasted potato sliced into thin accordion fans with golden edges, brushed with butter and herbs, on a dark ceramic plate.',
    pictureUrl: '/games/chef-showdown.jpg',
  },
  {
    question: 'Identify the Swiss potato dish in the photo.',
    correct: 'Rösti',
    distractors: ['Latkes', 'Hash Browns', 'Boxty'],
    explanation: 'Rösti is a crisp pan-fried cake of grated potatoes from the German-speaking cantons of Switzerland.',
    funFact: 'The cultural divide between French- and German-speaking Switzerland is nicknamed the "Röstigraben".',
    topicTag: 'Global Gastronomy',
    difficulty: 'medium',
    imagePrompt: 'A round golden-brown pan-fried grated potato cake in a cast-iron skillet with a crispy lattice surface.',
    pictureUrl: '/games/fry-blitz.jpg',
  },
  {
    question: 'Which Italian dumplings are shown?',
    correct: 'Gnocchi',
    distractors: ['Tortellini', 'Spätzle', 'Orecchiette'],
    explanation: 'Gnocchi are soft dumplings made from mashed potato, flour and egg, often ridged with a fork.',
    funFact: 'In Argentina and Uruguay it is tradition to eat gnocchi on the 29th of each month.',
    topicTag: 'Global Gastronomy',
    difficulty: 'easy',
    imagePrompt: 'A bowl of small ridged potato dumplings tossed in sage butter with parmesan shavings.',
    pictureUrl: '/games/spud-trivia.jpg',
  },
  {
    question: 'Name the Spanish tapa in the picture.',
    correct: 'Patatas Bravas',
    distractors: ['Papas Arrugadas', 'Tortilla Española', 'Papas Rellenas'],
    explanation: 'Patatas bravas are fried potato cubes served with a spicy tomato "brava" sauce, sometimes with aioli.',
    funFact: 'Madrid bars argue endlessly over whose brava sauce is the original.',
    topicTag: 'Street Food',
    difficulty: 'medium',
    imagePrompt: 'Crispy fried potato cubes drizzled with bright red spicy sauce and white garlic aioli on a small terracotta dish.',
    pictureUrl: '/games/daily-streak.jpg',
  },
  {
    question: 'Which potato variety has this deep purple flesh?',
    correct: 'Vitelotte',
    distractors: ['Yukon Gold', 'Russet Burbank', 'Kipfler'],
    explanation: 'The French Vitelotte is a heritage variety with violet skin and flesh coloured by anthocyanins.',
    funFact: 'Anthocyanins are the same pigments that colour blueberries and red cabbage.',
    topicTag: 'Varieties',
    difficulty: 'hard',
    imagePrompt: 'Halved small potatoes showing vivid violet-purple flesh and dark skin on a white marble board.',
    pictureUrl: '/games/potato-crush.jpg',
  },
  {
    question: 'What snack is pictured?',
    correct: 'Tater Tots',
    distractors: ['Croquettes', 'Potato Rösti Bites', 'Hush Puppies'],
    explanation: 'Tater Tots are cylinders of grated, seasoned, deep-fried potato invented by Ore-Ida in 1953.',
    funFact: 'They were created to use up leftover potato shavings from making frozen fries.',
    topicTag: 'Snacks & Chips',
    difficulty: 'easy',
    imagePrompt: 'A pile of small golden cylindrical fried potato bites with a crunchy shredded texture and a ketchup dip.',
    pictureUrl: '/games/fry-blitz.jpg',
  },
  {
    question: 'Which Indian street snack is shown?',
    correct: 'Aloo Tikki',
    distractors: ['Samosa', 'Vada Pav', 'Pakora'],
    explanation: 'Aloo tikki is a spiced mashed-potato patty, shallow-fried and served with chutneys.',
    funFact: '"Aloo" simply means potato in Hindi.',
    topicTag: 'Street Food',
    difficulty: 'medium',
    imagePrompt: 'Golden spiced potato patties on a steel plate with green mint chutney and tamarind sauce in a street market setting.',
    pictureUrl: '/games/spin-the-potato.jpg',
  },
  {
    question: 'Identify the fried potato pancakes in the photo.',
    correct: 'Latkes',
    distractors: ['Rösti', 'Hash Browns', 'Boxty'],
    explanation: 'Latkes are grated potato pancakes bound with egg and onion, traditional during Hanukkah.',
    funFact: 'They are fried in oil to commemorate the miracle of the Temple oil lasting eight days.',
    topicTag: 'Classic Dishes',
    difficulty: 'medium',
    imagePrompt: 'A stack of lacy fried potato pancakes with a dollop of sour cream and apple sauce on a white plate.',
    pictureUrl: '/games/word-scramble.jpg',
  },
  {
    question: 'Which restaurant-style potato is pictured?',
    correct: 'Fondant Potato',
    distractors: ['Duchess Potato', 'Hasselback Potato', 'Pommes Anna'],
    explanation: 'Fondant potatoes are thick cylinders seared then braised in stock and butter until creamy inside.',
    funFact: 'The technique comes from classic French cuisine where it is called "pommes fondantes".',
    topicTag: 'Classic Dishes',
    difficulty: 'hard',
    imagePrompt: 'Two thick golden potato cylinders with a glossy crust standing in a pool of butter and thyme on a fine-dining plate.',
    pictureUrl: '/games/chef-showdown.jpg',
  },
  {
    question: 'Name the Canary Islands potato dish shown.',
    correct: 'Papas Arrugadas',
    distractors: ['Patatas Bravas', 'Papas Rellenas', 'Batata Doce'],
    explanation: 'Papas arrugadas are small potatoes boiled in very salty water until wrinkled, served with mojo sauce.',
    funFact: 'The salt crust forms because the cooking water is traditionally seawater.',
    topicTag: 'Global Gastronomy',
    difficulty: 'hard',
    imagePrompt: 'Small wrinkled salt-crusted boiled potatoes with red and green mojo sauces in a clay dish.',
    pictureUrl: '/games/potato-rush.jpg',
  },
  {
    question: 'Which breakfast potato style is pictured?',
    correct: 'Hash Browns',
    distractors: ['Home Fries', 'Rösti', 'Potato Waffles'],
    explanation: 'Hash browns are shredded potatoes fried into a crisp golden layer, a diner breakfast staple.',
    funFact: 'The name comes from "hashed browned potatoes", first printed in an 1888 cookbook.',
    topicTag: 'Breakfast Potatoes',
    difficulty: 'easy',
    imagePrompt: 'A crispy golden shredded potato patty next to eggs and toast on a diner breakfast plate.',
    pictureUrl: '/games/guess-the-potato.jpg',
  },
];

const TRIVIA_POOL_TOPICS = [
  'Inca Origins & Andean Mysteries',
  'Belgian Fries & Street Eats',
  'Botany & Nightshade Science',
  'World Records & Heavy Spuds',
  'Global Gastronomy & Michelin Star Dishes',
  'Poutine & Saratoga Chip Lore',
  'Space Columbia NASA Tuber Science',
  'Potato Battery & Physical Chemistry',
  'Pop Culture, Toys & Hollywood Cameos',
  'Purple Vitelotte & Rare Heirloom Tubers',
  'Idaho Volcanic Soils & Agriculture',
  'Joël Robuchon Haute Cuisine Pommes',
];

const PICTURE_POOL_TOPICS = [
  'Classic Potato Dishes',
  'Global Street Food',
  'Potato Varieties & Colors',
  'Fries Around the World',
  'Potato Snacks & Chips',
  'Breakfast Potatoes',
];

const QUIZ_SYSTEM = `You are the chief quiz architect for "PB Zone", the potato-themed trivia arcade of Potato Bazaar. Every answer you give is a single valid JSON object with no prose or markdown fences. Facts must be accurate; distractors must be plausible and never absurd.`;

export type DeckProgress = (message: string, current?: number, total?: number) => void;

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asDifficulty(value: unknown, fallback: QDifficulty): QDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard' ? value : fallback;
}

function mixedDifficulty(i: number): QDifficulty {
  return i % 3 === 0 ? 'hard' : i % 2 === 0 ? 'medium' : 'easy';
}

function difficultyForIndex(config: GeneratorConfig, i: number): QDifficulty {
  return config.difficulty === 'mixed' ? mixedDifficulty(i) : config.difficulty;
}

function pointsFor(d: QDifficulty): number {
  return d === 'hard' ? 15 : 10;
}

function normalizeOptions(raw: unknown): QuestionOption[] {
  const list = Array.isArray(raw) ? raw.slice(0, 4) : [];
  const opts: QuestionOption[] = list.map((o, i) => {
    const ro = rec(o);
    const text = typeof o === 'string' ? o.trim() : str(ro.text);
    return { id: OPTION_IDS[i], text: text || `Option ${OPTION_IDS[i]}`, isCorrect: ro.isCorrect === true };
  });
  while (opts.length < 4) {
    opts.push({ id: OPTION_IDS[opts.length], text: `Option ${OPTION_IDS[opts.length]}`, isCorrect: false });
  }
  const firstCorrect = opts.findIndex((o) => o.isCorrect);
  const correctIdx = firstCorrect < 0 ? 0 : firstCorrect;
  return opts.map((o, i) => ({ ...o, isCorrect: i === correctIdx }));
}

/** Rotates the correct answer through A-D so it is not always the first option. */
function rotateOptions(correct: string, distractors: string[], order: number): QuestionOption[] {
  const texts = [correct, ...distractors.slice(0, 3)];
  while (texts.length < 4) texts.push('None of the above');
  const shift = order % 4;
  return texts
    .map((_, i) => texts[(i - shift + 4) % 4])
    .map((text, i) => ({ id: OPTION_IDS[i], text, isCorrect: text === correct }));
}

function buildScrambleQuestion(item: ScrambleWord, id: string, order: number, timeLimit: number, points = 10): QuizQuestion {
  const scrambled = scrambleLetters(item.targetWord);
  return {
    id,
    order,
    question: item.clue,
    targetWord: item.targetWord,
    scrambledLetters: scrambled,
    options: [
      { id: 'A', text: item.targetWord, isCorrect: true },
      { id: 'B', text: scrambled.slice(0, item.targetWord.length).join(''), isCorrect: false },
      { id: 'C', text: item.targetWord.split('').reverse().join(''), isCorrect: false },
      { id: 'D', text: 'TATER', isCorrect: false },
    ],
    explanation: item.explanation,
    funFact: item.funFact,
    topicTag: item.topicTag,
    difficulty: item.difficulty,
    points,
    timeLimitSeconds: timeLimit,
    aiConfidence: 0.98,
  };
}

function normalizeScrambleWord(raw: unknown): ScrambleWord | null {
  const r = rec(raw);
  const word = typeof r.targetWord === 'string' ? r.targetWord.toUpperCase().replace(/[^A-Z]/g, '') : '';
  if (word.length < 3 || word.length > 14) return null;
  return {
    targetWord: word,
    clue: str(r.clue, `Unscramble this potato word (${word.length} letters).`),
    explanation: str(r.explanation, `${word}: a word from the world of potatoes.`),
    funFact: str(r.funFact, 'Potatoes are the fourth largest food crop on Earth.'),
    topicTag: str(r.topicTag, 'Potato Vocabulary'),
    difficulty: asDifficulty(r.difficulty, word.length > 8 ? 'hard' : word.length > 5 ? 'medium' : 'easy'),
  };
}

function buildPictureQuestion(item: PictureItem, id: string, order: number, timeLimit: number): QuizQuestion {
  return {
    id,
    order,
    question: item.question,
    pictureUrl: item.pictureUrl,
    imagePrompt: item.imagePrompt,
    options: rotateOptions(item.correct, item.distractors, order),
    explanation: item.explanation,
    funFact: item.funFact,
    difficulty: item.difficulty,
    topicTag: item.topicTag,
    points: pointsFor(item.difficulty),
    timeLimitSeconds: timeLimit,
    aiConfidence: 0.97,
  };
}

function normalizePictureQuestion(raw: unknown, idx: number, config: GeneratorConfig): QuizQuestion | null {
  const r = rec(raw);
  const question = str(r.question);
  if (!question) return null;
  const difficulty = asDifficulty(r.difficulty, difficultyForIndex(config, idx + 1));
  return {
    id: `gen-pic-${Date.now()}-${idx + 1}`,
    order: idx + 1,
    question,
    // Groq cannot supply photos: leave the URL empty and let the admin attach one from the image brief.
    pictureUrl: typeof r.pictureUrl === 'string' && /^https?:\/\//.test(r.pictureUrl) ? r.pictureUrl : '',
    imagePrompt: str(r.imagePrompt, `A clear photo illustrating: ${question}`),
    options: normalizeOptions(r.options),
    explanation: str(r.explanation, 'Verified potato fact.'),
    funFact: str(r.funFact) || undefined,
    difficulty,
    topicTag: str(r.topicTag, config.topic),
    points: pointsFor(difficulty),
    timeLimitSeconds: config.timeLimitPerQuestion || 20,
    aiConfidence: 0.95,
  };
}

function normalizeTriviaQuestion(raw: unknown, idx: number, config: GeneratorConfig): QuizQuestion | null {
  const r = rec(raw);
  const question = str(r.question);
  if (!question) return null;
  const difficulty = asDifficulty(r.difficulty, difficultyForIndex(config, idx + 1));
  return {
    id: `gen-q-${Date.now()}-${idx + 1}`,
    order: idx + 1,
    question,
    options: normalizeOptions(r.options),
    explanation: str(r.explanation, 'Verified potato trivia fact.'),
    funFact: str(r.funFact) || undefined,
    difficulty,
    topicTag: str(r.topicTag, config.topic),
    points: typeof r.points === 'number' && r.points > 0 ? Math.round(r.points) : pointsFor(difficulty),
    timeLimitSeconds: config.timeLimitPerQuestion || 20,
    aiConfidence: 0.98,
  };
}

interface DeckMeta {
  gameId: string;
  format: GameFormat | string;
  generatedBy: 'groq' | 'offline';
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

export const aiQuizService = {
  /** Kept for callers that only know about classic trivia decks. */
  async generateQuiz(config: GeneratorConfig): Promise<Quiz> {
    return this.generateDeckForGame(null, config);
  },

  /**
   * Generates one deck for the given game. Word-scramble and picture-guess games get their own
   * Groq prompts; anything else is classic multiple-choice trivia. Falls back to the offline engine
   * when there is no key, the request fails, or the reply is unusable.
   */
  async generateDeckForGame(game: Game | null, config: GeneratorConfig, variant = 0): Promise<Quiz> {
    const format: GameFormat = game?.format || 'pb-quiz';
    const gameId = game?.id || 'game-pb-quiz';

    if (hasGroqKey()) {
      try {
        let questions: QuizQuestion[];
        if (format === 'word-scramble') questions = await this.callGroqScramble(config);
        else if (format === 'picture-guess') questions = await this.callGroqPicture(config);
        else questions = await this.callGroqTrivia(config);

        if (questions.length >= 5) {
          return this.wrapInQuizObject(config, questions, { gameId, format, generatedBy: 'groq' });
        }
        console.warn(`Groq returned only ${questions.length} usable rounds, using offline engine`);
      } catch (err) {
        console.warn('Groq deck generation failed, falling back to offline engine:', err);
      }
    }

    if (format === 'word-scramble') return this.synthesizeScrambleQuiz(config, gameId, variant);
    if (format === 'picture-guess') return this.synthesizePictureQuiz(config, gameId, variant);
    return this.synthesizeSmartQuiz(config, gameId, variant);
  },

  /**
   * Generates a rotation pool of decks (up to 200). With a Groq key every deck is a live request,
   * generated sequentially with progress callbacks; without one the offline engine varies each deck.
   */
  async generateDeckPool(
    game: Game | null,
    config: GeneratorConfig,
    count: number,
    autoActivate: boolean,
    onProgress?: DeckProgress
  ): Promise<Quiz[]> {
    const capped = Math.min(Math.max(Math.round(count), 1), 200);
    const format: GameFormat = game?.format || 'pb-quiz';
    const topics = format === 'picture-guess' ? PICTURE_POOL_TOPICS : TRIVIA_POOL_TOPICS;
    const poolGroup = `Batch ${new Date().toLocaleDateString()}`;
    const startedAt = Date.now();
    const pool: Quiz[] = [];

    for (let i = 1; i <= capped; i++) {
      onProgress?.(`Generating deck ${i} of ${capped}...`, i, capped);
      const topic = format === 'word-scramble' ? config.topic : topics[(i - 1) % topics.length];
      const quiz = await this.generateDeckForGame(game, { ...config, topic, subTheme: `Pool Rotation #${i}` }, i);
      pool.push({
        ...quiz,
        id: `pool-${format}-${startedAt}-${i}`,
        title: `Variant #${i}: ${quiz.title}`,
        inRotation: autoActivate,
        poolGroup,
        createdAt: new Date(startedAt - (capped - i) * 60000).toISOString(),
        tags: [...quiz.tags, 'Multiplayer Pool', `Variant ${i}`],
      });
    }
    return pool;
  },

  /**
   * Regenerates a single question while preserving its slot. Handles scramble, picture and trivia rounds.
   */
  async regenerateSingleQuestion(
    currentQuestion: QuizQuestion,
    quizTopic: string,
    customInstruction?: string
  ): Promise<QuizQuestion> {
    const isScramble = Boolean(currentQuestion.targetWord);
    const isPicture = !isScramble && (currentQuestion.pictureUrl !== undefined || currentQuestion.imagePrompt !== undefined);
    const guidance = customInstruction?.trim()
      ? `Specific admin guidance for this swap: "${customInstruction.trim()}".`
      : 'Create a fresh, engaging, high-quality round with a surprising fun fact.';

    if (hasGroqKey()) {
      try {
        if (isScramble) {
          const data = await groqChatJson<{ word?: unknown }>({
            system: QUIZ_SYSTEM,
            user: `Create ONE new word-scramble round for "Potato Scramble" on the theme "${quizTopic}". The word must differ from "${currentQuestion.targetWord}". Difficulty: "${currentQuestion.difficulty}". ${guidance}
Rules: targetWord is ONE word, letters A-Z only, 4 to 12 letters, potato/food/kitchen vocabulary; the clue must not contain the word.
Return a JSON object: {"word":{"targetWord":"POUTINE","clue":"...","explanation":"...","funFact":"...","topicTag":"...","difficulty":"${currentQuestion.difficulty}"}}`,
            temperature: 0.9,
            maxTokens: 500,
          });
          const word = normalizeScrambleWord(data?.word);
          if (word) {
            return buildScrambleQuestion(
              { ...word, difficulty: currentQuestion.difficulty },
              currentQuestion.id,
              currentQuestion.order,
              currentQuestion.timeLimitSeconds || 20,
              currentQuestion.points || 10
            );
          }
        } else if (isPicture) {
          const data = await groqChatJson<{ question?: unknown }>({
            system: QUIZ_SYSTEM,
            user: `Create ONE new round for "Guess the Potato", a picture-guessing game on the topic "${quizTopic}". Difficulty: "${currentQuestion.difficulty}". ${guidance}
Because you cannot supply photos, include an "imagePrompt": a precise one-sentence description of the photo the admin should attach. The question must make sense with such a photo.
Return a JSON object: {"question":{"question":"Which dish is shown in the picture?","imagePrompt":"...","options":[{"id":"A","text":"...","isCorrect":true},{"id":"B","text":"...","isCorrect":false},{"id":"C","text":"...","isCorrect":false},{"id":"D","text":"...","isCorrect":false}],"explanation":"...","funFact":"...","topicTag":"...","difficulty":"${currentQuestion.difficulty}"}}`,
            temperature: 0.9,
            maxTokens: 700,
          });
          const q = normalizePictureQuestion(data?.question, currentQuestion.order - 1, {
            topic: quizTopic,
            subTheme: '',
            difficulty: currentQuestion.difficulty,
            tone: 'fun',
            targetCount: 1,
            timeLimitPerQuestion: currentQuestion.timeLimitSeconds,
            passThreshold: 15,
          });
          if (q) {
            return {
              ...q,
              id: currentQuestion.id,
              order: currentQuestion.order,
              difficulty: currentQuestion.difficulty,
              points: currentQuestion.points,
              timeLimitSeconds: currentQuestion.timeLimitSeconds,
            };
          }
        } else {
          const data = await groqChatJson<{ question?: unknown }>({
            system: QUIZ_SYSTEM,
            user: `Generate ONE multiple-choice trivia question on the topic "${quizTopic}". Difficulty: "${currentQuestion.difficulty}". ${guidance}
Return a JSON object: {"question":{"question":"...","options":[{"id":"A","text":"...","isCorrect":true},{"id":"B","text":"...","isCorrect":false},{"id":"C","text":"...","isCorrect":false},{"id":"D","text":"...","isCorrect":false}],"explanation":"...","funFact":"...","topicTag":"...","difficulty":"${currentQuestion.difficulty}","points":${currentQuestion.points}}}`,
            temperature: 0.8,
            maxTokens: 700,
          });
          const q = normalizeTriviaQuestion(data?.question, currentQuestion.order - 1, {
            topic: quizTopic,
            subTheme: '',
            difficulty: currentQuestion.difficulty,
            tone: 'fun',
            targetCount: 1,
            timeLimitPerQuestion: currentQuestion.timeLimitSeconds,
            passThreshold: 15,
          });
          if (q) {
            return {
              ...q,
              id: currentQuestion.id,
              order: currentQuestion.order,
              difficulty: currentQuestion.difficulty,
              points: currentQuestion.points,
              timeLimitSeconds: currentQuestion.timeLimitSeconds,
            };
          }
        }
      } catch (e) {
        console.warn('Groq single round regeneration failed, using offline pool:', e);
      }
    }

    // Offline fallbacks
    if (isScramble) {
      const candidates = SCRAMBLE_POOL.filter((w) => w.targetWord !== currentQuestion.targetWord);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)] || SCRAMBLE_POOL[0];
      return buildScrambleQuestion(
        chosen,
        currentQuestion.id,
        currentQuestion.order,
        currentQuestion.timeLimitSeconds || 20,
        currentQuestion.points || 10
      );
    }

    if (isPicture) {
      const candidates = ALTERNATIVE_PICTURE_POOL.filter((p) => p.question !== currentQuestion.question);
      const chosen = candidates[Math.floor(Math.random() * candidates.length)] || ALTERNATIVE_PICTURE_POOL[0];
      const built = buildPictureQuestion(chosen, currentQuestion.id, currentQuestion.order, currentQuestion.timeLimitSeconds || 20);
      return { ...built, difficulty: currentQuestion.difficulty, points: currentQuestion.points };
    }

    const randomIndex = Math.floor(Math.random() * ALTERNATIVE_POTATO_QUESTIONS.length);
    const chosen = ALTERNATIVE_POTATO_QUESTIONS[randomIndex];
    return {
      ...chosen,
      options: chosen.options.map((opt) => ({ ...opt })),
      id: currentQuestion.id,
      order: currentQuestion.order,
      difficulty: currentQuestion.difficulty,
      points: currentQuestion.points,
      timeLimitSeconds: currentQuestion.timeLimitSeconds,
      aiConfidence: 0.96,
      question: customInstruction ? `[Regenerated: ${customInstruction}] ${chosen.question}` : chosen.question,
    };
  },

  /* ---------------- Groq deck calls ---------------- */

  async callGroqTrivia(config: GeneratorConfig): Promise<QuizQuestion[]> {
    const target = config.targetCount || DECK_SIZE;
    const data = await groqChatJson<{ questions?: unknown[] }>({
      system: QUIZ_SYSTEM,
      user: `Create a complete, high-quality ${target}-question multiple-choice trivia quiz about potatoes.
Topic: ${config.topic}
Sub-theme / focus: ${config.subTheme || 'General highlights'}
Target difficulty: ${config.difficulty}
Tone: ${config.tone}
${config.customPrompt ? `Special instructions: ${config.customPrompt}\n` : ''}Rules: exactly ${target} questions; every question has exactly 4 options A-D with exactly one "isCorrect": true; distractors plausible; include a clear explanation and a memorable fun fact; no repeated questions.
Return a JSON object: {"questions":[{"question":"...","options":[{"id":"A","text":"...","isCorrect":true},{"id":"B","text":"...","isCorrect":false},{"id":"C","text":"...","isCorrect":false},{"id":"D","text":"...","isCorrect":false}],"explanation":"...","funFact":"...","difficulty":"easy|medium|hard","topicTag":"...","points":10}]}`,
      temperature: 0.7,
      maxTokens: Math.min(30000, 1500 + target * 320),
    });
    const list = Array.isArray(data?.questions) ? data.questions : [];
    return list
      .slice(0, target)
      .map((q, idx) => normalizeTriviaQuestion(q, idx, config))
      .filter((q): q is QuizQuestion => q !== null)
      .map((q, idx) => ({ ...q, order: idx + 1 }));
  },

  async callGroqScramble(config: GeneratorConfig): Promise<QuizQuestion[]> {
    const target = config.targetCount || DECK_SIZE;
    const data = await groqChatJson<{ words?: unknown[] }>({
      system: QUIZ_SYSTEM,
      user: `Create ${target} word-scramble rounds for "Potato Scramble", where players rearrange wooden letter tiles to spell a word.
Theme: ${config.topic}${config.subTheme ? ` (${config.subTheme})` : ''}. Difficulty: ${config.difficulty}. Tone: ${config.tone}.
${config.customPrompt ? `Special instructions: ${config.customPrompt}\n` : ''}Rules: each targetWord is ONE word, letters A-Z only, 4 to 12 letters, potato/food/kitchen vocabulary, no duplicates; the clue must not contain the word; easy = 4-5 letters, medium = 6-8, hard = 9-12.
Return a JSON object: {"words":[{"targetWord":"POUTINE","clue":"Quebec's fries, curds and gravy classic","explanation":"...","funFact":"...","topicTag":"Street Food","difficulty":"medium"}]}`,
      temperature: 0.8,
      maxTokens: Math.min(12000, 1000 + target * 150),
    });
    const list = Array.isArray(data?.words) ? data.words : [];
    const seen = new Set<string>();
    const words = list
      .map(normalizeScrambleWord)
      .filter((w): w is ScrambleWord => {
        if (!w || seen.has(w.targetWord)) return false;
        seen.add(w.targetWord);
        return true;
      })
      .slice(0, target);
    const stamp = Date.now();
    return words.map((w, idx) => buildScrambleQuestion(w, `gen-ws-${stamp}-${idx + 1}`, idx + 1, config.timeLimitPerQuestion || 20));
  },

  async callGroqPicture(config: GeneratorConfig): Promise<QuizQuestion[]> {
    const target = config.targetCount || DECK_SIZE;
    const data = await groqChatJson<{ questions?: unknown[] }>({
      system: QUIZ_SYSTEM,
      user: `Create ${target} rounds for "Guess the Potato", a picture-guessing game: the player sees a photo and picks the right answer from 4 options.
Topic: ${config.topic}. Focus: ${config.subTheme || 'Visual identification of potato dishes, varieties and snacks'}. Difficulty: ${config.difficulty}. Tone: ${config.tone}.
${config.customPrompt ? `Special instructions: ${config.customPrompt}\n` : ''}Because you cannot supply photos, write an "imagePrompt" for every round: a precise one-sentence description of the photo the admin should attach (subject, setting, angle). The question must make sense with such a photo, e.g. "Which dish is shown in the picture?".
Rules: exactly ${target} rounds, 4 options with exactly one "isCorrect": true, plausible distractors, explanation and fun fact, no duplicate subjects.
Return a JSON object: {"questions":[{"question":"Which dish is shown in the picture?","imagePrompt":"...","options":[{"id":"A","text":"...","isCorrect":true},{"id":"B","text":"...","isCorrect":false},{"id":"C","text":"...","isCorrect":false},{"id":"D","text":"...","isCorrect":false}],"explanation":"...","funFact":"...","topicTag":"...","difficulty":"easy|medium|hard"}]}`,
      temperature: 0.8,
      maxTokens: Math.min(30000, 1500 + target * 360),
    });
    const list = Array.isArray(data?.questions) ? data.questions : [];
    return list
      .slice(0, target)
      .map((q, idx) => normalizePictureQuestion(q, idx, config))
      .filter((q): q is QuizQuestion => q !== null)
      .map((q, idx) => ({ ...q, order: idx + 1 }));
  },

  /* ---------------- Offline engines ---------------- */

  synthesizeSmartQuiz(config: GeneratorConfig, gameId = 'game-pb-quiz', variant = 0): Quiz {
    const pool = ALTERNATIVE_POTATO_QUESTIONS;
    const stamp = Date.now();
    const questions: QuizQuestion[] = [];
    for (let i = 1; i <= DECK_SIZE; i++) {
      const template = pool[(variant * 3 + i - 1) % pool.length];
      const diff = difficultyForIndex(config, i);
      questions.push({
        id: `synth-q-${stamp}-${i}`,
        order: i,
        question: template.question,
        options: template.options.map((opt) => ({ ...opt })),
        explanation: template.explanation,
        funFact: template.funFact,
        difficulty: diff,
        topicTag: template.topicTag,
        points: pointsFor(diff),
        timeLimitSeconds: config.timeLimitPerQuestion || 20,
        aiConfidence: 0.97,
      });
    }
    return this.wrapInQuizObject(config, questions, { gameId, format: 'pb-quiz', generatedBy: 'offline' });
  },

  synthesizeScrambleQuiz(config: GeneratorConfig, gameId = 'game-word-scramble', variant = 0): Quiz {
    const stamp = Date.now();
    const questions: QuizQuestion[] = [];
    for (let i = 1; i <= DECK_SIZE; i++) {
      const item = SCRAMBLE_POOL[(variant * 5 + i) % SCRAMBLE_POOL.length];
      questions.push(buildScrambleQuestion(item, `synth-ws-${stamp}-${i}`, i, config.timeLimitPerQuestion || 20));
    }
    return this.wrapInQuizObject(config, questions, { gameId, format: 'word-scramble', generatedBy: 'offline' });
  },

  synthesizePictureQuiz(config: GeneratorConfig, gameId = 'game-guess-the-potato', variant = 0): Quiz {
    const stamp = Date.now();
    const questions: QuizQuestion[] = [];
    for (let i = 1; i <= DECK_SIZE; i++) {
      const item = ALTERNATIVE_PICTURE_POOL[(variant * 7 + i - 1) % ALTERNATIVE_PICTURE_POOL.length];
      questions.push(buildPictureQuestion(item, `synth-pic-${stamp}-${i}`, i, config.timeLimitPerQuestion || 20));
    }
    return this.wrapInQuizObject(config, questions, { gameId, format: 'picture-guess', generatedBy: 'offline' });
  },

  wrapInQuizObject(config: GeneratorConfig, questions: QuizQuestion[], meta: DeckMeta): Quiz {
    const id = `quiz-${Date.now()}`;
    const count = questions.length;
    const title =
      meta.format === 'word-scramble'
        ? `${config.topic}: ${count}-Round Scramble Deck`
        : meta.format === 'picture-guess'
        ? `Guess the Potato: ${config.topic}`
        : `${config.topic}: ${count}-Question AI Challenge`;
    const description =
      meta.format === 'word-scramble'
        ? `Word Scramble deck on ${config.subTheme || config.topic}. Rearrange scrambled wooden tiles to solve ${count} potato words.`
        : meta.format === 'picture-guess'
        ? `Picture-guessing deck on ${config.subTheme || config.topic}. ${count} photo rounds with four options each.`
        : `AI-generated quiz focusing on ${config.subTheme || config.topic}. Designed for ${config.tone} gameplay with ${config.difficulty} difficulty tier.`;
    return {
      id,
      gameId: meta.gameId,
      title,
      description,
      topic: config.topic,
      subTheme: config.subTheme,
      difficulty: config.difficulty,
      tone: config.tone,
      status: 'published',
      inRotation: true,
      questionsCount: count,
      passScore: Math.min(config.passThreshold || 15, count),
      timeLimitSeconds: config.timeLimitPerQuestion || 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      playsCount: 0,
      winnersCount: 0,
      tags: [config.topic, config.difficulty, config.tone, meta.generatedBy === 'groq' ? 'Groq AI' : 'Offline Engine'],
      questions,
    };
  },
};
