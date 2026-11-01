export type InteractionType = 'click' | 'wheel' | 'drag';

export interface InteractionSample {
  type: InteractionType;
  latencyMs: number;
}

export interface MetricsSamples {
  frameTimesMs: number[];
  updateLatenciesMs: number[];
  interactions: InteractionSample[];
}

export interface MetricsCollector {
  start(): void;
  stop(): MetricsSamples;
  /** Tracks one update, from the arrival of its message to the paint of the frame showing it. */
  trackUpdate(applied: Promise<void>, arrivedAt: number): void;
}

/** Resolves after the current frame's paint step, when called from inside an animation frame. */
const afterCurrentFrame = () =>
  new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => resolve();
    channel.port2.postMessage(null);
  });

const emptySamples = (): MetricsSamples => ({
  frameTimesMs: [],
  updateLatenciesMs: [],
  interactions: [],
});

/** Records samples only between start() and stop(), so warm-up can be excluded. */
export function createMetricsCollector(): MetricsCollector {
  let samples = emptySamples();
  let recording = false;
  let frameRequest = 0;

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
  const onClick = (event: Event) => recordInteraction('click', event);
  const onWheel = (event: Event) => recordInteraction('wheel', event);
  const onPointerMove = (event: PointerEvent) => {
    if (event.buttons !== 0) recordInteraction('drag', event);
  };
  const listenerOptions = { capture: true, passive: true };

  return {
    start() {
      samples = emptySamples();
      recording = true;
      startFrameLoop();
      window.addEventListener('click', onClick, listenerOptions);
      window.addEventListener('wheel', onWheel, listenerOptions);
      window.addEventListener('pointermove', onPointerMove, listenerOptions);
    },
    stop() {
      recording = false;
      cancelAnimationFrame(frameRequest);
      window.removeEventListener('click', onClick, listenerOptions);
      window.removeEventListener('wheel', onWheel, listenerOptions);
      window.removeEventListener('pointermove', onPointerMove, listenerOptions);
      return samples;
    },
    trackUpdate(applied, arrivedAt) {
      if (!recording) return;
      const target = samples;
      void applied.then(afterCurrentFrame).then(() => {
        target.updateLatenciesMs.push(performance.now() - arrivedAt);
      });
    },
  };
}
