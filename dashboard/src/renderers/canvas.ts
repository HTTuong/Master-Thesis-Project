import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Telemetry, VehicleStatus } from '../../../shared/telemetry.ts';
import { STATUS_COLORS } from '../status-colors.ts';
import { CENTER, LEAFLET_ZOOM, MAP_BACKGROUND, MARKER_RADIUS_PX, nextAnimationFrame } from '../view.ts';
import type { MapRenderer, RendererOptions } from './index.ts';

interface Entry {
  marker: L.CircleMarker;
  status: VehicleStatus;
}

/** All vehicles are drawn on one Leaflet canvas, which redraws at most once per frame. */
export function create({ container }: RendererOptions): MapRenderer {
  const map = L.map(container).setView([CENTER.lat, CENTER.lon], LEAFLET_ZOOM);
  container.style.background = MAP_BACKGROUND;
  const canvas = L.canvas();
  const markers = new Map<string, Entry>();

  const addMarker = (vehicle: Telemetry) => {
    const marker = L.circleMarker([vehicle.lat, vehicle.lon], {
      renderer: canvas,
      radius: MARKER_RADIUS_PX,
      stroke: false,
      fillColor: STATUS_COLORS[vehicle.status],
      fillOpacity: 1,
    }).addTo(map);
    markers.set(vehicle.vehicleId, { marker, status: vehicle.status });
  };

  const moveMarker = (entry: Entry, vehicle: Telemetry) => {
    entry.marker.setLatLng([vehicle.lat, vehicle.lon]);
    if (entry.status !== vehicle.status) {
      entry.marker.setStyle({ fillColor: STATUS_COLORS[vehicle.status] });
      entry.status = vehicle.status;
    }
  };

  return {
    update(vehicles) {
      for (const vehicle of vehicles) {
        const entry = markers.get(vehicle.vehicleId);
        if (entry) moveMarker(entry, vehicle);
        else addMarker(vehicle);
      }
      return nextAnimationFrame();
    },
    destroy() {
      map.remove();
    },
  };
}
