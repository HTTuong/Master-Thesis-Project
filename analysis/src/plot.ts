import type { Metric, ScenarioSummary } from './scenarios.ts';

/**
 * Categorical slots 1-3 of the validated reference palette (light mode, all pairs pass the
 * colorblind checks). The third slot is below 3:1 contrast on white, so every series also has
 * its own marker shape and a direct label, and the same values are given in tables.
 */
export const RENDERERS = [
  { id: 'dom', label: 'DOM', color: '#2a78d6', marker: 'circle' },
  { id: 'canvas', label: 'Canvas', color: '#eb6834', marker: 'square' },
  { id: 'webgl', label: 'WebGL', color: '#1baf7a', marker: 'triangle' },
] as const;

const INK = '#0b0b0b';
const INK_SECONDARY = '#52514e';
const GRID = '#e4e3df';
const THRESHOLD = '#8a8984';

export interface PlotOptions {
  metric: Metric;
  title: string;
  yLabel: string;
  scale: 'linear' | 'log';
  threshold?: { value: number; label: string };
}

const PANEL = { width: 360, height: 260, left: 64, right: 72, top: 36, bottom: 48 };

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const fmt = (value: number) =>
  value >= 1000 ? value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : String(+value.toPrecision(3));

function niceLinearTicks(max: number): number[] {
  const step = 10 ** Math.floor(Math.log10(max / 4));
  const multiple = [1, 2, 5, 10].find((m) => max / (m * step) <= 5)!;
  const size = multiple * step;
  const ticks: number[] = [];
  for (let t = 0; t <= max + size / 2; t += size) ticks.push(+t.toPrecision(6));
  return ticks;
}

function logTicks(min: number, max: number): number[] {
  const ticks: number[] = [];
  for (let e = Math.floor(Math.log10(min)); e <= Math.ceil(Math.log10(max)); e++) ticks.push(10 ** e);
  return ticks;
}

function marker(shape: string, x: number, y: number, color: string): string {
  const ring = `stroke="#ffffff" stroke-width="2"`;
  if (shape === 'square') return `<rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" fill="${color}" ${ring}/>`;
  if (shape === 'triangle')
    return `<path d="M${x},${y - 5.5} L${x + 5.5},${y + 4.5} L${x - 5.5},${y + 4.5} Z" fill="${color}" ${ring}/>`;
  return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" ${ring}/>`;
}

/**
 * One chart per update interval, side by side, with a shared y axis: the metric against fleet
 * size (log scale), one line per renderer through the medians over repetitions, and vertical
 * bars from the smallest to the largest repetition.
 */
