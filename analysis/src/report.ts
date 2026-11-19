import type { RunSummary } from './runs.ts';
import { METRICS, type Metric, type ScenarioSummary } from './scenarios.ts';
import { CRITERIA, type Crossing } from './thresholds.ts';

const round = (value: number, digits = 1) =>
  Number.isFinite(value) ? String(+value.toFixed(digits)) : '';

/** One row per run with every per-run statistic. */
export function runsCsv(runs: readonly RunSummary[]): string {
  const columns = Object.keys(runs[0] ?? {}) as (keyof RunSummary)[];
  const rows = runs.map((run) => columns.map((c) => (typeof run[c] === 'number' ? round(run[c] as number, 3) : run[c])).join(','));
  return `${columns.join(',')}\n${rows.join('\n')}\n`;
}

/** One row per scenario with the median, minimum, and maximum of every metric. */
export function scenariosCsv(scenarios: readonly ScenarioSummary[]): string {
  const header = ['renderer', 'vehicles', 'intervalMs', 'runs', ...METRICS.flatMap((m) => [`${m}_median`, `${m}_min`, `${m}_max`])];
  const rows = scenarios.map((s) =>
    [
      s.renderer,
      s.vehicles,
      s.intervalMs,
      s.runs,
      ...METRICS.flatMap((m) => [round(s.metrics[m].median, 3), round(s.metrics[m].min, 3), round(s.metrics[m].max, 3)]),
    ].join(','),
  );
  return `${header.join(',')}\n${rows.join('\n')}\n`;
}

const RENDERER_LABEL: Record<string, string> = { dom: 'DOM', canvas: 'Canvas', webgl: 'WebGL' };

const cell = (s: ScenarioSummary | undefined, metric: Metric, digits: number, scale = 1) => {
  if (!s) return '–';
  const m = s.metrics[metric];
  if (!Number.isFinite(m.median)) return '–';
  const v = (x: number) => (x * scale).toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return m.n > 1 && m.max > m.min ? `${v(m.median)} (${v(m.min)}–${v(m.max)})` : v(m.median);
};

/** A markdown table of one metric: rows are fleet sizes, columns renderer × interval. */
export function metricTable(
  scenarios: readonly ScenarioSummary[],
  metric: Metric,
  title: string,
  digits = 1,
  scale = 1,
): string {
  const fleets = [...new Set(scenarios.map((s) => s.vehicles))].sort((a, b) => a - b);
  const intervals = [...new Set(scenarios.map((s) => s.intervalMs))].sort((a, b) => a - b);
  const renderers = ['dom', 'canvas', 'webgl'].filter((r) => scenarios.some((s) => s.renderer === r));
  const columns = intervals.flatMap((i) => renderers.map((r) => ({ r, i })));
  const lines = [
    `**${title}** Median over repetitions, with the smallest and largest repetition in parentheses.`,
    '',
    `| Fleet size | ${columns.map((c) => `${RENDERER_LABEL[c.r] ?? c.r}, ${c.i / 1000} s`).join(' | ')} |`,
    `| --- | ${columns.map(() => '---').join(' | ')} |`,
    ...fleets.map(
      (f) =>
        `| ${f.toLocaleString('en-US')} | ${columns
          .map((c) => cell(scenarios.find((s) => s.renderer === c.r && s.intervalMs === c.i && s.vehicles === f), metric, digits, scale))
          .join(' | ')} |`,
    ),
  ];
  return lines.join('\n');
}

export function crossingsTable(crossings: readonly Crossing[]): string {
  const fmt = (v: number | null) => (v === null ? '–' : v.toLocaleString('en-US'));
  return [
    '| Renderer | Interval | Criterion | Meets up to | First failure | Note |',
    '| --- | --- | --- | --- | --- | --- |',
    ...crossings.map((c) => {
      const label = CRITERIA.find((k) => k.id === c.criterion)!.label;
      const meets = c.meetsUpTo === null ? 'fails at smallest size' : fmt(c.meetsUpTo);
      return `| ${RENDERER_LABEL[c.renderer] ?? c.renderer} | ${c.intervalMs / 1000} s | ${label} | ${meets} | ${fmt(c.firstFailure)} | ${c.nonMonotonic ? 'meets again at a larger size' : ''} |`;
    }),
  ].join('\n');
}

/** Runs that need attention before their results are used. */
export function qualityReport(runs: readonly RunSummary[]): string {
  const issues = runs.flatMap((run) => {
    const name = `${run.renderer}-${run.vehicles}v-${run.intervalMs}ms-r${run.repetition}`;
    const found: string[] = [];
    if (run.errors > 0) found.push(`${run.errors} page error(s)`);
    if (run.updateShare < 0.98) found.push(`only ${(run.updateShare * 100).toFixed(1)}% of expected updates`);
    if (run.skippedMemorySamples > 1) found.push(`${run.skippedMemorySamples} memory samples skipped`);
    return found.length > 0 ? [`- ${name}: ${found.join('; ')}`] : [];
  });
  const shares = runs.map((r) => r.updateShare).filter(Number.isFinite);
  return [
    `Runs: ${runs.length}. Page errors: ${runs.reduce((n, r) => n + r.errors, 0)}. Share of expected updates received: ${(Math.min(...shares) * 100).toFixed(1)}–${(Math.max(...shares) * 100).toFixed(1)}%.`,
    '',
    issues.length > 0 ? 'Runs to check (errors, under 98% of expected updates, or more than one skipped memory sample):\n' + issues.join('\n') : 'No run has page errors, under 98% of expected updates, or more than one skipped memory sample.',
  ].join('\n');
}

/** Compares two sets of the same scenarios, for example DOM headless against DOM in a visible window. */
export function comparisonTable(
  base: readonly ScenarioSummary[],
  other: readonly ScenarioSummary[],
  labels: [string, string],
): string {
  const rows: string[] = [];
  const metrics: [Metric, string, number][] = [
    ['frameP95', 'Frame time p95 (ms)', 1],
    ['lateFrameShare', 'Late frames (%)', 1],
    ['sendToPaintMedian', 'Send-to-paint median (ms)', 0],
    ['sendToPaintP95', 'Send-to-paint p95 (ms)', 0],
    ['interactionP95', 'Interaction p95 (ms)', 0],
    ['memoryMedianMiB', 'Process memory median (MiB)', 0],
    ['updateShare', 'Updates received (%)', 1],
  ];
  for (const o of [...other].sort((a, b) => a.intervalMs - b.intervalMs || a.vehicles - b.vehicles)) {
    const b = base.find((s) => s.renderer === o.renderer && s.vehicles === o.vehicles && s.intervalMs === o.intervalMs);
    for (const [metric, label, digits] of metrics) {
      const scale = metric === 'lateFrameShare' || metric === 'updateShare' ? 100 : 1;
      rows.push(
        `| ${RENDERER_LABEL[o.renderer] ?? o.renderer} | ${o.vehicles.toLocaleString('en-US')} | ${o.intervalMs / 1000} s | ${label} | ${cell(b, metric, digits, scale)} | ${cell(o, metric, digits, scale)} |`,
      );
    }
  }
  return [
    `| Renderer | Fleet size | Interval | Metric | ${labels[0]} | ${labels[1]} |`,
    '| --- | --- | --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}
