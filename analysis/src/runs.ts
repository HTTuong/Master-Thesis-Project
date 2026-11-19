import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { median, quantile, shareAbove } from './stats.ts';

/** The raw result file that the benchmark writes for one run (see bench/src/run.ts). */
export interface RawRun {
  scenario: { renderer: string; vehicles: number; intervalMs: number; repetition: number };
  warmupMs: number;
  durationMs: number;
  errors: string[];
  passive: {
    frameTimesMs: number[];
    sendToPaintLatenciesMs: number[];
    dispatchToPaintLatenciesMs: number[];
    heapUsedBytes: number[];
    vehicleUpdates: number;
    processMemory: { totalBytes: number; byType: Record<string, number> }[];
    processMemorySkipped?: number;
  };
  interactive: { interactions: { type: string; latencyMs: number }[] };
}

export interface RawSet {
  dir: string;
  manifest: { headless: boolean; environment: { gitCommit: string; gitDirty: boolean } };
  runs: RawRun[];
}

/** Reads a benchmark output folder: its manifest and every run file next to it. */
export async function readRawSet(dir: string): Promise<RawSet> {
  const manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8'));
  const names = (await readdir(dir)).filter((name) => name.endsWith('.json') && name !== 'manifest.json');
  const runs: RawRun[] = [];
  for (const name of names.sort()) {
    runs.push(JSON.parse(await readFile(path.join(dir, name), 'utf8')) as RawRun);
  }
  return { dir, manifest, runs };
}

/**
 * A frame is counted as late when it took longer than one and a half refresh intervals at
 * 60 Hz, that is, when at least one refresh was missed. Frame times are multiples of the
 * refresh interval plus jitter, so the exact choice between 16.7 ms and 33.3 ms does not matter.
 */
export const LATE_FRAME_MS = 25;

const MB = 1024 * 1024;

export const INTERACTION_TYPES = ['click', 'wheel', 'drag'] as const;

/** The statistics of one run that the analysis uses. All times in ms, memory in MiB. */
export interface RunSummary {
  renderer: string;
  vehicles: number;
  intervalMs: number;
  repetition: number;
  frames: number;
  frameMedian: number;
  frameP95: number;
  lateFrameShare: number;
  sendToPaintMedian: number;
  sendToPaintP95: number;
  dispatchToPaintMedian: number;
  interactionMedian: number;
  interactionP95: number;
  clickP95: number;
  wheelP95: number;
  dragP95: number;
  memoryMedianMiB: number;
  rendererMemoryMedianMiB: number;
  gpuMemoryMedianMiB: number;
  heapMedianMiB: number;
  updateShare: number;
  skippedMemorySamples: number;
  errors: number;
}

export function summarizeRun(run: RawRun): RunSummary {
  const { scenario, passive } = run;
  const interactions = run.interactive.interactions;
  const latencyOf = (type: string) => interactions.filter((i) => i.type === type).map((i) => i.latencyMs);
  const all = interactions.map((i) => i.latencyMs);
  const memory = passive.processMemory.map((sample) => sample.totalBytes / MB);
  const byType = (type: string) => passive.processMemory.map((sample) => (sample.byType[type] ?? 0) / MB);
  const expectedUpdates = (scenario.vehicles * run.durationMs) / scenario.intervalMs;

  return {
    renderer: scenario.renderer,
    vehicles: scenario.vehicles,
    intervalMs: scenario.intervalMs,
    repetition: scenario.repetition,
    frames: passive.frameTimesMs.length,
    frameMedian: median(passive.frameTimesMs),
    frameP95: quantile(passive.frameTimesMs, 0.95),
    lateFrameShare: shareAbove(passive.frameTimesMs, LATE_FRAME_MS),
    sendToPaintMedian: median(passive.sendToPaintLatenciesMs),
    sendToPaintP95: quantile(passive.sendToPaintLatenciesMs, 0.95),
    dispatchToPaintMedian: median(passive.dispatchToPaintLatenciesMs),
    interactionMedian: median(all),
    interactionP95: quantile(all, 0.95),
    clickP95: quantile(latencyOf('click'), 0.95),
    wheelP95: quantile(latencyOf('wheel'), 0.95),
    dragP95: quantile(latencyOf('drag'), 0.95),
    memoryMedianMiB: median(memory),
    rendererMemoryMedianMiB: median(byType('renderer')),
    gpuMemoryMedianMiB: median(byType('gpu-process')),
    heapMedianMiB: median(passive.heapUsedBytes.map((bytes) => bytes / MB)),
    updateShare: expectedUpdates > 0 ? passive.vehicleUpdates / expectedUpdates : Number.NaN,
    skippedMemorySamples: passive.processMemorySkipped ?? 0,
    errors: run.errors.length,
  };
}
