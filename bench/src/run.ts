// Runs the scenario matrix and writes one raw JSON file per run.
// Usage: npm run bench -- --out results/raw/my-run
// Finished runs are skipped, so an interrupted benchmark can be continued with the same --out.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { parseArgs } from 'node:util';
import { chromium, type Browser, type Page } from 'playwright';
import { describeEnvironment } from './environment.ts';
import { measureInteractions } from './interactions.ts';
import { readChromiumMemory } from './process-memory.ts';
import { buildRunOrder, scenarioFileName, type Scenario } from './scenarios.ts';
import { DASHBOARD_URL, ROOT, startDashboard, startFleet } from './stack.ts';

const VIEWPORT = { width: 1280, height: 800 };
const BROWSER_ARGS = ['--use-angle=metal', '--enable-gpu', '--enable-precise-memory-info'];

const list = (value: string) => value.split(',');
const numbers = (value: string) => list(value).map(Number);

const { values: args } = parseArgs({
  options: {
    out: { type: 'string' },
    renderers: { type: 'string', default: 'dom,canvas,webgl' },
    vehicles: { type: 'string', default: '100,500,1000,2000,5000,10000' },
    intervals: { type: 'string', default: '1000,5000' },
    repetitions: { type: 'string', default: '5' },
    warmup: { type: 'string', default: '30' },
    duration: { type: 'string', default: '60' },
    seed: { type: 'string', default: '1' },
  },
});
if (!args.out) throw new Error('--out is required');

const outDir = args.out;
const warmupMs = Number(args.warmup) * 1000;
const durationMs = Number(args.duration) * 1000;
const seed = Number(args.seed);

const matrix = {
  renderers: list(args.renderers),
  vehicles: numbers(args.vehicles),
  intervalsMs: numbers(args.intervals),
  repetitions: Number(args.repetitions),
};

const PROCESS_MEMORY_INTERVAL_MS = 1000;

/**
 * Besides the in-page samples, records the resident memory of all browser processes,
 * which also covers web workers and the GPU process that the page heap leaves out.
 */
async function measurePassive(page: Page, milliseconds: number) {
  const processMemory: ReturnType<typeof readChromiumMemory>[] = [];
  await page.evaluate(() => window.fleetMetrics!.start());
  const timer = setInterval(
    () => processMemory.push(readChromiumMemory()),
    PROCESS_MEMORY_INTERVAL_MS,
  );
  await sleep(milliseconds);
  clearInterval(timer);
  const samples = await page.evaluate(() => window.fleetMetrics!.stop());
  return { ...samples, processMemory };
}

async function runScenario(browser: Browser, scenario: Scenario) {
  const stopFleet = await startFleet({
    vehicles: scenario.vehicles,
    intervalMs: scenario.intervalMs,
    seed,
  });
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(`${DASHBOARD_URL}?metrics&renderer=${scenario.renderer}`);
    await sleep(warmupMs);
    const passive = await measurePassive(page, durationMs);
    const interactive = await measureInteractions(page);
    return { scenario, warmupMs, durationMs, seed, errors, passive, interactive };
  } finally {
    await context.close();
    await stopFleet();
  }
}

await mkdir(outDir, { recursive: true });
execFileSync('npm', ['run', 'build', '-w', 'dashboard'], { cwd: ROOT, stdio: 'ignore' });

const order = buildRunOrder(matrix, seed);
const stopDashboard = await startDashboard();
let browser: Browser | undefined;

try {
  browser = await chromium.launch({ args: BROWSER_ARGS });
  await writeFile(
    `${outDir}/manifest.json`,
    `${JSON.stringify(
      {
        startedAt: new Date().toISOString(),
        matrix,
        warmupMs,
        durationMs,
        seed,
        viewport: VIEWPORT,
        browserArgs: BROWSER_ARGS,
        browser: browser.version(),
        headless: true,
        environment: describeEnvironment(),
      },
      null,
      2,
    )}\n`,
  );

  for (const [index, scenario] of order.entries()) {
    const file = `${outDir}/${scenarioFileName(scenario)}`;
    if (existsSync(file)) continue;
    console.log(`[${index + 1}/${order.length}] ${scenarioFileName(scenario)}`);
    const result = await runScenario(browser, scenario);
    await writeFile(file, `${JSON.stringify(result)}\n`);
  }
} finally {
  await browser?.close();
  await stopDashboard();
}
