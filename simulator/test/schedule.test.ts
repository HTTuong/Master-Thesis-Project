import assert from 'node:assert/strict';
import { test } from 'node:test';
import { slotsDue } from '../src/schedule.ts';

test('a slot is due from its own start time', () => {
  assert.equal(slotsDue(0, 100, 0, 0), 1);
  assert.equal(slotsDue(0, 100, 1, 99), 0);
  assert.equal(slotsDue(0, 100, 1, 100), 1);
});

test('slots missed by a late timer are all due at once, so the rate is kept', () => {
  // A timer 9 ms late on every call has run 100 slots by 10,900 ms, but slots 0..109 are due.
  assert.equal(slotsDue(0, 100, 100, 10900), 10);
  assert.equal(slotsDue(0, 100, 110, 10900), 0);
});
