import { Game } from '../types/quiz';
import {
  CONFIG_LABELS,
  ConfigItem,
  CrushContent,
  CrushGenOptions,
  CrushLevel,
  CrushSettings,
  DifficultyCurve,
  GameConfig,
  GameConfigContent,
  GameConfigGenOptions,
  GameConfigSettings,
  PrizeMix,
  RushContent,
  RushGenOptions,
  RushRun,
  RushSettings,
  SpinContent,
  SpinGenOptions,
  SpinSettings,
  WheelSegment,
} from '../types/gameConfig';
import { CRUSH_BLOCKERS, CRUSH_BOOSTERS, RUSH_OBSTACLES, RUSH_POWERUPS, SPIN_PRIZES } from '../data/gameConfigCatalog';
import { groqChatJson, hasGroqKey } from './groqClient';
import {
  buildGameConfig,
  clampNum,
  contentItemCount,
  defaultSettingsFor,
  ensureSingleJackpot,
  hashSeed,
  mulberry32,
  normalizeCrushLevel,
  normalizeRushRun,
  normalizeWheelSegment,
  synthContent,
  synthCrushLevel,
  synthRushRun,
  synthSingleItem,
  synthWheelSegment,
  titleForOptions,
} from './gameConfigSynth';

export type ConfigProgress = (message: string, current?: number, total?: number) => void;

const SYSTEM_PROMPT = `You are the lead game designer for "PB Zone", the potato-themed arcade of Potato Bazaar. You design balanced, fun, family-friendly game content with playful potato puns. You always answer with a single valid JSON object and nothing else: no prose, no markdown fences.`;

function curveText(curve: DifficultyCurve): string {
  switch (curve) {
    case 'gentle':
      return 'gentle (stays easy for a long time, only the last few are hard)';
    case 'steep':
      return 'steep (gets hard quickly, most of the pack is challenging)';
    default:
      return 'steady (even ramp from easy to hard)';
  }
}

function mixText(mix: PrizeMix): string {
  switch (mix) {
    case 'generous':
      return 'generous (most spins win something, few empty segments)';
    case 'tight':
      return 'tight (about half of the wheel is "nothing", prizes are small)';
    default:
      return 'balanced (a couple of empty segments, mostly small prizes, one jackpot)';
  }
}

/* ------------------------------------------------------------------ */
/*  Prompts                                                            */
/* ------------------------------------------------------------------ */

function crushPrompt(opts: CrushGenOptions, settings: CrushSettings, count: number): string {
  const tiles = settings.tileSet.map((t) => `"${t.id}" (${t.label})`).join(', ');
  return `Design exactly ${count} levels for "Potato Crush", a match-3 puzzle game.
Theme: "${opts.theme}". Difficulty curve: ${curveText(opts.curve)}. Order the levels from easiest to hardest.
${opts.customPrompt ? `Extra directives from the admin: ${opts.customPrompt}\n` : ''}Available tile ids (use ONLY these): ${tiles}.
Available blocker types: ${CRUSH_BLOCKERS.map((b) => b.id).join(', ')}. Available boosters: ${CRUSH_BOOSTERS.map((b) => b.id).join(', ')}.
Scoring context: ${settings.scorePerTile} points per matched tile, combo multiplier ${settings.comboMultiplier}. Star thresholds must be reachable within the given moves.
Rewards: the player earns "${settings.rewardText}" every ${settings.rewardLevelInterval} levels. Set "rewardOnClear" to that exact text on those levels only, otherwise null.
Return a JSON object with this exact shape:
{"levels":[{"name":"Punny level name","difficulty":"easy|medium|hard","gridRows":6,"gridCols":6,"moves":25,"tileIds":["russet","fries","sweet","chip"],"objectives":[{"type":"collect","tileId":"fries","target":30},{"type":"score","target":5000},{"type":"clear-blockers","target":8}],"blockers":[{"type":"crate","count":6}],"boostersAllowed":["shuffle"],"starScores":[3000,4500,6600],"rewardOnClear":null,"designerNote":"One sentence on what makes this level interesting."}]}
Rules: gridRows and gridCols between 6 and 9, moves between 10 and 40, 4 to 6 tile ids per level, 1 to 3 objectives, easy levels have no blockers, starScores strictly ascending, "clear-blockers" targets must equal the total blocker count.`;
}

