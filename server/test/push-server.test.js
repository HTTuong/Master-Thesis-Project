import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import { createFleetState } from '../src/fleet-state.js';
import { startPushServer } from '../src/push-server.js';

const message = (vehicleId, ts) => ({ vehicleId, lat: 61.5, lon: 23.7, status: 'moving', ts });

test('a client gets a snapshot, then batches of changed vehicles', async () => {
  const state = createFleetState();
  state.ingest(message('a', 1));
  state.takeChanged();

  const server = startPushServer({ state, port: 0, flushMs: 10 });
  await once(server.wss, 'listening');
  const client = new WebSocket(`ws://127.0.0.1:${server.wss.address().port}`);

  const [snapshot] = await once(client, 'message');
  const parsedSnapshot = JSON.parse(snapshot);
  assert.equal(parsedSnapshot.type, 'snapshot');
  assert.deepEqual(parsedSnapshot.vehicles.map((v) => v.vehicleId), ['a']);

  state.ingest(message('b', 2));
  const [batch] = await once(client, 'message');
  const parsedBatch = JSON.parse(batch);
  assert.equal(parsedBatch.type, 'batch');
  assert.deepEqual(parsedBatch.vehicles.map((v) => v.vehicleId), ['b']);
  assert.ok(Number.isFinite(parsedBatch.serverTs));

  client.terminate();
  await server.close();
});
