import type { Telemetry, VehicleStatus } from '../../shared/telemetry.ts';

export type StatusCounts = Record<VehicleStatus, number>;

export function countByStatus(vehicles: readonly Telemetry[]): StatusCounts {
  const counts: StatusCounts = { moving: 0, stopped: 0, delayed: 0 };
  for (const vehicle of vehicles) counts[vehicle.status]++;
  return counts;
}
