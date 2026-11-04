import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parsePs, summarizeChromiumMemory } from '../src/process-memory.ts';

const ps = `
  100     1  5000 node bench/src/run.ts
  200   100  1000 /cache/chrome-headless-shell --headless
  201   200  2000 /cache/chrome-headless-shell --type=gpu-process
  202   200  3000 /cache/chrome-headless-shell --type=renderer
  203   200   500 /cache/chrome-headless-shell --type=renderer
  300   100  9000 mosquitto -c broker/mosquitto.conf
  400     1  7000 /cache/chrome-headless-shell --type=renderer
`;

test('sums Chromium processes below the root by type and ignores the rest', () => {
  const { totalBytes, byType } = summarizeChromiumMemory(parsePs(ps), 100);
  assert.deepEqual(byType, { browser: 1024000, 'gpu-process': 2048000, renderer: 3584000 });
  assert.equal(totalBytes, 6656000);
});
