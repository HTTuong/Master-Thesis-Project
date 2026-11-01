import type { MetricsCollector } from '../../dashboard/src/metrics/collector.ts';

declare global {
  interface Window {
    fleetMetrics?: MetricsCollector;
  }
}
