import type { Telemetry, VehicleStatus } from '../../shared/telemetry.ts';

export type StatusCounts = Record<VehicleStatus, number>;

export function countByStatus(vehicles: readonly Telemetry[]): StatusCounts {
  const counts: StatusCounts = { moving: 0, stopped: 0, delayed: 0 };
  for (const vehicle of vehicles) counts[vehicle.status]++;
  return counts;
}

const ATTENTION_ORDER: Partial<Record<VehicleStatus, number>> = { delayed: 0, stopped: 1 };

/** Vehicles that are not moving: delayed first, then stopped, each ordered by id. */
export function vehiclesNeedingAttention(vehicles: readonly Telemetry[]): Telemetry[] {
  return vehicles
    .filter((vehicle) => vehicle.status !== 'moving')
    .sort(
      (a, b) =>
        ATTENTION_ORDER[a.status]! - ATTENTION_ORDER[b.status]! ||
        a.vehicleId.localeCompare(b.vehicleId),
    );
}
