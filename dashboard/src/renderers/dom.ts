import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Telemetry, VehicleStatus } from '../../../shared/telemetry.ts';
import { CENTER, LEAFLET_ZOOM } from '../view.ts';
import type { MapRenderer, RendererOptions } from './index.ts';

const MARKER_SIZE = 8;

interface Entry {
  marker: L.Marker;
  status: VehicleStatus;
}

/** One Leaflet marker, and so one DOM element, per vehicle. */
export function create({ container }: RendererOptions): MapRenderer {
  const map = L.map(container).setView([CENTER.lat, CENTER.lon], LEAFLET_ZOOM);
  const markers = new Map<string, Entry>();

  const addMarker = (vehicle: Telemetry) => {
    const marker = L.marker([vehicle.lat, vehicle.lon], {
      keyboard: false,
      icon: L.divIcon({
        className: `vehicle-marker status-${vehicle.status}`,
        iconSize: [MARKER_SIZE, MARKER_SIZE],
      }),
    }).addTo(map);
    markers.set(vehicle.vehicleId, { marker, status: vehicle.status });
  };

  const moveMarker = (entry: Entry, vehicle: Telemetry) => {
    entry.marker.setLatLng([vehicle.lat, vehicle.lon]);
    if (entry.status !== vehicle.status) {
      entry.marker
        .getElement()
        ?.classList.replace(`status-${entry.status}`, `status-${vehicle.status}`);
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
      return Promise.resolve();
    },
    destroy() {
      map.remove();
    },
  };
}
