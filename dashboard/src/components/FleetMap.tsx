import { useEffect, useRef } from 'react';
import type { FleetFeed } from '../fleet-feed.ts';
import type { MetricsCollector } from '../metrics/collector.ts';
import { createRenderer, type MapRenderer, type RendererName } from '../renderers/index.ts';

interface FleetMapProps {
  feed: FleetFeed;
  rendererName: RendererName;
  metrics: MetricsCollector | undefined;
  onSelect(vehicleId: string | null): void;
}

/**
 * React owns only the container. The renderer receives updates straight from the
 * feed, so marker updates never go through React state or reconciliation.
 */
export function FleetMap({ feed, rendererName, metrics, onSelect }: FleetMapProps) {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    let renderer: MapRenderer | undefined;
    let unsubscribe: (() => void) | undefined;

    void createRenderer(rendererName, { container: containerRef.current!, onSelect }).then((created) => {
      if (cancelled) {
        created.destroy();
        return;
      }
      renderer = created;
      void created.update(feed.vehicles.values());
      unsubscribe = feed.subscribe((changed, timing) => {
        const applied = created.update(changed);
        metrics?.trackUpdate(applied, timing, changed.length);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      renderer?.destroy();
    };
  }, [feed, rendererName, metrics, onSelect]);

  return <section ref={containerRef} className="map" aria-label="Fleet map" />;
}
