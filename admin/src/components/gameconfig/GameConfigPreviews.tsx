import React, { useMemo, useState } from 'react';
import { CrushLevel, CrushSettings, RushRun, RushSettings, SpinSettings, WheelSegment } from '../../types/gameConfig';
import { CRUSH_BLOCKERS, CRUSH_TILE_CATALOG, RUSH_OBSTACLES, RUSH_POWERUPS } from '../../data/gameConfigCatalog';
import { hashSeed, mulberry32 } from '../../services/gameConfigSynth';
import { Pill } from './ui';

function safeInt(n: number, min: number, max: number, fallback: number): number {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

/* ------------------------------------------------------------------ */
/*  Potato Crush board                                                 */
/* ------------------------------------------------------------------ */

export const CrushLevelPreview: React.FC<{ level: CrushLevel; settings: CrushSettings; compact?: boolean }> = ({
  level,
  settings,
  compact = false,
}) => {
  const rows = safeInt(level.gridRows, 3, 12, 8);
  const cols = safeInt(level.gridCols, 3, 12, 8);
  const catalog = settings.tileSet.length ? settings.tileSet : CRUSH_TILE_CATALOG;

  const cells = useMemo(() => {
    const rng = mulberry32(
      hashSeed(
        `${level.id}|${level.name}|${rows}x${cols}|${level.tileIds.join(',')}|${level.blockers
          .map((b) => b.type + b.count)
          .join(',')}`
      )
    );
    const tiles = catalog.filter((t) => level.tileIds.includes(t.id));
    const pool = tiles.length ? tiles : catalog.slice(0, 4);
    const total = rows * cols;
    const blockerCells = new Map<number, string>();
    level.blockers.forEach((b) => {
      const meta = CRUSH_BLOCKERS.find((x) => x.id === b.type);
      for (let i = 0; i < b.count && blockerCells.size < Math.floor(total * 0.4); i++) {
        let pos = Math.floor(rng() * total);
        let guard = 0;
        while (blockerCells.has(pos) && guard++ < 60) pos = Math.floor(rng() * total);
        blockerCells.set(pos, meta?.emoji || '📦');
      }
    });
    return Array.from({ length: total }, (_, i) => {
      const blocker = blockerCells.get(i);
      if (blocker) return { emoji: blocker, color: '#D6D6D6', blocker: true };
      const t = pool[Math.floor(rng() * pool.length)];
      return { emoji: t.emoji, color: t.color, blocker: false };
    });
  }, [level, catalog, rows, cols]);

  const size = compact ? 20 : 32;
  const tileMeta = (id: string) => catalog.find((t) => t.id === id);

  return (
    <div className="space-y-2">
      <div
        className="inline-grid gap-[3px] p-2 bg-[#F6F6F6] border border-[#E2E2E2]"
        style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}
      >
        {cells.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-center border"
            style={{
              width: size,
              height: size,
              backgroundColor: c.blocker ? '#E5E5E5' : `${c.color}33`,
              borderColor: c.blocker ? '#BDBDBD' : `${c.color}99`,
              fontSize: compact ? 11 : 17,
              lineHeight: 1,
            }}
          >
            {c.emoji}
          </div>
        ))}
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="dark">{level.moves} moves</Pill>
          {level.objectives.map((o, i) => (
            <Pill key={i}>
              {o.type === 'collect'
                ? `Collect ${o.target} ${tileMeta(o.tileId || '')?.emoji || o.tileId}`
                : o.type === 'score'
                ? `Score ${o.target.toLocaleString()}`
                : `Clear ${o.target} blockers`}
            </Pill>
          ))}
          <Pill>⭐ {level.starScores.map((s) => s.toLocaleString()).join(' / ')}</Pill>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Spin the Potato wheel                                              */
/* ------------------------------------------------------------------ */

