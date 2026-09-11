"use client";

import { useCallback, useMemo, useState } from "react";
import { TileCell, GoalPotatoIcon } from "@/components/tater-match/TileCell";
import {
  COLS,
  GOAL_TILE,
  ROWS,
  START_GOAL,
  START_MOVES,
  TILE_KINDS,
  type LevelResult,
  type TileKind,
} from "@/components/tater-match/taterMatchTypes";

type Props = {
  level: number;
  onBack: () => void;
  onComplete: (result: LevelResult) => void;
};

type Cell = TileKind | null;

function randKind(exclude?: TileKind): TileKind {
  const pool = exclude ? TILE_KINDS.filter((k) => k !== exclude) : TILE_KINDS;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

function createBoard(): Cell[] {
  const board: Cell[] = Array(COLS * ROWS).fill(null);
  for (let i = 0; i < board.length; i++) {
    let kind = randKind();
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    // Avoid starting with ready-made matches
    for (let guard = 0; guard < 8; guard++) {
      const left1 = col >= 1 ? board[i - 1] : null;
      const left2 = col >= 2 ? board[i - 2] : null;
      const up1 = row >= 1 ? board[i - COLS] : null;
      const up2 = row >= 2 ? board[i - COLS * 2] : null;
      if (
        (left1 && left1 === left2 && left1 === kind) ||
        (up1 && up1 === up2 && up1 === kind)
      ) {
        kind = randKind(kind);
        continue;
      }
      break;
    }
    board[i] = kind;
  }
  return board;
}

function findMatches(board: Cell[]): Set<number> {
  const matched = new Set<number>();

  for (let r = 0; r < ROWS; r++) {
    let run = 1;
    for (let c = 1; c <= COLS; c++) {
      const idx = r * COLS + c;
      const prev = board[r * COLS + c - 1];
      const cur = c < COLS ? board[idx] : null;
      if (c < COLS && cur && prev && cur === prev) {
        run += 1;
      } else {
        if (run >= 3 && prev) {
          for (let k = 0; k < run; k++) matched.add(r * COLS + c - 1 - k);
        }
        run = 1;
      }
    }
  }

  for (let c = 0; c < COLS; c++) {
    let run = 1;
    for (let r = 1; r <= ROWS; r++) {
      const idx = r * COLS + c;
      const prev = board[(r - 1) * COLS + c];
      const cur = r < ROWS ? board[idx] : null;
      if (r < ROWS && cur && prev && cur === prev) {
        run += 1;
      } else {
        if (run >= 3 && prev) {
          for (let k = 0; k < run; k++) matched.add((r - 1 - k) * COLS + c);
        }
        run = 1;
      }
    }
  }

  return matched;
}

function collapse(board: Cell[]): Cell[] {
  const next = [...board];
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const idx = r * COLS + c;
      if (next[idx]) {
        next[write * COLS + c] = next[idx];
        if (write !== r) next[idx] = null;
        write -= 1;
      }
    }
    for (let r = write; r >= 0; r--) {
      next[r * COLS + c] = randKind();
    }
  }
  return next;
}

function areAdjacent(a: number, b: number) {
  const ar = Math.floor(a / COLS);
  const ac = a % COLS;
  const br = Math.floor(b / COLS);
  const bc = b % COLS;
  return Math.abs(ar - br) + Math.abs(ac - bc) === 1;
}

function starProgress(score: number, goalLeft: number, moves: number) {
  if (goalLeft > 0) return Math.min(0.85, score / 12000);
  const leftover = moves / START_MOVES;
  return Math.min(1, 0.55 + leftover * 0.45);
}

function computeStars(score: number, movesLeft: number, goalMet: boolean) {
  if (!goalMet) return 1;
  if (score >= 10000 || movesLeft >= 8) return 3;
  if (score >= 6000 || movesLeft >= 3) return 2;
  return 1;
}

