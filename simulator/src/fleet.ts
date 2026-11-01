import type { Telemetry, VehicleStatus } from '../../shared/telemetry.ts';
import { createRandom, type Random } from './random.ts';
import { positionAt, type Route } from './route.ts';

const MIN_SPEED_MPS = 8; // about 30 km/h
const MAX_SPEED_MPS = 22; // about 80 km/h
const DELAYED_SPEED_FACTOR = 0.5;

// Mean time a vehicle stays in each status, and where it goes next.
const STATUS_MODEL: Record<VehicleStatus, { meanSeconds: number; next: VehicleStatus[] }> = {
  moving: { meanSeconds: 300, next: ['stopped', 'delayed'] },
  stopped: { meanSeconds: 60, next: ['moving'] },
  delayed: { meanSeconds: 120, next: ['moving'] },
};

export interface Vehicle {
  vehicleId: string;
  route: Route;
  distance: number;
  speedMps: number;
  status: VehicleStatus;
}

export function createFleet(options: { size: number; routes: Route[]; seed: number }): {
  vehicles: Vehicle[];
  random: Random;
} {
  const { size, routes, seed } = options;
  const random = createRandom(seed);
  const vehicles: Vehicle[] = [];
  for (let i = 0; i < size; i++) {
    const route = routes[i % routes.length]!;
    vehicles.push({
      vehicleId: `v${String(i + 1).padStart(5, '0')}`,
      route,
      distance: random() * 2 * route.length,
      speedMps: MIN_SPEED_MPS + random() * (MAX_SPEED_MPS - MIN_SPEED_MPS),
      status: 'moving',
    });
  }
  return { vehicles, random };
}

export function advanceVehicle(vehicle: Vehicle, seconds: number, random: Random): void {
  const { meanSeconds, next } = STATUS_MODEL[vehicle.status];
  if (random() < seconds / meanSeconds) {
    vehicle.status = next[Math.floor(random() * next.length)]!;
  }

  if (vehicle.status === 'moving') vehicle.distance += vehicle.speedMps * seconds;
  else if (vehicle.status === 'delayed') {
    vehicle.distance += vehicle.speedMps * DELAYED_SPEED_FACTOR * seconds;
  }
}

/** Builds the message a vehicle publishes. */
export function toTelemetry(vehicle: Vehicle, ts: number): Telemetry {
  const { lat, lon } = positionAt(vehicle.route, vehicle.distance);
  return { vehicleId: vehicle.vehicleId, lat, lon, status: vehicle.status, ts };
}
