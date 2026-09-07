import { GameConfig } from '../types/gameConfig';
import { INITIAL_GAMES } from './potatoPresets';
import { DEFAULT_CRUSH_SETTINGS, DEFAULT_RUSH_SETTINGS, DEFAULT_SPIN_SETTINGS } from './gameConfigCatalog';
import { synthGameConfig } from '../services/gameConfigSynth';

function withSampleTelemetry(config: GameConfig | null, plays: number, winners: number): GameConfig | null {
  if (!config) return null;
  return { ...config, playsCount: plays, winnersCount: winners, tags: [...config.tags, 'Sample'] };
}

const crushGame = INITIAL_GAMES.find((g) => g.format === 'potato-crush') || null;
const spinGame = INITIAL_GAMES.find((g) => g.format === 'spin-wheel') || null;
const rushGame = INITIAL_GAMES.find((g) => g.format === 'potato-rush') || null;

/**
 * One sample configuration per non-quiz game so the admin panel is demoable
 * before any AI generation has happened. Built deterministically from fixed seeds.
 */
export const INITIAL_GAME_CONFIGS: GameConfig[] = [
  withSampleTelemetry(
    crushGame &&
      synthGameConfig(
        crushGame,
        { kind: 'crush', levelCount: 8, curve: 'steady', theme: 'Golden Harvest' },
        DEFAULT_CRUSH_SETTINGS,
        {
          id: 'cfg-crush-seed-01',
          createdAt: '2026-09-07T09:00:00.000Z',
          seedKey: 'seed-crush-01',
          title: 'Golden Harvest Level Pack (8 Levels)',
        }
      ),
    312,
    140
  ),
  withSampleTelemetry(
    spinGame &&
      synthGameConfig(
        spinGame,
        { kind: 'spin', segmentCount: 8, prizeMix: 'balanced', theme: 'Daily Fry-Day' },
        DEFAULT_SPIN_SETTINGS,
        {
          id: 'cfg-spin-seed-01',
          createdAt: '2026-09-07T09:05:00.000Z',
          seedKey: 'seed-spin-01',
          title: 'Daily Fry-Day Wheel (8 Segments)',
        }
      ),
    1204,
    388
  ),
  withSampleTelemetry(
    rushGame &&
      synthGameConfig(
        rushGame,
        { kind: 'rush', runCount: 4, curve: 'steady', theme: 'Fryer Alley' },
        DEFAULT_RUSH_SETTINGS,
        {
          id: 'cfg-rush-seed-01',
          createdAt: '2026-09-07T09:10:00.000Z',
          seedKey: 'seed-rush-01',
          title: 'Fryer Alley Run Pack (4 Runs)',
        }
      ),
    528,
    96
  ),
].filter((c): c is GameConfig => c !== null);
