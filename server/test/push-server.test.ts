import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { test } from 'node:test';
import { WebSocket } from 'ws';
import type { FleetMessage } from '../../shared/telemetry.ts';
import { createFleetState } from '../src/fleet-state.ts';
import { startPushServer } from '../src/push-server.ts';

const message = (vehicleId: string, ts: number) => ({ vehicleId, lat: 61.5, lon: 23.7, status: 'moving', ts });

test('a client gets a snapshot, then batches of changed vehicles', async () => {
  const state = createFleetState();
  state.ingest(message('a', 1));
  state.takeChanged();

  const server = startPushServer({ state, port: 0, flushMs: 10 });
  await once(server.wss, 'listening');
  const client = new WebSocket(`ws://127.0.0.1:${(server.wss.address() as AddressInfo).port}`);

  const [snapshot] = await once(client, 'message');
  const parsedSnapshot = JSON.parse(String(snapshot)) as FleetMessage;
  assert.equal(parsedSnapshot.type, 'snapshot');
  assert.deepEqual(parsedSnapshot.vehicles.map((v) => v.vehicleId), ['a']);

  state.ingest(message('b', 2));
  const [batch] = await once(client, 'message');
  const parsedBatch = JSON.parse(String(batch)) as FleetMessage;
  assert.equal(parsedBatch.type, 'batch');
  assert.deepEqual(parsedBatch.vehicles.map((v) => v.vehicleId), ['b']);
  assert.ok(Number.isFinite(parsedBatch.serverTs));

  client.terminate();
  await server.close();
});