export function plotMetric(scenarios: readonly ScenarioSummary[], options: PlotOptions): string {
  const intervals = [...new Set(scenarios.map((s) => s.intervalMs))].sort((a, b) => a - b);
  const fleets = [...new Set(scenarios.map((s) => s.vehicles))].sort((a, b) => a - b);
  const values = scenarios.flatMap((s) => [s.metrics[options.metric].min, s.metrics[options.metric].max]);
  const finite = values.filter((v) => Number.isFinite(v) && (options.scale === 'linear' || v > 0));
  if (options.threshold) finite.push(options.threshold.value);
  const dataMax = Math.max(...finite);
  const dataMin = Math.min(...finite);

  const yTicks = options.scale === 'log' ? logTicks(dataMin, dataMax) : niceLinearTicks(dataMax);
  const yMin = options.scale === 'log' ? yTicks[0]! : 0;
  const yMax = yTicks.at(-1)!;
  const plotW = PANEL.width - PANEL.left - PANEL.right;
  const plotH = PANEL.height - PANEL.top - PANEL.bottom;
  const xMin = Math.log10(fleets[0]!);
  const xMax = Math.log10(fleets.at(-1)!);
  const x = (v: number) => PANEL.left + (plotW * (Math.log10(v) - xMin)) / (xMax - xMin || 1);
  const y = (v: number) =>
    options.scale === 'log'
      ? PANEL.top + plotH * (1 - (Math.log10(v) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin)))
      : PANEL.top + plotH * (1 - (v - yMin) / (yMax - yMin));
  const clampY = (v: number) => y(Math.min(Math.max(v, yMin), yMax));

  const width = PANEL.width * intervals.length;
  const height = PANEL.height + 46;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="Helvetica, Arial, sans-serif" font-size="11">`,
    `<title>${escape(options.title)}</title>`,
    `<rect width="${width}" height="${height}" fill="#ffffff"/>`,
  );

  intervals.forEach((interval, panel) => {
    const g: string[] = [`<g transform="translate(${panel * PANEL.width},0)">`];
    g.push(
      `<text x="${PANEL.left}" y="20" font-size="12" font-weight="bold" fill="${INK}">Update interval ${interval / 1000} s</text>`,
    );
    for (const tick of yTicks) {
      g.push(
        `<line x1="${PANEL.left}" x2="${PANEL.left + plotW}" y1="${y(tick)}" y2="${y(tick)}" stroke="${GRID}" stroke-width="1"/>`,
        `<text x="${PANEL.left - 6}" y="${y(tick) + 4}" text-anchor="end" fill="${INK_SECONDARY}">${fmt(tick)}</text>`,
      );
    }
    for (const fleet of fleets) {
      g.push(
        `<text x="${x(fleet)}" y="${PANEL.top + plotH + 16}" text-anchor="middle" fill="${INK_SECONDARY}">${fmt(fleet)}</text>`,
      );
    }
    g.push(
      `<line x1="${PANEL.left}" x2="${PANEL.left + plotW}" y1="${PANEL.top + plotH}" y2="${PANEL.top + plotH}" stroke="${INK_SECONDARY}" stroke-width="1"/>`,
      `<text x="${PANEL.left + plotW / 2}" y="${PANEL.top + plotH + 34}" text-anchor="middle" fill="${INK_SECONDARY}">Fleet size (vehicles, log scale)</text>`,
    );
    if (panel === 0) {
      g.push(
        `<text transform="translate(14,${PANEL.top + plotH / 2}) rotate(-90)" text-anchor="middle" fill="${INK_SECONDARY}">${escape(options.yLabel)}</text>`,
      );
    }
    if (options.threshold) {
      const ty = y(options.threshold.value);
      g.push(
        `<line x1="${PANEL.left}" x2="${PANEL.left + plotW}" y1="${ty}" y2="${ty}" stroke="${THRESHOLD}" stroke-width="1.5" stroke-dasharray="5 4"/>`,
        `<text x="${PANEL.left + 4}" y="${ty - 4}" fill="${INK_SECONDARY}">${escape(options.threshold.label)}</text>`,
      );
    }

    const labels: { y: number; text: string; color: string }[] = [];
    for (const renderer of RENDERERS) {
      const series = scenarios
        .filter((s) => s.renderer === renderer.id && s.intervalMs === interval)
        .sort((a, b) => a.vehicles - b.vehicles)
        .filter((s) => Number.isFinite(s.metrics[options.metric].median));
      if (series.length === 0) continue;
      for (const s of series) {
        const m = s.metrics[options.metric];
        if (m.max > m.min) {
          g.push(
            `<line x1="${x(s.vehicles)}" x2="${x(s.vehicles)}" y1="${clampY(m.min)}" y2="${clampY(m.max)}" stroke="${renderer.color}" stroke-width="2" stroke-linecap="round" opacity="0.55"/>`,
          );
        }
      }
      const points = series.map((s) => `${x(s.vehicles)},${clampY(s.metrics[options.metric].median)}`).join(' ');
      g.push(
        `<polyline points="${points}" fill="none" stroke="${renderer.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`,
      );
      for (const s of series) g.push(marker(renderer.marker, x(s.vehicles), clampY(s.metrics[options.metric].median), renderer.color));
      const last = series.at(-1)!;
      labels.push({ y: clampY(last.metrics[options.metric].median), text: renderer.label, color: renderer.color });
    }
    // Direct labels at the end of each line, pushed apart so that they do not overlap.
    labels.sort((a, b) => a.y - b.y);
    for (let i = 1; i < labels.length; i++) labels[i]!.y = Math.max(labels[i]!.y, labels[i - 1]!.y + 13);
    for (const label of labels) {
      g.push(
        `<text x="${PANEL.left + plotW + 10}" y="${label.y + 4}" fill="${INK}">${label.text}</text>`,
      );
    }
    g.push('</g>');
    parts.push(...g);
  });

  // Legend: marker shape and name for each renderer, so identity never depends on color alone.
  let lx = PANEL.left;
  const ly = height - 26;
  for (const renderer of RENDERERS) {
    parts.push(marker(renderer.marker, lx + 5, ly - 4, renderer.color), `<text x="${lx + 14}" y="${ly}" fill="${INK}">${renderer.label}</text>`);
    lx += 80;
  }
  parts.push(
    `<text x="${PANEL.left}" y="${height - 8}" fill="${INK_SECONDARY}">Line: median of repetitions; bar: their range</text>`,
    '</svg>',
  );
  return parts.join('\n');
}
