import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Telemetry, VehicleStatus } from '../../shared/telemetry.ts';
import { countByStatus, vehiclesNeedingAttention } from '../src/fleet-summary.ts';

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
