import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import { ROOT } from './stack.ts';

const PACKAGES = ['leaflet', 'maplibre-gl', 'react', 'vite', 'playwright', 'mqtt', 'ws'];

const text = (command: string, args: string[]) =>
  execFileSync(command, args, { cwd: ROOT, encoding: 'utf8' }).trim();

const packageVersion = (name: string) =>
  (JSON.parse(readFileSync(`${ROOT}node_modules/${name}/package.json`, 'utf8')) as { version: string })
    .version;

/**
 * `mosquitto -h` prints its version but exits with a non-zero code. Versions differ in
 * whether the line goes to stdout or stderr, so both are searched.
 */
export function parseMosquittoVersion(output: string): string | undefined {
  return output.match(/mosquitto version [\w.-]+/)?.[0];
}

const mosquittoVersion = () => {
  const result = spawnSync('mosquitto', ['-h'], { encoding: 'utf8' });
  return parseMosquittoVersion(`${result.stdout ?? ''}\n${result.stderr ?? ''}`);
};

/** Facts about the machine and software, stored with the raw data of a benchmark. */
export function describeEnvironment() {
  return {
    cpu: os.cpus()[0]?.model,
    cpuCount: os.cpus().length,
    memoryBytes: os.totalmem(),
    platform: os.platform(),
    osRelease: os.release(),
    node: process.version,
    broker: mosquittoVersion(),
    packages: Object.fromEntries(PACKAGES.map((name) => [name, packageVersion(name)])),
    gitCommit: text('git', ['rev-parse', 'HEAD']),
    gitDirty: text('git', ['status', '--porcelain']) !== '',
  };
}
