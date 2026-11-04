// Summarizes one raw run file in consecutive time windows, to see when measurements settle.
// Usage: node bench/src/windows.ts <run.json> [--window 30]
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { median } from './stats.ts';

interface Passive {
  frameTimesMs: number[];
  sendToPaintLatenciesMs: number[];
  processMemory: { totalBytes: number }[];
  heapUsedBytes: number[];
}

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: { window: { type: 'string', default: '30' } },
});
const windowMs = Number(args.window) * 1000;
const run = JSON.parse(await readFile(positionals[0]!, 'utf8')) as {
  durationMs: number;
  passive: Passive;
};
const { passive } = run;
const windowCount = Math.ceil(run.durationMs / windowMs);

// Frames carry their own time. Latency samples arrive at a steady rate, so their index stands
// in for time. Memory is sampled once per second.
const frameWindows: number[][] = Array.from({ length: windowCount }, () => []);
let elapsed = 0;
for (const frame of passive.frameTimesMs) {
  elapsed += frame;
  frameWindows[Math.min(windowCount - 1, Math.floor(elapsed / windowMs))]!.push(frame);
}
const slice = <T>(values: T[], index: number) =>
  values.slice(
    Math.floor((index * values.length) / windowCount),
    Math.floor(((index + 1) * values.length) / windowCount),
  );

console.log('window_s\tframe_median_ms\tlatency_median_ms\tprocess_memory_mb\theap_mb');
for (let i = 0; i < windowCount; i++) {
  const memory = slice(passive.processMemory, i).map((m) => m.totalBytes / 1e6);
  const heap = slice(passive.heapUsedBytes, i).map((b) => b / 1e6);
  console.log(
    [
      `${(i * windowMs) / 1000}-${((i + 1) * windowMs) / 1000}`,
      median(frameWindows[i]!).toFixed(1),
      median(slice(passive.sendToPaintLatenciesMs, i)).toFixed(1),
      median(memory).toFixed(0),
      median(heap).toFixed(1),
    ].join('\t'),
  );
}
