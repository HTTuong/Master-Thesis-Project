import type { RunSummary } from './runs.ts';
import { spread, type Spread } from './stats.ts';

/** The per-run statistics that are aggregated over the repetitions of a scenario. */
export const METRICS = [
  'frameMedian',
  'frameP95',
  'lateFrameShare',
  'sendToPaintMedian',
  'sendToPaintP95',
  'dispatchToPaintMedian',
  'interactionMedian',
  'interactionP95',
  'clickP95',
  'wheelP95',
  'dragP95',
  'memoryMedianMiB',
  'rendererMemoryMedianMiB',
  'gpuMemoryMedianMiB',
  'heapMedianMiB',
  'updateShare',
] as const satisfies readonly (keyof RunSummary)[];

export type Metric = (typeof METRICS)[number];

export interface ScenarioSummary {
  renderer: string;
  vehicles: number;
  intervalMs: number;
  runs: number;
  metrics: Record<Metric, Spread>;
}

const key = (r: { renderer: string; vehicles: number; intervalMs: number }) =>
  `${r.renderer}|${r.vehicles}|${r.intervalMs}`;

/**
 * Groups runs by renderer, fleet size, and interval. For every metric, the scenario value is
 * the median of the per-run values over the repetitions, reported with their minimum and maximum.
 */
export function summarizeScenarios(runs: readonly RunSummary[]): ScenarioSummary[] {
  const groups = new Map<string, RunSummary[]>();
  for (const run of runs) groups.set(key(run), [...(groups.get(key(run)) ?? []), run]);

  const result: ScenarioSummary[] = [];
  for (const group of groups.values()) {
    const first = group[0]!;
    const metrics = Object.fromEntries(
      METRICS.map((metric) => [metric, spread(group.map((run) => run[metric]))]),
    ) as Record<Metric, Spread>;
    result.push({
      renderer: first.renderer,
      vehicles: first.vehicles,
      intervalMs: first.intervalMs,
      runs: group.length,
      metrics,
    });
  }
  return result.sort(
    (a, b) => a.renderer.localeCompare(b.renderer) || a.intervalMs - b.intervalMs || a.vehicles - b.vehicles,
  );
}