function spinPrompt(opts: SpinGenOptions, settings: SpinSettings, count: number): string {
  return `Design a prize wheel with exactly ${count} segments for "Spin the Potato", the daily fortune wheel of PB Zone.
Theme: "${opts.theme}". Prize generosity: ${mixText(opts.prizeMix)}.
${opts.customPrompt ? `Extra directives from the admin: ${opts.customPrompt}\n` : ''}Players get ${settings.spinsPerDay} spin(s) per day. The jackpot is capped at ${settings.jackpotCapPerDay} winners per day. Vouchers stay valid for ${settings.voucherValidityDays} days.
Prize types (use ONLY these): ${SPIN_PRIZES.map((p) => p.id).join(', ')}.
"weight" is the relative probability from 1 to 100. Make exactly ONE segment the jackpot: isJackpot true, prizeType "voucher", weight 1 to 3. Use varied six-digit hex colors that look good side by side.
Return a JSON object with this exact shape:
{"segments":[{"label":"25 Coins","emoji":"🪙","color":"#F5B301","prizeType":"coins","prizeValue":"25 PB Coins","weight":25,"isJackpot":false,"description":"One sentence shown to the player when they win it."}]}
Rules: labels at most 14 characters, one emoji per segment, prizes should be potato or fries themed where possible.`;
}

function rushPrompt(opts: RushGenOptions, settings: RushSettings, count: number): string {
  const lanes = Math.max(2, Math.min(5, settings.lanes || 3));
  return `Design exactly ${count} runs for "Potato Rush", an obstacle-runner game with ${lanes} lanes (lane indexes 0 to ${lanes - 1}).
Theme: "${opts.theme}". Difficulty curve: ${curveText(opts.curve)}. Order the runs from easiest to hardest.
${opts.customPrompt ? `Extra directives from the admin: ${opts.customPrompt}\n` : ''}Obstacle types (use ONLY these): ${RUSH_OBSTACLES.map((o) => `${o.id} (${o.action}, danger ${o.danger})`).join(', ')}.
Power-up types (use ONLY these): ${RUSH_POWERUPS.map((p) => p.id).join(', ')}.
Reward: "${settings.rewardText}" when the player finishes a run of at least ${settings.rewardDistanceMeters} m. Set "rewardOnFinish" to that exact text on those runs only, otherwise null.
Return a JSON object with this exact shape:
{"runs":[{"name":"Run name","theme":"${opts.theme}","difficulty":"easy|medium|hard","distanceMeters":800,"baseSpeed":1.2,"speedRampPercent":10,"coinsTotal":90,"obstacles":[{"type":"pothole","lane":1,"atMeters":120}],"powerUps":[{"type":"butter-shield","atMeters":300}],"rewardOnFinish":null,"designerNote":"One sentence on the feel of this run."}]}
Rules: distanceMeters between 600 and 2000, baseSpeed between 1.0 and 2.0, speedRampPercent between 5 and 30, between 6 and 40 obstacles per run sorted by atMeters ascending and at least 40 m apart, never place obstacles in every lane at the same atMeters, easy runs use only danger-1 obstacles, 1 to 4 power-ups per run.`;
}

/* ------------------------------------------------------------------ */
/*  Service                                                            */
/* ------------------------------------------------------------------ */

function requestedCount(opts: GameConfigGenOptions): number {
  switch (opts.kind) {
    case 'crush':
      return clampNum(opts.levelCount, 10, 1, 40);
    case 'spin':
      return clampNum(opts.segmentCount, 8, 2, 16);
    case 'rush':
      return clampNum(opts.runCount, 5, 1, 20);
  }
}

