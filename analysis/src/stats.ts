import { median } from '../../bench/src/stats.ts';

export { median };

/**
 * Nearest-rank quantile: the smallest value with at least q of the values at or below it.
 * NaN for an empty list. For q = 0.95 and 100 values this is the 95th value in sorted order.
 */
export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(q * sorted.length));
  return sorted[rank - 1]!;
}

/** Share of values above a limit; NaN for an empty list. */
export function shareAbove(values: readonly number[], limit: number): number {
  if (values.length === 0) return Number.NaN;
  return values.filter((value) => value > limit).length / values.length;
}

export interface Spread {
  median: number;
  min: number;
  max: number;
  n: number;
}

/** Median, minimum, and maximum of per-run values, ignoring runs where the value is missing. */
export function spread(values: readonly number[]): Spread {
  const present = values.filter((value) => Number.isFinite(value));
  if (present.length === 0) return { median: Number.NaN, min: Number.NaN, max: Number.NaN, n: 0 };
  return {
    median: median(present),
    min: Math.min(...present),
    max: Math.max(...present),
    n: present.length,
  };
}
