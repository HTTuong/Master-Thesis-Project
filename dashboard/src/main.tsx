import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { createFleetFeed } from './fleet-feed.ts';
import { createMetricsCollector, type MetricsCollector } from './metrics/collector.ts';
import { isRendererName } from './renderers/index.ts';
import './styles.css';

const params = new URLSearchParams(location.search);
const rendererName = params.get('renderer') ?? 'dom';
if (!isRendererName(rendererName)) throw new Error(`Unknown renderer "${rendererName}"`);

declare global {
  interface Window {
    fleetMetrics?: MetricsCollector;
  }
}

// The collector exists only for measurement runs, and the page starts and stops it from outside.
const metrics = params.has('metrics') ? createMetricsCollector() : undefined;
window.fleetMetrics = metrics;

const feed = createFleetFeed(params.get('ws') ?? 'ws://127.0.0.1:8080');

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App
      feed={feed}
      rendererName={rendererName}
      metrics={metrics}
      showPanels={params.get('panels') !== 'off'}
    />
  </StrictMode>,
);
