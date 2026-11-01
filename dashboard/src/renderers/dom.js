import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { CENTER, LEAFLET_ZOOM } from '../view.js';

const MARKER_SIZE = 8;

/** One Leaflet marker, and so one DOM element, per vehicle. */
export function create({ container }) {
  const map = L.map(container).setView([CENTER.lat, CENTER.lon], LEAFLET_ZOOM);
  const markers = new Map();

  const addMarker = (vehicle) => {
    const marker = L.marker([vehicle.lat, vehicle.lon], {
      keyboard: false,
      icon: L.divIcon({
        className: `vehicle-marker status-${vehicle.status}`,
        iconSize: [MARKER_SIZE, MARKER_SIZE],
      }),
    }).addTo(map);
    markers.set(vehicle.vehicleId, { marker, status: vehicle.status });
  };

  const moveMarker = (entry, vehicle) => {
    entry.marker.setLatLng([vehicle.lat, vehicle.lon]);
    if (entry.status !== vehicle.status) {
      const element = entry.marker.getElement();
      element.classList.replace(`status-${entry.status}`, `status-${vehicle.status}`);
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
  };
}
