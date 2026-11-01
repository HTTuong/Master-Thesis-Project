import { setTimeout as sleep } from 'node:timers/promises';
import type { Page } from 'playwright';

// The middle of the map area at a 1280 x 800 viewport with the 320 px side panel.
const MAP_CENTER = { x: 480, y: 400 };
const DRAG_DISTANCE_PX = 60;
const DRAG_STEPS = 5;
const WHEEL_DELTA = 100;
const REPEATS = 5;
const SETTLE_MS = 800; // Longer than the zoom animations, so interactions do not overlap.

async function click(page: Page) {
  await page.mouse.click(MAP_CENTER.x, MAP_CENTER.y);
  await sleep(SETTLE_MS);
}

/** Zooms in and back out, so the view ends where it started. */
async function zoomInAndOut(page: Page) {
  await page.mouse.wheel(0, -WHEEL_DELTA);
  await sleep(SETTLE_MS);
  await page.mouse.wheel(0, WHEEL_DELTA);
  await sleep(SETTLE_MS);
}

/** Drags the map and back, so the view ends where it started. */
async function dragAndReturn(page: Page) {
  const { x, y } = MAP_CENTER;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + DRAG_DISTANCE_PX, y, { steps: DRAG_STEPS });
  await page.mouse.up();
  await sleep(SETTLE_MS);
  await page.mouse.move(x + DRAG_DISTANCE_PX, y);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: DRAG_STEPS });
  await page.mouse.up();
  await sleep(SETTLE_MS);
}

async function runAllOnce(page: Page) {
  await click(page);
  await zoomInAndOut(page);
  await dragAndReturn(page);
}

/**
 * One unrecorded round warms up the code paths, because a first click was found to be
 * slower than later ones. The recorded rounds then always follow the same script.
 */
export async function measureInteractions(page: Page) {
  await runAllOnce(page);
  await page.evaluate(() => window.fleetMetrics!.start());
  for (let i = 0; i < REPEATS; i++) await runAllOnce(page);
  return page.evaluate(() => window.fleetMetrics!.stop());
}
