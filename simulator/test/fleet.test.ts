import assert from 'node:assert/strict';
import { test } from 'node:test';
import { advanceVehicle, createFleet, toTelemetry } from '../src/fleet.ts';
import { buildRoute } from '../src/route.ts';

const routes = [
  buildRoute([[23.0, 61.0], [23.0, 61.1]]),
  buildRoute([[23.5, 61.0], [23.6, 61.0]]),
];

test('the same seed creates the same fleet', () => {
  const summary = (seed: number) =>
    createFleet({ size: 50, routes, seed }).vehicles.map((v) => [v.distance, v.speedMps]);
  assert.deepEqual(summary(7), summary(7));
  assert.notDeepEqual(summary(7), summary(8));
});

test('vehicles get unique ids and share routes evenly', () => {
  const { vehicles } = createFleet({ size: 4, routes, seed: 1 });
  assert.equal(new Set(vehicles.map((v) => v.vehicleId)).size, 4);
  assert.equal(vehicles[0]!.route, routes[0]);
  assert.equal(vehicles[1]!.route, routes[1]);
  assert.equal(vehicles[2]!.route, routes[0]);
});

const neverChange = () => 0.999;
const alwaysChange = () => 0;

test('a moving vehicle advances by speed times elapsed time', () => {
  const vehicle = createFleet({ size: 1, routes, seed: 1 }).vehicles[0]!;
  const start = vehicle.distance;
  advanceVehicle(vehicle, 10, neverChange);
  assert.ok(Math.abs(vehicle.distance - start - vehicle.speedMps * 10) < 1e-9);
});

test('a stopped vehicle stays in place and a delayed one moves at half speed', () => {
  const vehicle = createFleet({ size: 1, routes, seed: 1 }).vehicles[0]!;
  const start = vehicle.distance;
  vehicle.status = 'stopped';
  advanceVehicle(vehicle, 10, neverChange);
  assert.equal(vehicle.distance, start);
  vehicle.status = 'delayed';
  advanceVehicle(vehicle, 10, neverChange);
  assert.ok(Math.abs(vehicle.distance - start - vehicle.speedMps * 5) < 1e-9);
});

test('status transitions follow the model', () => {
  const vehicle = createFleet({ size: 1, routes, seed: 1 }).vehicles[0]!;
  advanceVehicle(vehicle, 1, alwaysChange);
  assert.equal(vehicle.status, 'stopped');
  advanceVehicle(vehicle, 1, alwaysChange);
  assert.equal(vehicle.status, 'moving');
});

test('telemetry carries the id, position, status and timestamp', () => {
  const vehicle = createFleet({ size: 1, routes, seed: 1 }).vehicles[0]!;
  const message = toTelemetry(vehicle, 1234);
  assert.equal(message.vehicleId, 'v00001');
  assert.equal(message.ts, 1234);
  assert.equal(message.status, 'moving');
  assert.ok(message.lat >= 61.0 && message.lat <= 61.1);
});
