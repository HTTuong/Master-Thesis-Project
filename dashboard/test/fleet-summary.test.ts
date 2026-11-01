import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Telemetry, VehicleStatus } from '../../shared/telemetry.ts';
import { appendSample, countByStatus, vehiclesNeedingAttention } from '../src/fleet-summary.ts';

const vehicle = (vehicleId: string, status: VehicleStatus): Telemetry => ({
  vehicleId,
  lat: 61.5,
  lon: 23.7,
  status,
  ts: 1,
});

test('counts vehicles per status, including statuses with none', () => {
  const counts = countByStatus([vehicle('a', 'moving'), vehicle('b', 'moving'), vehicle('c', 'delayed')]);
  assert.deepEqual(counts, { moving: 2, stopped: 0, delayed: 1 });
});

test('lists delayed vehicles first and leaves out moving ones', () => {
  const list = vehiclesNeedingAttention([
    vehicle('c', 'stopped'),
    vehicle('b', 'delayed'),
    vehicle('d', 'moving'),
    vehicle('a', 'delayed'),
  ]);
  assert.deepEqual(list.map((v) => v.vehicleId), ['a', 'b', 'c']);
});

test('history keeps only samples inside the window', () => {
  const counts = { moving: 1, stopped: 0, delayed: 0 };
  let history = appendSample([], { time: 0, counts }, 100);
  history = appendSample(history, { time: 100, counts }, 100);
  assert.equal(history.length, 2);
  history = appendSample(history, { time: 150, counts }, 100);
  assert.deepEqual(history.map((s) => s.time), [100, 150]);
});
