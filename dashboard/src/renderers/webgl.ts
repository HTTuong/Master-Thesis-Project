import type { Feature, FeatureCollection, Point } from 'geojson';
import {
  Map as MapLibreMap,
  setWorkerUrl,
  type ExpressionSpecification,
  type GeoJSONSource,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import { VEHICLE_STATUSES } from '../../../shared/telemetry.ts';
import { STATUS_COLORS } from '../status-colors.ts';
import { CENTER, LEAFLET_ZOOM, MAP_BACKGROUND, MARKER_RADIUS_PX } from '../view.ts';
import type { MapRenderer, RendererOptions } from './index.ts';

const SOURCE_ID = 'vehicles';

setWorkerUrl(workerUrl);

type Pending = () => void;

/**
 * All vehicles are drawn by MapLibre from one GeoJSON source. Source updates are
 * processed in a worker, so at most one runs at a time. Updates that arrive during
 * that time are combined into the next one, and each promise resolves in the frame
 * that actually draws its change.
 */
export async function create({ container }: RendererOptions): Promise<MapRenderer> {
  const map = new MapLibreMap({
    container,
    center: [CENTER.lon, CENTER.lat],
    zoom: LEAFLET_ZOOM - 1,
    style: {
      version: 8,
      sources: {},
      layers: [
        { id: 'background', type: 'background', paint: { 'background-color': MAP_BACKGROUND } },
      ],
    },
  });
  await map.once('load');

  map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  map.addLayer({
    id: SOURCE_ID,
    type: 'circle',
    source: SOURCE_ID,
    paint: {
      'circle-radius': MARKER_RADIUS_PX,
      'circle-color': [
        'match',
        ['get', 'status'],
        ...VEHICLE_STATUSES.flatMap((status) => [status, STATUS_COLORS[status]]),
        STATUS_COLORS.moving,
      ] as unknown as ExpressionSpecification,
    },
  });
  const source = map.getSource<GeoJSONSource>(SOURCE_ID)!;

  const features = new Map<string, Feature<Point>>();
  let waiting: Pending[] = [];
  let inFlight: Pending[] = [];

  const flush = () => {
    if (inFlight.length > 0 || waiting.length === 0) return;
    inFlight = waiting;
    waiting = [];
    const data: FeatureCollection<Point> = {
      type: 'FeatureCollection',
      features: [...features.values()],
    };
    void source.setData(data);
  };

  map.on('sourcedata', (event) => {
    if (event.sourceId !== SOURCE_ID || inFlight.length === 0) return;
    if (!map.isSourceLoaded(SOURCE_ID)) return;
    const done = inFlight;
    inFlight = [];
    map.once('render', () => {
      for (const resolve of done) resolve();
      flush();
    });
    map.triggerRepaint();
  });

  return {
    update(vehicles) {
      for (const vehicle of vehicles) {
        features.set(vehicle.vehicleId, {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [vehicle.lon, vehicle.lat] },
          properties: { vehicleId: vehicle.vehicleId, status: vehicle.status },
        });
      }
      return new Promise((resolve) => {
        waiting.push(resolve);
        flush();
      });
    },
    destroy() {
      map.remove();
    },
  };
}
