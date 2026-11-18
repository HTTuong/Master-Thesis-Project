import type { Metric, ScenarioSummary } from './scenarios.ts';

/**
 * The criteria of Section 3.7, applied to the scenario value (the median over repetitions).
 * Frame budget: 95% of frames within one 60 Hz refresh interval (web.dev, 2020), which, because
 * frame times come in whole refresh intervals, means a 95th percentile below 25 ms.
 * Response limits: 0.1 s and 1 s (Nielsen, 1993), applied to the 95th percentile.
 */
export const CRITERIA = [
  { id: 'frames', label: 'Frame budget: p95 frame time < 25 ms', metric: 'frameP95', limit: 25 },
  { id: 'interaction-0.1s', label: 'Interaction p95 <= 100 ms', metric: 'interactionP95', limit: 100 },
  { id: 'interaction-1s', label: 'Interaction p95 <= 1,000 ms', metric: 'interactionP95', limit: 1000 },
  { id: 'update-1s', label: 'Send-to-paint latency p95 <= 1,000 ms', metric: 'sendToPaintP95', limit: 1000 },
] as const satisfies readonly { id: string; label: string; metric: Metric; limit: number }[];

export type Criterion = (typeof CRITERIA)[number];

const meets = (value: number, criterion: Criterion) =>
  criterion.id === 'frames' ? value < criterion.limit : value <= criterion.limit;

export interface Crossing {
  renderer: string;
  intervalMs: number;
  criterion: Criterion['id'];
  /** Largest tested fleet size up to which every tested size meets the criterion; null if the smallest fails. */
  meetsUpTo: number | null;
  /** Smallest tested fleet size that fails; null if none fails. */
  firstFailure: number | null;
  /** True when a larger fleet meets the criterion again after a failure, which needs a closer look. */
  nonMonotonic: boolean;
}

/** For each renderer, interval, and criterion, finds where the renderer stops meeting the criterion. */
export function findCrossings(scenarios: readonly ScenarioSummary[]): Crossing[] {
  const crossings: Crossing[] = [];
  const pairs = new Set(scenarios.map((s) => `${s.renderer}|${s.intervalMs}`));
  for (const pair of [...pairs].sort()) {
    const [renderer, interval] = pair.split('|');
    const series = scenarios
      .filter((s) => s.renderer === renderer && s.intervalMs === Number(interval))
      .sort((a, b) => a.vehicles - b.vehicles);
    for (const criterion of CRITERIA) {
      const passes = series.map((s) => meets(s.metrics[criterion.metric].median, criterion));
      const failIndex = passes.indexOf(false);
      crossings.push({
        renderer: renderer!,
        intervalMs: Number(interval),
        criterion: criterion.id,
        meetsUpTo: failIndex === 0 ? null : series[(failIndex === -1 ? series.length : failIndex) - 1]!.vehicles,
        firstFailure: failIndex === -1 ? null : series[failIndex]!.vehicles,
        nonMonotonic: failIndex !== -1 && passes.slice(failIndex).some(Boolean),
      });
    }
  }
  return crossings;
}