export function TaterMatchPlay({ level, onBack, onComplete }: Props) {
  const [board, setBoard] = useState<Cell[]>(() => createBoard());
  const [selected, setSelected] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [moves, setMoves] = useState(START_MOVES);
  const [goalLeft, setGoalLeft] = useState(START_GOAL);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [boosts, setBoosts] = useState({ shuffle: 3, bomb: 2, moves: 1 });

  const progress = useMemo(
    () => starProgress(score, goalLeft, moves),
    [score, goalLeft, moves],
  );

  const finishIfNeeded = useCallback(
    (nextGoal: number, nextMoves: number, nextScore: number) => {
      if (nextGoal <= 0) {
        const movesBonus = Math.max(0, nextMoves) * 100;
        const pbPoints = 100 + Math.floor(nextScore / 100) + Math.floor(movesBonus / 50);
        onComplete({
          level,
          score: nextScore,
          movesBonus,
          pbPoints,
          stars: computeStars(nextScore, nextMoves, true),
        });
        return true;
      }
      if (nextMoves <= 0) {
        onComplete({
          level,
          score: nextScore,
          movesBonus: 0,
          pbPoints: Math.max(20, Math.floor(nextScore / 120)),
          stars: computeStars(nextScore, 0, false),
        });
        return true;
      }
      return false;
    },
    [level, onComplete],
  );

  const resolveBoard = useCallback(
    async (startBoard: Cell[], startScore: number, startGoal: number) => {
      let current = startBoard;
      let nextScore = startScore;
      let nextGoal = startGoal;
      let guard = 0;

      while (guard < 12) {
        guard += 1;
        const hits = findMatches(current);
        if (hits.size === 0) break;

        setMatched(hits);
        await new Promise((r) => setTimeout(r, 220));

        let potatoHits = 0;
        hits.forEach((idx) => {
          if (current[idx] === GOAL_TILE) potatoHits += 1;
        });
        nextScore += hits.size * 120 + Math.max(0, hits.size - 3) * 80;
        nextGoal = Math.max(0, nextGoal - potatoHits);

        const cleared = current.map((cell, i) => (hits.has(i) ? null : cell));
        current = collapse(cleared);
        setBoard(current);
        setScore(nextScore);
        setGoalLeft(nextGoal);
        setMatched(new Set());
        await new Promise((r) => setTimeout(r, 120));
      }

      return { board: current, score: nextScore, goalLeft: nextGoal };
    },
    [],
  );

  const trySwap = async (a: number, b: number) => {
    if (busy || moves <= 0) return;
    setBusy(true);
    setSelected(null);

    const swapped = [...board];
    const tmp = swapped[a];
    swapped[a] = swapped[b];
    swapped[b] = tmp;
    setBoard(swapped);

    const hits = findMatches(swapped);
    if (hits.size === 0) {
      await new Promise((r) => setTimeout(r, 180));
      setBoard(board);
      setBusy(false);
      return;
    }

    const nextMoves = moves - 1;
    setMoves(nextMoves);
    const resolved = await resolveBoard(swapped, score, goalLeft);
    setBusy(false);
    finishIfNeeded(resolved.goalLeft, nextMoves, resolved.score);
  };

  const onTileClick = (index: number) => {
    if (busy) return;
    if (selected === null) {
      setSelected(index);
      return;
    }
    if (selected === index) {
      setSelected(null);
      return;
    }
    if (areAdjacent(selected, index)) {
      void trySwap(selected, index);
      return;
    }
    setSelected(index);
  };

  const useShuffle = () => {
    if (busy || boosts.shuffle <= 0) return;
    setBoosts((b) => ({ ...b, shuffle: b.shuffle - 1 }));
    setSelected(null);
    setBoard(createBoard());
  };

  const useBomb = async () => {
    if (busy || boosts.bomb <= 0) return;
    setBusy(true);
    setBoosts((b) => ({ ...b, bomb: b.bomb - 1 }));
    setSelected(null);

    const center = Math.floor(Math.random() * board.length);
    const cr = Math.floor(center / COLS);
    const cc = center % COLS;
    const blast = new Set<number>();
    for (let r = cr - 1; r <= cr + 1; r++) {
      for (let c = cc - 1; c <= cc + 1; c++) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) blast.add(r * COLS + c);
      }
    }

    setMatched(blast);
    await new Promise((r) => setTimeout(r, 200));

    let potatoHits = 0;
    blast.forEach((idx) => {
      if (board[idx] === GOAL_TILE) potatoHits += 1;
    });
    const nextScore = score + blast.size * 150;
    const nextGoal = Math.max(0, goalLeft - potatoHits);
    const cleared = board.map((cell, i) => (blast.has(i) ? null : cell));
    const nextBoard = collapse(cleared);
    setBoard(nextBoard);
    setScore(nextScore);
    setGoalLeft(nextGoal);
    setMatched(new Set());

    const resolved = await resolveBoard(nextBoard, nextScore, nextGoal);
    setBusy(false);
    finishIfNeeded(resolved.goalLeft, moves, resolved.score);
  };

  const useExtraMoves = () => {
    if (boosts.moves <= 0) return;
    setBoosts((b) => ({ ...b, moves: b.moves - 1 }));
    setMoves((m) => m + 5);
  };

  return (
    <div className="relative mx-auto flex h-dvh w-full max-w-screen-sm flex-col overflow-hidden bg-[#F4F8FF]">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 90% 55% at 50% 0%, #D9ECFF 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 100% 80%, #FFF4CC 0%, transparent 50%)",
        }}
      />

      <div
        className="relative z-10 flex min-h-0 flex-1 flex-col px-3.5"
        style={{
          paddingTop: "max(2.5rem, calc(var(--header-top) + 0.15rem))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#1E3A8A] shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 className="font-display text-lg font-extrabold text-[#1E3A8A]">
            Level {level}
          </h1>
          <button
            type="button"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#64748B] shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="12" cy="12" r="3" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
            </svg>
          </button>
        </header>

        <div className="rounded-[1.25rem] bg-white/95 p-3 shadow-[0_6px_18px_rgba(30,58,138,0.08)]">
          <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-[#334155] sm:text-[13px]">
            <span>
              Moves: <span className="text-[#1E3A8A]">{moves}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              Goal: <GoalPotatoIcon className="h-4 w-4" />
              <span className="text-[#1E3A8A]">{goalLeft}</span>
            </span>
            <span>
              Score:{" "}
              <span className="tabular-nums text-[#1E3A8A]">
                {score.toLocaleString("en-IN")}
              </span>
            </span>
          </div>

          <div className="relative mt-2.5 h-2.5 overflow-visible rounded-full bg-[#E8F0FB]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#5BA8F0] to-[#2F7FD1] transition-[width] duration-300"
              style={{ width: `${Math.max(6, progress * 100)}%` }}
            />
            {[0.33, 0.66, 1].map((mark, i) => (
              <span
                key={mark}
                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-[11px] ${
                  progress >= mark ? "opacity-100" : "opacity-40 grayscale"
                }`}
                style={{ left: `${mark * 100}%` }}
                aria-hidden
              >
                {i === 2 ? "⭐" : "⭐"}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1">
          <div className="mx-auto grid h-full max-h-[28rem] w-full max-w-[22rem] grid-cols-5 gap-1.5 rounded-[1.35rem] bg-gradient-to-b from-[#BFDFFF] to-[#9ECCF5] p-2.5 shadow-[inset_0_2px_8px_rgba(255,255,255,0.45),0_10px_24px_rgba(47,127,209,0.2)] sm:gap-2 sm:p-3">
            {board.map((kind, index) => (
              <button
                key={index}
                type="button"
                disabled={busy || !kind}
                onClick={() => onTileClick(index)}
                className="aspect-square rounded-[0.75rem] bg-white/35 p-[3px] active:scale-[0.96] disabled:opacity-70"
              >
                {kind ? (
                  <TileCell
                    kind={kind}
                    selected={selected === index}
                    matched={matched.has(index)}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-5 pb-1">
          <BoostButton
            label="Shuffle"
            count={boosts.shuffle}
            onClick={useShuffle}
            icon="🔀"
            color="#7C3AED"
          />
          <BoostButton
            label="Bomb"
            count={boosts.bomb}
            onClick={() => void useBomb()}
            icon="💣"
            color="#1F2937"
          />
          <BoostButton
            label="+5 Moves"
            count={boosts.moves}
            onClick={useExtraMoves}
            icon="➕"
            color="#16A34A"
          />
        </div>
      </div>
    </div>
  );
}

function BoostButton({
  label,
  count,
  onClick,
  icon,
  color,
}: {
  label: string;
  count: number;
  onClick: () => void;
  icon: string;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={count <= 0}
      className="relative flex h-14 w-14 flex-col items-center justify-center rounded-full bg-white shadow-[0_6px_14px_rgba(15,40,80,0.12)] active:scale-[0.96] disabled:opacity-40"
      aria-label={label}
    >
      <span className="text-xl" aria-hidden>
        {icon}
      </span>
      <span
        className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-extrabold text-white"
        style={{ backgroundColor: color }}
      >
        {count}
      </span>
    </button>
  );
}
