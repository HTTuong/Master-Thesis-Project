import { useEffect, useRef, useState, type MouseEvent } from 'react';
import type { VehicleStatus } from '../../../shared/telemetry.ts';
import { appendSample, type HistorySample, type StatusCounts } from '../fleet-summary.ts';
import { STATUS_COLORS } from '../status-colors.ts';
import { StatusLabel } from './StatusLabel.tsx';

const WINDOW_MS = 5 * 60 * 1000;
const SERIES: VehicleStatus[] = ['delayed', 'stopped'];
const WIDTH = 288;
const HEIGHT = 96;
const PLOT = { left: 28, right: 4, top: 4, bottom: 4 };

interface Props {
  counts: StatusCounts;
  /** Changes once per fleet refresh, which is when a new sample is taken. */
  refreshKey: unknown;
}

export function StatusTimeSeries({ counts, refreshKey }: Props) {
  const [history, setHistory] = useState<HistorySample[]>([]);
  const [hover, setHover] = useState<HistorySample | null>(null);
  const latestCounts = useRef(counts);
  latestCounts.current = counts;

  useEffect(() => {
    setHistory((previous) =>
      appendSample(previous, { time: Date.now(), counts: latestCounts.current }, WINDOW_MS),
    );
  }, [refreshKey]);

  const newest = history.at(-1)?.time ?? 0;
  const maxValue = Math.max(1, ...history.flatMap((s) => SERIES.map((name) => s.counts[name])));
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const x = (time: number) => PLOT.left + plotWidth * (1 - (newest - time) / WINDOW_MS);
  const y = (value: number) => PLOT.top + plotHeight * (1 - value / maxValue);

  const onMouseMove = (event: MouseEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const pointer = ((event.clientX - box.left) / box.width) * WIDTH;
    let closest: HistorySample | null = null;
    for (const sample of history) {
      if (!closest || Math.abs(x(sample.time) - pointer) < Math.abs(x(closest.time) - pointer)) {
        closest = sample;
      }
    }
    setHover(closest);
  };

  const shown = hover ?? history.at(-1);

  return (
    <section className="time-series">
      <h2>Vehicles not moving, last 5 minutes</h2>
      <div className="legend">
        {SERIES.map((name) => (
          <StatusLabel key={name} status={name} color={STATUS_COLORS[name]} />
        ))}
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Number of delayed and stopped vehicles over the last 5 minutes"
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={PLOT.left} x2={WIDTH - PLOT.right} y1={y(0)} y2={y(0)} stroke="#c3c8ce" />
        <text x={PLOT.left - 4} y={y(maxValue) + 8} textAnchor="end">
          {maxValue}
        </text>
        <text x={PLOT.left - 4} y={y(0)} textAnchor="end">
          0
        </text>
        {SERIES.map((name) => (
          <polyline
            key={name}
            fill="none"
            stroke={STATUS_COLORS[name]}
            strokeWidth="2"
            strokeLinejoin="round"
            points={history.map((s) => `${x(s.time)},${y(s.counts[name])}`).join(' ')}
          />
        ))}
        {hover && (
          <line
            x1={x(hover.time)}
            x2={x(hover.time)}
            y1={PLOT.top}
            y2={y(0)}
            stroke="#5d6773"
          />
        )}
      </svg>
      <p className="chart-tooltip">
        {shown &&
          `${new Date(shown.time).toLocaleTimeString('en-GB')}: ${shown.counts.delayed} delayed, ${shown.counts.stopped} stopped`}
      </p>
    </section>
  );
}
