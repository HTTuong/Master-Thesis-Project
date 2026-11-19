import assert from 'node:assert/strict';
import { test } from 'node:test';
import { summarizeRun, type RawRun } from '../src/runs.ts';
import { summarizeScenarios } from '../src/scenarios.ts';
import { quantile, shareAbove, spread } from '../src/stats.ts';
import { findCrossings } from '../src/thresholds.ts';

test('nearest-rank quantile', () => {
  const values = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(quantile(values, 0.95), 95);
  assert.equal(quantile([3, 1, 2], 0.5), 2);
  assert.equal(quantile([7], 0.95), 7);
  assert.ok(Number.isNaN(quantile([], 0.5)));
});

test('share above a limit and spread over repetitions', () => {
  assert.equal(shareAbove([16.7, 16.7, 33.3, 50], 25), 0.5);
  assert.deepEqual(spread([3, Number.NaN, 1, 2]), { median: 2, min: 1, max: 3, n: 3 });
});

const run = (renderer: string, vehicles: number, repetition: number, frame: number, interaction: number): RawRun => ({
  scenario: { renderer, vehicles, intervalMs: 1000, repetition },
  warmupMs: 0,
  durationMs: 10000,
  errors: [],
  passive: {
    frameTimesMs: Array(20).fill(frame),
    sendToPaintLatenciesMs: [10, 20, 30],
    dispatchToPaintLatenciesMs: [5],
    heapUsedBytes: [1024 * 1024],
    vehicleUpdates: vehicles * 10,
    processMemory: [{ totalBytes: 100 * 1024 * 1024, byType: { renderer: 60 * 1024 * 1024 } }],
  },
  interactive: { interactions: [{ type: 'click', latencyMs: interaction }] },
});

test('a run summary computes shares and memory in MiB', () => {
  const s = summarizeRun(run('dom', 100, 1, 16.7, 15));
  assert.equal(s.frameP95, 16.7);
  assert.equal(s.lateFrameShare, 0);
  assert.equal(s.sendToPaintMedian, 20);
  assert.equal(s.updateShare, 1);
  assert.equal(s.memoryMedianMiB, 100);
  assert.equal(s.rendererMemoryMedianMiB, 60);
  assert.ok(Number.isNaN(s.wheelP95));
});

test('scenarios take the median over repetitions, and crossings find the first failing fleet size', () => {
  const runs = [
    run('dom', 100, 1, 16.7, 15),
    run('dom', 100, 2, 16.7, 20),
    run('dom', 1000, 1, 33.3, 150),
    run('dom', 1000, 2, 50, 250),
    run('dom', 1000, 3, 16.7, 50),
    run('dom', 5000, 1, 16.7, 20),
  ].map(summarizeRun);
  const scenarios = summarizeScenarios(runs);
  const at1000 = scenarios.find((s) => s.vehicles === 1000)!;
  assert.deepEqual(at1000.metrics.frameP95, { median: 33.3, min: 16.7, max: 50, n: 3 });
  const frames = findCrossings(scenarios).find((c) => c.criterion === 'frames')!;
  assert.equal(frames.meetsUpTo, 100);
  assert.equal(frames.firstFailure, 1000);
  assert.equal(frames.nonMonotonic, true);
  const flow = findCrossings(scenarios).find((c) => c.criterion === 'interaction-1s')!;
  assert.equal(flow.firstFailure, null);
  assert.equal(flow.meetsUpTo, 5000);
});
