import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRoute, haversineMeters, positionAt } from '../src/route.js';

const line = buildRoute([[23.0, 61.0], [23.0, 61.01], [23.0, 61.02]]);

test('haversine distance of 0.01 degrees of latitude is about 1112 m', () => {
  const distance = haversineMeters([23.0, 61.0], [23.0, 61.01]);
  assert.ok(Math.abs(distance - 1112) < 1);
});

test('position is interpolated along the correct segment', () => {
  const { lat, lon } = positionAt(line, line.length * 0.75);
  assert.ok(Math.abs(lat - 61.015) < 1e-9);
  assert.equal(lon, 23.0);
});

test('a vehicle turns back after the end of the route', () => {
  const { lat } = positionAt(line, line.length * 1.5);
  assert.ok(Math.abs(lat - 61.01) < 1e-9);
  assert.ok(Math.abs(positionAt(line, line.length * 2).lat - 61.0) < 1e-9);
});

test('routes without a usable length are rejected', () => {
  assert.throws(() => buildRoute([[23, 61]]));
  assert.throws(() => buildRoute([[23, 61], [23, 61]]));
});
