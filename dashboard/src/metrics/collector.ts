export interface MetricsSamples {
  frameTimesMs: number[];
}

export interface MetricsCollector {
  start(): void;
  stop(): MetricsSamples;
}

/** Records samples only between start() and stop(), so warm-up can be excluded. */
export function createMetricsCollector(): MetricsCollector {
  let samples: MetricsSamples = { frameTimesMs: [] };
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
      samples = { frameTimesMs: [] };
      startFrameLoop();
    },
    stop() {
      cancelAnimationFrame(frameRequest);
      return samples;
    },
  };
}
