import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Telemetry, VehicleStatus } from '../../../shared/telemetry.ts';
import { STATUS_COLORS } from '../status-colors.ts';
import { CENTER, LEAFLET_ZOOM, MAP_BACKGROUND, MARKER_RADIUS_PX, nextAnimationFrame } from '../view.ts';
import type { MapRenderer, RendererOptions } from './index.ts';

const MARKER_SIZE = MARKER_RADIUS_PX * 2;

interface Entry {
  marker: L.Marker;
  status: VehicleStatus;
}

/** One Leaflet marker, and so one DOM element, per vehicle. */
export function create({ container, onSelect }: RendererOptions): MapRenderer {
  const map = L.map(container, { zoomControl: false }).setView([CENTER.lat, CENTER.lon], LEAFLET_ZOOM);
  container.style.background = MAP_BACKGROUND;
  const markers = new Map<string, Entry>();
  map.on('click', () => onSelect(null));

  const addMarker = (vehicle: Telemetry) => {
    const marker = L.marker([vehicle.lat, vehicle.lon], {
      keyboard: false,
      icon: L.divIcon({
        className: 'vehicle-marker',
        iconSize: [MARKER_SIZE, MARKER_SIZE],
      }),
    }).addTo(map);
    marker.on('click', () => onSelect(vehicle.vehicleId));
    marker.getElement()!.style.background = STATUS_COLORS[vehicle.status];
    markers.set(vehicle.vehicleId, { marker, status: vehicle.status });
  };

  const moveMarker = (entry: Entry, vehicle: Telemetry) => {
    entry.marker.setLatLng([vehicle.lat, vehicle.lon]);
    if (entry.status !== vehicle.status) {
      entry.marker.getElement()!.style.background = STATUS_COLORS[vehicle.status];
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
