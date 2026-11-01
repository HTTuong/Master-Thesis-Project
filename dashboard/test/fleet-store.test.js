import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createFleetStore } from '../src/fleet-store.js';

const vehicle = (vehicleId, lat) => ({ vehicleId, lat, lon: 23.7, status: 'moving', ts: 1 });

test('a snapshot replaces the fleet and a batch updates it', () => {
  const store = createFleetStore();
  store.apply({ type: 'batch', vehicles: [vehicle('old', 61)] });
  store.apply({ type: 'snapshot', vehicles: [vehicle('a', 61), vehicle('b', 61)] });
  assert.deepEqual([...store.vehicles.keys()], ['a', 'b']);
  const changed = store.apply({ type: 'batch', vehicles: [vehicle('a', 62)] });
  assert.equal(store.vehicles.get('a').lat, 62);
  assert.equal(store.vehicles.size, 2);
  assert.deepEqual(changed.map((v) => v.vehicleId), ['a']);
});