export const aiGameConfigService = {
  /**
   * Live generation through Groq. Throws when the reply is unusable so the caller can fall back.
   */
  async generateContentLive(opts: GameConfigGenOptions, settings: GameConfigSettings, seedKey: string): Promise<GameConfigContent> {
    const count = requestedCount(opts);
    switch (opts.kind) {
      case 'crush': {
        const s = settings as CrushSettings;
        const fallback = synthContent({ ...opts, levelCount: count }, s, seedKey) as CrushContent;
        const data = await groqChatJson<{ levels?: unknown[] }>({
          system: SYSTEM_PROMPT,
          user: crushPrompt(opts, s, count),
          temperature: 0.8,
          maxTokens: Math.min(30000, 1500 + count * 420),
        });
        const raw = Array.isArray(data?.levels) ? data.levels : [];
        if (raw.length < Math.min(count, 3)) throw new Error(`Groq returned ${raw.length} levels, expected ${count}`);
        const levels = fallback.levels.map((fb, i) => (i < raw.length ? normalizeCrushLevel(raw[i], i, s, fb) : fb));
        return { kind: 'crush', settings: s, levels };
      }
      case 'spin': {
        const s = settings as SpinSettings;
        const fallback = synthContent({ ...opts, segmentCount: count }, s, seedKey) as SpinContent;
        const data = await groqChatJson<{ segments?: unknown[] }>({
          system: SYSTEM_PROMPT,
          user: spinPrompt(opts, s, count),
          temperature: 0.8,
          maxTokens: Math.min(12000, 800 + count * 160),
        });
        const raw = Array.isArray(data?.segments) ? data.segments : [];
        if (raw.length < Math.min(count, 3)) throw new Error(`Groq returned ${raw.length} segments, expected ${count}`);
        const segments = fallback.segments.map((fb, i) => (i < raw.length ? normalizeWheelSegment(raw[i], i, fb) : fb));
        return { kind: 'spin', settings: s, segments: ensureSingleJackpot(segments) };
      }
      case 'rush': {
        const s = settings as RushSettings;
        const fallback = synthContent({ ...opts, runCount: count }, s, seedKey) as RushContent;
        const data = await groqChatJson<{ runs?: unknown[] }>({
          system: SYSTEM_PROMPT,
          user: rushPrompt(opts, s, count),
          temperature: 0.8,
          maxTokens: Math.min(30000, 1500 + count * 900),
        });
        const raw = Array.isArray(data?.runs) ? data.runs : [];
        if (raw.length < Math.min(count, 2)) throw new Error(`Groq returned ${raw.length} runs, expected ${count}`);
        const runs = fallback.runs.map((fb, i) => (i < raw.length ? normalizeRushRun(raw[i], i, s, fb) : fb));
        return { kind: 'rush', settings: s, runs };
      }
    }
  },

  /**
   * Generates one configuration. Uses Groq when a key is present, otherwise (or on failure) the offline designer.
   */
  async generateConfig(
    game: Game,
    opts: GameConfigGenOptions,
    settings?: GameConfigSettings,
    onProgress?: ConfigProgress,
    extras?: { title?: string; inRotation?: boolean; poolGroup?: string; seedKey?: string }
  ): Promise<GameConfig> {
    const resolvedSettings = settings || defaultSettingsFor(opts.kind);
    const seedKey = extras?.seedKey || `${game.id}|${JSON.stringify(opts)}|${Date.now()}|${Math.random()}`;
    const labels = CONFIG_LABELS[opts.kind];

    if (hasGroqKey()) {
      try {
        onProgress?.(`Asking Groq to design ${requestedCount(opts)} ${labels.items.toLowerCase()} for "${opts.theme}"...`);
        const content = await this.generateContentLive(opts, resolvedSettings, seedKey);
        return buildGameConfig({
          game,
          opts,
          content,
          generatedBy: 'groq',
          title: extras?.title,
          inRotation: extras?.inRotation,
          poolGroup: extras?.poolGroup,
        });
      } catch (err) {
        console.warn('Groq config generation failed, using offline designer:', err);
        onProgress?.('Groq unavailable for this pack, using the offline designer instead...');
      }
    }

    const content = synthContent(opts, resolvedSettings, seedKey);
    return buildGameConfig({
      game,
      opts,
      content,
      generatedBy: 'offline',
      title: extras?.title,
      inRotation: extras?.inRotation,
      poolGroup: extras?.poolGroup,
    });
  },

  /**
   * Generates several variants of the same brief, sequentially, reporting progress.
   */
  async generateVariants(
    game: Game,
    opts: GameConfigGenOptions,
    variants: number,
    autoRotate: boolean,
    settings?: GameConfigSettings,
    onProgress?: ConfigProgress
  ): Promise<GameConfig[]> {
    const total = clampNum(variants, 1, 1, 10);
    const poolGroup = total > 1 ? `Batch ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` : undefined;
    const results: GameConfig[] = [];
    for (let i = 1; i <= total; i++) {
      onProgress?.(`Generating variant ${i} of ${total}...`, i, total);
      const baseTitle = titleForOptions(opts, requestedCount(opts));
      const config = await this.generateConfig(
        game,
        opts,
        settings,
        (msg) => onProgress?.(`${total > 1 ? `[${i}/${total}] ` : ''}${msg}`, i, total),
        {
          title: total > 1 ? `${baseTitle} · Variant #${i}` : undefined,
          inRotation: autoRotate,
          poolGroup,
          seedKey: `${game.id}|${JSON.stringify(opts)}|${Date.now()}|${i}`,
        }
      );
      results.push(config);
    }
    return results;
  },

  /**
   * Replaces a single level / segment / run while keeping its slot.
   */
  async regenerateItem(content: GameConfigContent, index: number, theme: string, instruction?: string): Promise<ConfigItem> {
    const seedKey = `${content.kind}-regen-${index}-${Date.now()}-${Math.random()}`;
    const rng = mulberry32(hashSeed(seedKey));
    const count = contentItemCount(content);
    const directive = instruction?.trim() ? `Admin instruction for this replacement: ${instruction.trim()}` : 'Make it fresh and fun.';

    switch (content.kind) {
      case 'crush': {
        const current = content.levels[index];
        const fallback = synthCrushLevel(index, count, { curve: 'steady', theme }, content.settings, rng);
        const base: CrushLevel = { ...fallback, id: current.id, difficulty: current.difficulty, rewardOnClear: current.rewardOnClear };
        if (!hasGroqKey()) return base;
        try {
          const data = await groqChatJson<{ level?: unknown }>({
            system: SYSTEM_PROMPT,
            user: `Redesign ONE level of "Potato Crush" (match-3). It is level ${index + 1} of ${count}, difficulty tier "${current.difficulty}", theme "${theme}". Keep the same tier but change the name, objectives, layout and feel. ${directive}
Available tile ids (use ONLY these): ${content.settings.tileSet.map((t) => `"${t.id}"`).join(', ')}. Blockers: ${CRUSH_BLOCKERS.map((b) => b.id).join(', ')}. Boosters: ${CRUSH_BOOSTERS.map((b) => b.id).join(', ')}.
${current.rewardOnClear ? `This level awards "${current.rewardOnClear}" on clear: keep rewardOnClear set to that text.` : 'Set rewardOnClear to null.'}
Return a JSON object: {"level":{"name":"...","difficulty":"${current.difficulty}","gridRows":8,"gridCols":8,"moves":25,"tileIds":["russet","fries","sweet","chip"],"objectives":[{"type":"collect","tileId":"fries","target":30}],"blockers":[],"boostersAllowed":["shuffle"],"starScores":[3000,4500,6600],"rewardOnClear":null,"designerNote":"..."}}`,
            temperature: 0.9,
            maxTokens: 1500,
          });
          const level = normalizeCrushLevel(data?.level, index, content.settings, base);
          return { ...level, difficulty: current.difficulty };
        } catch (e) {
          console.warn('Groq level regeneration failed, using offline designer:', e);
          return base;
        }
      }
      case 'spin': {
        const current = content.segments[index];
        const fallback = synthWheelSegment(index, count, { prizeMix: 'balanced', theme }, content.settings, rng, current.isJackpot ? index : -1);
        const base: WheelSegment = { ...fallback, id: current.id, color: current.color, isJackpot: current.isJackpot };
        if (!hasGroqKey()) return base;
        try {
          const others = content.segments.filter((_, i) => i !== index).map((s) => `${s.label} (${s.prizeType}, weight ${s.weight})`).join('; ');
          const data = await groqChatJson<{ segment?: unknown }>({
            system: SYSTEM_PROMPT,
            user: `Redesign ONE segment of the "Spin the Potato" prize wheel, theme "${theme}". It is segment ${index + 1} of ${count}${current.isJackpot ? ' and it is the JACKPOT (prizeType voucher, weight 1 to 3, isJackpot true)' : ' (isJackpot false)'}. The other segments are: ${others}. Pick a prize that complements them. ${directive}
Prize types (use ONLY these): ${SPIN_PRIZES.map((p) => p.id).join(', ')}. Label at most 14 characters, weight 1 to 100, color as six-digit hex.
Return a JSON object: {"segment":{"label":"...","emoji":"🪙","color":"#F5B301","prizeType":"coins","prizeValue":"...","weight":20,"isJackpot":${current.isJackpot},"description":"..."}}`,
            temperature: 0.9,
            maxTokens: 600,
          });
          const seg = normalizeWheelSegment(data?.segment, index, base);
          return { ...seg, isJackpot: current.isJackpot };
        } catch (e) {
          console.warn('Groq segment regeneration failed, using offline designer:', e);
          return base;
        }
      }
      case 'rush': {
        const current = content.runs[index];
        const fallback = synthRushRun(index, count, { curve: 'steady', theme }, content.settings, rng);
        const base: RushRun = { ...fallback, id: current.id, difficulty: current.difficulty, rewardOnFinish: current.rewardOnFinish };
        if (!hasGroqKey()) return base;
        try {
          const lanes = Math.max(2, Math.min(5, content.settings.lanes || 3));
          const data = await groqChatJson<{ run?: unknown }>({
            system: SYSTEM_PROMPT,
            user: `Redesign ONE run of "Potato Rush" (obstacle runner, ${lanes} lanes, lane indexes 0 to ${lanes - 1}). It is run ${index + 1} of ${count}, difficulty tier "${current.difficulty}", theme "${theme}". Keep the tier but change the name, distance, obstacle pattern and power-ups. ${directive}
Obstacle types (use ONLY these): ${RUSH_OBSTACLES.map((o) => `${o.id} (danger ${o.danger})`).join(', ')}. Power-ups: ${RUSH_POWERUPS.map((p) => p.id).join(', ')}.
${current.rewardOnFinish ? `This run awards "${current.rewardOnFinish}" on finish: keep rewardOnFinish set to that text and distance at least ${content.settings.rewardDistanceMeters}.` : 'Set rewardOnFinish to null.'}
Return a JSON object: {"run":{"name":"...","theme":"${theme}","difficulty":"${current.difficulty}","distanceMeters":800,"baseSpeed":1.2,"speedRampPercent":10,"coinsTotal":90,"obstacles":[{"type":"pothole","lane":1,"atMeters":120}],"powerUps":[{"type":"butter-shield","atMeters":300}],"rewardOnFinish":null,"designerNote":"..."}}
Rules: 6 to 40 obstacles sorted ascending and at least 40 m apart, never all lanes blocked at once.`,
            temperature: 0.9,
            maxTokens: 2500,
          });
          const run = normalizeRushRun(data?.run, index, content.settings, base);
          return { ...run, difficulty: current.difficulty };
        } catch (e) {
          console.warn('Groq run regeneration failed, using offline designer:', e);
          return base;
        }
      }
    }
  },

  /**
   * A new offline-designed item appended at the end (used by the editor's "Add" button).
   */
  createItem(content: GameConfigContent, theme: string): ConfigItem {
    return synthSingleItem(content, contentItemCount(content), theme);
  },
};