export const SpinWheelPreview: React.FC<{
  segments: WheelSegment[];
  settings: SpinSettings;
  interactive?: boolean;
  size?: number;
}> = ({ segments, settings, interactive = true, size = 300 }) => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<WheelSegment | null>(null);

  const n = segments.length;
  const slice = n > 0 ? 360 / n : 360;
  const r = size / 2;
  const cx = r;
  const cy = r;
  const totalWeight = segments.reduce((s, x) => s + Math.max(0, x.weight || 0), 0) || 1;
  const duration = Math.max(1, Math.min(15, settings.spinDurationSeconds || 5));
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const arcPath = (i: number) => {
    if (n === 1) {
      return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${(cx - 0.01).toFixed(2)} ${cy - r} Z`;
    }
    const start = toRad(i * slice - 90);
    const end = toRad((i + 1) * slice - 90);
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const large = slice > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
  };

  const spin = () => {
    if (spinning || !n) return;
    let roll = Math.random() * totalWeight;
    let idx = n - 1;
    for (let i = 0; i < n; i++) {
      roll -= Math.max(0, segments[i].weight || 0);
      if (roll <= 0) {
        idx = i;
        break;
      }
    }
    const target = (360 - (idx * slice + slice / 2)) % 360;
    const current = ((rotation % 360) + 360) % 360;
    const delta = (target - current + 360) % 360;
    const next = rotation + 360 * 5 + delta;
    setResult(null);
    setSpinning(true);
    setRotation(next);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(segments[idx]);
    }, duration * 1000);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 text-2xl drop-shadow" aria-hidden>
          🔻
        </div>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? `transform ${duration}s cubic-bezier(0.15, 0.85, 0.25, 1)` : 'none',
          }}
        >
          {segments.map((s, i) => {
            const mid = toRad(i * slice + slice / 2 - 90);
            const lx = cx + r * 0.62 * Math.cos(mid);
            const ly = cy + r * 0.62 * Math.sin(mid);
            const angleDeg = i * slice + slice / 2;
            const odds = ((Math.max(0, s.weight || 0) / totalWeight) * 100).toFixed(0);
            return (
              <g key={s.id}>
                <path d={arcPath(i)} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
                <text
                  x={lx}
                  y={ly}
                  fill="#FFFFFF"
                  fontSize={n > 10 ? 9 : 11}
                  fontWeight={700}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${angleDeg}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.35)', strokeWidth: 2 }}
                >
                  {s.emoji} {s.label}
                </text>
                <text
                  x={lx}
                  y={ly + (n > 10 ? 10 : 13)}
                  fill="#FFFFFF"
                  fontSize={8}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${angleDeg}, ${lx.toFixed(2)}, ${ly.toFixed(2)})`}
                  opacity={0.85}
                >
                  {odds}%
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={r * 0.12} fill="#000000" stroke="#FFFFFF" strokeWidth={3} />
        </svg>
      </div>

      {interactive && (
        <button
          type="button"
          onClick={spin}
          disabled={spinning || !n}
          className="px-5 py-2 bg-black text-white text-xs font-bold hover:bg-[#262626] disabled:opacity-40 transition-all"
        >
          {spinning ? 'Spinning...' : 'Spin the Potato'}
        </button>
      )}

      {result && (
        <div className="text-center text-xs border border-black px-4 py-2 bg-[#FAFAFA]">
          <div className="font-bold text-black">
            {result.emoji} {result.label}
            {result.isJackpot && <span className="ml-2 bg-black text-white px-1.5 py-0.5 text-[9px] uppercase">Jackpot</span>}
          </div>
          <div className="text-[#545454]">{result.prizeValue}</div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Potato Rush track                                                  */
/* ------------------------------------------------------------------ */

export const RushRunPreview: React.FC<{ run: RushRun; settings: RushSettings; compact?: boolean }> = ({
  run,
  settings,
  compact = false,
}) => {
  const lanes = safeInt(settings.lanes, 2, 5, 3);
  const laneH = compact ? 26 : 36;
  const distance = Math.max(100, run.distanceMeters || 100);
  const minWidth = Math.max(480, Math.round(distance * (compact ? 0.4 : 0.7)));
  const ticks: number[] = [];
  for (let m = 0; m <= distance; m += 200) ticks.push(m);
  const pct = (m: number) => `${Math.min(100, Math.max(0, (m / distance) * 100))}%`;

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-[#E2E2E2] bg-[#F6F6F6]">
        <div className="relative" style={{ minWidth, height: lanes * laneH + 46 }}>
          {/* power-up strip */}
          <div className="absolute left-0 right-0 top-0 h-7 border-b border-dashed border-[#D0D0D0]">
            {run.powerUps.map((p, i) => {
              const meta = RUSH_POWERUPS.find((x) => x.id === p.type);
              return (
                <span
                  key={i}
                  className="absolute -translate-x-1/2 top-1 text-base"
                  style={{ left: pct(p.atMeters) }}
                  title={`${meta?.label || p.type} at ${p.atMeters} m`}
                >
                  {meta?.emoji || '✨'}
                </span>
              );
            })}
          </div>

          {/* lanes */}
          {Array.from({ length: lanes }).map((_, l) => (
            <div
              key={l}
              className="absolute left-0 right-0 border-b border-[#E2E2E2]"
              style={{ top: 28 + l * laneH, height: laneH, background: l % 2 ? '#F0F0F0' : '#F8F8F8' }}
            />
          ))}

          {/* obstacles */}
          {run.obstacles.map((o) => {
            const meta = RUSH_OBSTACLES.find((x) => x.id === o.type);
            const lane = Math.min(Math.max(0, o.lane), lanes - 1);
            return (
              <span
                key={o.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: pct(o.atMeters), top: 28 + lane * laneH + laneH / 2, fontSize: compact ? 14 : 18, lineHeight: 1 }}
                title={`${meta?.label || o.type} · ${o.atMeters} m · lane ${lane + 1}`}
              >
                {meta?.emoji || '⚠️'}
              </span>
            );
          })}

          {/* start & finish */}
          <span className="absolute left-1 text-base" style={{ top: 28 + Math.floor(lanes / 2) * laneH + laneH / 2 - 10 }}>
            🥔
          </span>
          <span className="absolute right-1 text-base" style={{ top: 28 + Math.floor(lanes / 2) * laneH + laneH / 2 - 10 }}>
            🏁
          </span>

          {/* distance ticks */}
          {ticks.map((m) => (
            <span
              key={m}
              className="absolute text-[9px] font-mono text-[#6B6B6B] -translate-x-1/2"
              style={{ left: pct(m), bottom: 2 }}
            >
              {m}m
            </span>
          ))}
        </div>
      </div>
      {!compact && (
        <div className="flex flex-wrap gap-1.5">
          <Pill tone="dark">{run.distanceMeters} m</Pill>
          <Pill>speed {run.baseSpeed}x → +{run.speedRampPercent}%</Pill>
          <Pill>{run.obstacles.length} obstacles</Pill>
          <Pill>{run.powerUps.length} power-ups</Pill>
          <Pill>🪙 {run.coinsTotal} coins</Pill>
        </div>
      )}
    </div>
  );
};
