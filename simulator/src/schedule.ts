/**
 * Number of slots that are due at `nowMs` and have not run yet. Slot k is due at
 * `startMs + k * slotMs`, so a timer that fires late never lowers the overall rate.
 */
export function slotsDue(startMs: number, slotMs: number, done: number, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - startMs) / slotMs) + 1 - done);
}

/**
 * Runs `onSlot(k)` for slot k = 0, 1, 2, ... every `slotMs` milliseconds, measured from the
 * start time rather than from the previous call. Timers on Windows have a coarse granularity,
 * so a plain `setInterval(100)` fires late on every call and the delay adds up. Here each wait
 * is computed from the next due time, and slots that are already due run at once.
 */
export function startSlotClock(slotMs: number, onSlot: (slot: number) => void, now = Date.now): () => void {
  const startMs = now();
  let done = 0;
  let timer: NodeJS.Timeout | undefined;
  const tick = () => {
    for (let n = slotsDue(startMs, slotMs, done, now()); n > 0; n--) onSlot(done++);
    timer = setTimeout(tick, Math.max(0, startMs + done * slotMs - now()));
  };
  tick();
  return () => clearTimeout(timer);
}
