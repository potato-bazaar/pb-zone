import {
  ConfigItem,
  CrushContent,
  CrushLevel,
  CrushObjective,
  GameConfigContent,
  RushRun,
  WheelSegment,
} from '../../types/gameConfig';
import { CRUSH_TILE_CATALOG } from '../../data/gameConfigCatalog';

export interface ItemSummary {
  title: string;
  badge: string;
  chips: string[];
  emoji: string;
}

export function objectiveLabel(o: CrushObjective, content: CrushContent): string {
  if (o.type === 'collect') {
    const tile =
      content.settings.tileSet.find((t) => t.id === o.tileId) || CRUSH_TILE_CATALOG.find((t) => t.id === o.tileId);
    return `Collect ${o.target} ${tile ? tile.emoji : o.tileId || 'tiles'}`;
  }
  if (o.type === 'score') return `Score ${o.target.toLocaleString()}`;
  return `Clear ${o.target} blockers`;
}

export function summarizeItem(content: GameConfigContent, item: ConfigItem): ItemSummary {
  switch (content.kind) {
    case 'crush': {
      const l = item as CrushLevel;
      const blockerCount = l.blockers.reduce((s, b) => s + b.count, 0);
      return {
        title: l.name,
        badge: l.difficulty,
        emoji: '🧩',
        chips: [
          `${l.gridRows}×${l.gridCols} grid`,
          `${l.moves} moves`,
          ...l.objectives.map((o) => objectiveLabel(o, content)),
          ...(blockerCount ? [`${blockerCount} blockers`] : []),
          ...(l.rewardOnClear ? [`🎁 ${l.rewardOnClear}`] : []),
        ],
      };
    }
    case 'spin': {
      const s = item as WheelSegment;
      const total = content.segments.reduce((sum, x) => sum + Math.max(0, x.weight), 0) || 1;
      const odds = ((Math.max(0, s.weight) / total) * 100).toFixed(1);
      return {
        title: s.label,
        badge: s.isJackpot ? 'jackpot' : s.prizeType,
        emoji: s.emoji,
        chips: [s.prizeValue, `weight ${s.weight}`, `${odds}% odds`],
      };
    }
    case 'rush': {
      const r = item as RushRun;
      return {
        title: r.name,
        badge: r.difficulty,
        emoji: '⚡',
        chips: [
          `${r.distanceMeters} m`,
          `${r.obstacles.length} obstacles`,
          `${r.powerUps.length} power-ups`,
          `${r.coinsTotal} coins`,
          `speed ${r.baseSpeed}x`,
          ...(r.rewardOnFinish ? [`🎁 ${r.rewardOnFinish}`] : []),
        ],
      };
    }
  }
}

export function summarizeSettings(content: GameConfigContent): { label: string; value: string }[] {
  switch (content.kind) {
    case 'crush': {
      const s = content.settings;
      return [
        { label: 'Tile set', value: s.tileSet.map((t) => t.emoji).join(' ') || 'none' },
        { label: 'Lives per day', value: `${s.livesPerDay} (refill every ${s.lifeRefillMinutes} min)` },
        { label: 'Default grid', value: `${s.defaultGridRows} × ${s.defaultGridCols}` },
        { label: 'Scoring', value: `${s.scorePerTile} per tile, combo ${s.comboMultiplier}x` },
        { label: 'Reward', value: `${s.rewardText} every ${s.rewardLevelInterval} levels` },
      ];
    }
    case 'spin': {
      const s = content.settings;
      return [
        { label: 'Wheel name', value: s.wheelName },
        { label: 'Spins per day', value: `${s.spinsPerDay} (cooldown ${s.cooldownMinutes} min)` },
        { label: 'Spin duration', value: `${s.spinDurationSeconds} s` },
        { label: 'Login required', value: s.requireLogin ? 'Yes' : 'No' },
        { label: 'Jackpot cap', value: `${s.jackpotCapPerDay} per day` },
        { label: 'Voucher validity', value: `${s.voucherValidityDays} days` },
      ];
    }
    case 'rush': {
      const s = content.settings;
      return [
        { label: 'Lanes', value: `${s.lanes}` },
        { label: 'Lives per run', value: `${s.livesPerRun}` },
        { label: 'Coin value', value: `${s.coinValue} pt each, ${s.scorePerMeter} pt per meter` },
        { label: 'Jump / slide', value: `${s.jumpDurationMs} ms / ${s.slideDurationMs} ms` },
        { label: 'Reward', value: `${s.rewardText} at ${s.rewardDistanceMeters} m` },
      ];
    }
  }
}

export function describeContent(content: GameConfigContent): string {
  switch (content.kind) {
    case 'crush': {
      const first = content.levels[0]?.difficulty;
      const last = content.levels[content.levels.length - 1]?.difficulty;
      return `${content.levels.length} levels${first && last ? `, ${first} to ${last}` : ''}`;
    }
    case 'spin': {
      const total = content.segments.reduce((s, x) => s + Math.max(0, x.weight), 0) || 1;
      const empty = content.segments.filter((s) => s.prizeType === 'nothing').reduce((s, x) => s + Math.max(0, x.weight), 0);
      return `${content.segments.length} segments, ${Math.round(((total - empty) / total) * 100)}% win chance`;
    }
    case 'rush': {
      const dist = content.runs.reduce((s, r) => s + r.distanceMeters, 0);
      return `${content.runs.length} runs, ${dist.toLocaleString()} m total`;
    }
  }
}
