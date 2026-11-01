export type InteractionType = 'click' | 'wheel' | 'drag';

export interface InteractionSample {
  type: InteractionType;
  latencyMs: number;
}

export interface MetricsSamples {
  frameTimesMs: number[];
  updateLatenciesMs: number[];
  interactions: InteractionSample[];
  /** Main-thread JavaScript heap, sampled once per second. Chromium only. */
  heapUsedBytes: number[];
  /** Vehicle updates that reached the page, for checking the load generator kept up. */
  vehicleUpdates: number;
}

export interface MetricsCollector {
  start(): void;
  stop(): MetricsSamples;
  /** Tracks one update, from the arrival of its message to the paint of the frame showing it. */
  trackUpdate(applied: Promise<void>, arrivedAt: number, vehicleCount: number): void;
}

/** Resolves after the current frame's paint step, when called from inside an animation frame. */
const afterCurrentFrame = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });

const HEAP_SAMPLE_INTERVAL_MS = 1000;

const readHeapUsed = () =>
  (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory?.usedJSHeapSize;

const emptySamples = (): MetricsSamples => ({
  frameTimesMs: [],
  updateLatenciesMs: [],
  interactions: [],
  heapUsedBytes: [],
  vehicleUpdates: 0,
});

/** Records samples only between start() and stop(), so warm-up can be excluded. */
export function createMetricsCollector(): MetricsCollector {
  let samples = emptySamples();
  let recording = false;
  let frameRequest = 0;
  let heapTimer: ReturnType<typeof setInterval> | undefined;

  const startFrameLoop = () => {
    let previous: number | undefined;
    const onFrame = (time: number) => {
      if (previous !== undefined) samples.frameTimesMs.push(time - previous);
      previous = time;
      frameRequest = requestAnimationFrame(onFrame);
    };
    frameRequest = requestAnimationFrame(onFrame);
  };

  const recordInteraction = (type: InteractionType, event: Event) => {
    if (!(event.target instanceof Element) || !event.target.closest('.map')) return;
    const target = samples;
    requestAnimationFrame(() => {
      void afterCurrentFrame().then(() => {
        target.interactions.push({ type, latencyMs: performance.now() - event.timeStamp });
      });
    });
  };
  // The browser also fires click at the end of a drag, and that is not a click interaction.
  let draggedSincePointerDown = false;
  const onPointerDown = () => {
    draggedSincePointerDown = false;
  };
  const onClick = (event: Event) => {
    if (!draggedSincePointerDown) recordInteraction('click', event);
  };
  const onWheel = (event: Event) => recordInteraction('wheel', event);
  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons === 0) return;
    draggedSincePointerDown = true;
    recordInteraction('drag', event);
  };
  const listenerOptions = { capture: true, passive: true };

  return {
    start() {
      samples = emptySamples();
      recording = true;
      startFrameLoop();
      heapTimer = setInterval(() => {
        const used = readHeapUsed();
        if (used !== undefined) samples.heapUsedBytes.push(used);
      }, HEAP_SAMPLE_INTERVAL_MS);
      window.addEventListener('pointerdown', onPointerDown, listenerOptions);
      window.addEventListener('click', onClick, listenerOptions);
      window.addEventListener('wheel', onWheel, listenerOptions);
      window.addEventListener('pointermove', onPointerMove, listenerOptions);
    },
    stop() {
      recording = false;
      cancelAnimationFrame(frameRequest);
      clearInterval(heapTimer);
      window.removeEventListener('pointerdown', onPointerDown, listenerOptions);
      window.removeEventListener('click', onClick, listenerOptions);
      window.removeEventListener('wheel', onWheel, listenerOptions);
      window.removeEventListener('pointermove', onPointerMove, listenerOptions);
      return samples;
    },
    trackUpdate(applied, arrivedAt, vehicleCount) {
      if (!recording) return;
      const target = samples;
      target.vehicleUpdates += vehicleCount;
      void applied.then(afterCurrentFrame).then(() => {
        target.updateLatenciesMs.push(performance.now() - arrivedAt);
      });
    },
  };
}
