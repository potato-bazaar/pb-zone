import type { Game } from '../../types/quiz';
import type { Tone } from '../ui/pb';
import scrambleIcon from '../../assets/dashboard/icon-potato-scramble.webp';
import quizIcon from '../../assets/dashboard/icon-pb-quiz.webp';
import guessIcon from '../../assets/dashboard/icon-guess-the-potato.webp';
import crushIcon from '../../assets/dashboard/icon-potato-crush.webp';
import spinIcon from '../../assets/dashboard/icon-spin-the-potato.webp';
import rushIcon from '../../assets/dashboard/icon-potato-rush.webp';

export { default as heroMascot } from '../../assets/dashboard/hero-mascot.webp';
export { default as sidebarMascot } from '../../assets/dashboard/sidebar-mascot.webp';

type GameVisual = { label: string; icon?: string; chip: string };

const QUIZ: GameVisual = { label: 'Quiz', icon: quizIcon, chip: 'bg-[#F1EDFD] text-[#7C3AED]' };

/** Dashboard icon and type chip for each game format. */
export const GAME_VISUALS: Record<string, GameVisual> = {
  'word-scramble': { label: 'Word Game', icon: scrambleIcon, chip: 'bg-[#E1F8E6] text-[#166534]' },
  'pb-quiz': QUIZ,
  'trivia-20q': QUIZ,
  'picture-guess': { label: 'Picture', icon: guessIcon, chip: 'bg-[#FFF3D6] text-[#D97706]' },
  'potato-crush': { label: 'Match Game', icon: crushIcon, chip: 'bg-[#FDE3E7] text-[#E11D48]' },
  'spin-wheel': { label: 'Lucky Spin', icon: spinIcon, chip: 'bg-[#E1EFFE] text-[#1D4ED8]' },
  'potato-rush': { label: 'Runner', icon: rushIcon, chip: 'bg-[#E1F8E6] text-[#166534]' },
};

/** Label and pill tone for each game status. */
export const GAME_STATUS: Record<Game['status'], { label: string; tone: Tone }> = {
  active: { label: 'Active', tone: 'green' },
  maintenance: { label: 'Maintenance', tone: 'amber' },
  draft: { label: 'Draft', tone: 'gray' },
  'in-development': { label: 'In Development', tone: 'blue' },
};
