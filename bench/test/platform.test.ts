import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMosquittoVersion } from '../src/environment.ts';
import { angleArgs } from '../src/platform.ts';

test('picks the ANGLE back end of each platform', () => {
  assert.deepEqual(angleArgs('darwin'), ['--use-angle=metal']);
  assert.deepEqual(angleArgs('win32'), ['--use-angle=d3d11']);
  assert.deepEqual(angleArgs('linux'), []);
});

test('finds the Mosquitto version in either output stream', () => {
  assert.equal(parseMosquittoVersion('mosquitto version 2.0.20\n\nUsage: ...'), 'mosquitto version 2.0.20');
  assert.equal(
    parseMosquittoVersion('\n1794998718: mosquitto version 2.1.4 terminating\n'),
    'mosquitto version 2.1.4',
  );
  assert.equal(parseMosquittoVersion(''), undefined);
});
