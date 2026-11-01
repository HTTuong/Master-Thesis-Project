import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFleetState } from '../src/fleet-state.ts';

const message = (vehicleId: string, ts: number, lat = 61.5) => ({ vehicleId, lat, lon: 23.7, status: 'moving', ts });

test('keeps only the latest message per vehicle', () => {
  const state = createFleetState();
  state.ingest(message('a', 1, 61.1));
  state.ingest(message('a', 2, 61.2));
  state.ingest(message('b', 1));
  const snapshot = state.snapshot();
  assert.equal(snapshot.length, 2);
  assert.equal(snapshot.find((v) => v.vehicleId === 'a')?.lat, 61.2);
});

test('ignores out-of-order messages', () => {
  const state = createFleetState();
  state.ingest(message('a', 5, 61.5));
  assert.equal(state.ingest(message('a', 4, 61.4)), false);
  assert.equal(state.snapshot()[0]?.lat, 61.5);
});

test('rejects malformed messages', () => {
  const state = createFleetState();
  assert.equal(state.ingest(null), false);
  assert.equal(state.ingest({ vehicleId: 'a', lat: 'x', lon: 1, status: 'moving', ts: 1 }), false);
  assert.equal(state.snapshot().length, 0);
});

test('takeChanged returns each changed vehicle once, then nothing', () => {
  const state = createFleetState();
  state.ingest(message('a', 1));
  state.ingest(message('a', 2));
  state.ingest(message('b', 1));
  assert.deepEqual(state.takeChanged().map((v) => [v.vehicleId, v.ts]), [['a', 2], ['b', 1]]);
  assert.deepEqual(state.takeChanged(), []);
});
