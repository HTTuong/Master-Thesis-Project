import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createConnection } from 'node:net';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

export const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const BROKER_PORT = 1883;
const SERVER_PORT = 8080;
const PREVIEW_PORT = 4173;
export const DASHBOARD_URL = `http://127.0.0.1:${PREVIEW_PORT}/`;

const PORT_TIMEOUT_MS = 15000;

async function waitForPort(port: number): Promise<void> {
  const deadline = Date.now() + PORT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const open = await new Promise<boolean>((resolve) => {
      const socket = createConnection({ port, host: '127.0.0.1' });
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => resolve(false));
    });
    if (open) return;
    await sleep(50);
  }
  throw new Error(`Nothing is listening on port ${port}`);
}

function startProcess(command: string, args: string[], cwd = ROOT): ChildProcess {
  return spawn(command, args, { cwd, stdio: ['ignore', 'ignore', 'inherit'] });
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  child.kill('SIGTERM');
  await exited;
}

export type Stop = () => Promise<void>;

/** Serves the production build of the dashboard. It stays the same across runs. */
export async function startDashboard(): Promise<Stop> {
  const vite = `${ROOT}node_modules/.bin/vite`;
  const child = startProcess(
    vite,
    ['preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'],
    `${ROOT}dashboard`,
  );
  await waitForPort(PREVIEW_PORT);
  return () => stopProcess(child);
}

/** Starts a fresh broker, server, and simulator, so that no run inherits state from another. */
export async function startFleet(options: {
  vehicles: number;
  intervalMs: number;
  seed: number;
}): Promise<Stop> {
  const broker = startProcess('mosquitto', ['-c', 'broker/mosquitto.conf']);
  await waitForPort(BROKER_PORT);
  const server = startProcess('node', ['server/src/index.ts', '--port', String(SERVER_PORT)]);
  await waitForPort(SERVER_PORT);
  const simulator = startProcess('node', [
    'simulator/src/index.ts',
    '--vehicles',
    String(options.vehicles),
    '--interval',
    String(options.intervalMs),
    '--seed',
    String(options.seed),
  ]);
  return async () => {
    await stopProcess(simulator);
    await stopProcess(server);
    await stopProcess(broker);
  };
}
