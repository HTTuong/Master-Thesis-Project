export interface MetricsSamples {
  frameTimesMs: number[];
  updateLatenciesMs: number[];
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

const emptySamples = (): MetricsSamples => ({ frameTimesMs: [], updateLatenciesMs: [] });

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

  return {
    start() {
      samples = emptySamples();
      recording = true;
      startFrameLoop();
    },
    stop() {
      recording = false;
      cancelAnimationFrame(frameRequest);
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
