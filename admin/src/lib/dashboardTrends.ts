const DAY_MS = 86_400_000;

/** Daily series for a sparkline plus the change against the previous window of the same length. */
export type Trend = {
  series: number[];
  /** Percent change vs the previous window; null when the previous window was empty but this one is not. */
  change: number | null;
};

type Timestamp = string | Date | null | undefined;

function toTime(value: Timestamp): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function windowBounds(days: number, now: number) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const end = today.getTime() + DAY_MS;
  return { start: end - days * DAY_MS, prevStart: end - 2 * days * DAY_MS, end };
}

function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

/** Events per day over the last `days` days, compared with the window before it. */
export function activityTrend(timestamps: Timestamp[], days: number, now = Date.now()): Trend {
  const { start, prevStart, end } = windowBounds(days, now);
  const daily = new Array<number>(days).fill(0);
  let previous = 0;

  timestamps.forEach((value) => {
    const time = toTime(value);
    if (time === null || time < prevStart || time >= end) return;
    if (time < start) previous += 1;
    else daily[Math.floor((time - start) / DAY_MS)] += 1;
  });

  const current = daily.reduce((sum, count) => sum + count, 0);
  return { series: daily, change: percentChange(current, previous) };
}

/**
 * Running total of created items at the end of each day, compared with the total when the window opened.
 * Items without a usable date count as already existing.
 */
export function growthTrend(createdAt: Timestamp[], days: number, now = Date.now()): Trend {
  const { start, end } = windowBounds(days, now);
  let before = 0;
  const daily = new Array<number>(days).fill(0);
  createdAt.forEach((value) => {
    const time = toTime(value);
    if (time === null || time < start) before += 1;
    else if (time < end) daily[Math.floor((time - start) / DAY_MS)] += 1;
  });

  let running = before;
  const series = daily.map((added) => (running += added));
  return { series, change: percentChange(running, before) };
}
