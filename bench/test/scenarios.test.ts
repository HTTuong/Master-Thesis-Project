import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildRunOrder, scenarioFileName } from '../src/scenarios.ts';

const matrix = { renderers: ['dom', 'webgl'], vehicles: [100, 500], intervalsMs: [1000], repetitions: 3 };

test('every combination appears exactly once', () => {
  const names = buildRunOrder(matrix, 1).map(scenarioFileName);
  assert.equal(names.length, 12);
  assert.equal(new Set(names).size, 12);
});

test('the order depends only on the seed', () => {
  assert.deepEqual(buildRunOrder(matrix, 1), buildRunOrder(matrix, 1));
  assert.notDeepEqual(buildRunOrder(matrix, 1), buildRunOrder(matrix, 2));
});
