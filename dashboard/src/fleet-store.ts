import type { FleetMessage, Telemetry } from '../../shared/telemetry.ts';

/** The browser's copy of the fleet. Applies snapshot and batch messages from the server. */
export function createFleetStore() {
  const vehicles = new Map<string, Telemetry>();

  return {
    vehicles,
    apply(message: FleetMessage): Telemetry[] {
      if (message.type === 'snapshot') vehicles.clear();
      for (const vehicle of message.vehicles) vehicles.set(vehicle.vehicleId, vehicle);
      return message.vehicles;
    },
  };
}
