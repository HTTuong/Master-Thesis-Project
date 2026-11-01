import { positionAt } from './route.js';
import { createRandom } from './random.js';

const MIN_SPEED_MPS = 8; // about 30 km/h
const MAX_SPEED_MPS = 22; // about 80 km/h

export function createFleet({ size, routes, seed }) {
  const random = createRandom(seed);
  const vehicles = [];
  for (let i = 0; i < size; i++) {
    const route = routes[i % routes.length];
    vehicles.push({
      vehicleId: `v${String(i + 1).padStart(5, '0')}`,
      route,
      distance: random() * 2 * route.length,
      speedMps: MIN_SPEED_MPS + random() * (MAX_SPEED_MPS - MIN_SPEED_MPS),
    });
  }
  return { vehicles, random };
}

export function advanceVehicle(vehicle, seconds) {
  vehicle.distance += vehicle.speedMps * seconds;
}

/** Builds the message a vehicle publishes. */
export function toTelemetry(vehicle, ts) {
  const { lat, lon } = positionAt(vehicle.route, vehicle.distance);
  return { vehicleId: vehicle.vehicleId, lat, lon, ts };
}
