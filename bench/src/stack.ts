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

/** Vite's own entry script, run with Node so that no shell or .cmd shim is needed on Windows. */
export const VITE_BIN = `${ROOT}node_modules/vite/bin/vite.js`;

/** The Node binary running the benchmark, so that every component uses the same version. */
const NODE = process.execPath;

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
  return spawn(command, args, { cwd, stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true });
}

async function stopProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, 'exit');
  // On Windows any signal ends the process at once, which is enough between runs.
  child.kill('SIGTERM');
  await exited;
}

export type Stop = () => Promise<void>;

/** Serves the production build of the dashboard. It stays the same across runs. */
export async function startDashboard(): Promise<Stop> {
  const child = startProcess(
    NODE,
    [VITE_BIN, 'preview', '--host', '127.0.0.1', '--port', String(PREVIEW_PORT), '--strictPort'],
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
  const server = startProcess(NODE, ['server/src/index.ts', '--port', String(SERVER_PORT)]);
  await waitForPort(SERVER_PORT);
  const simulator = startProcess(NODE, [
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
