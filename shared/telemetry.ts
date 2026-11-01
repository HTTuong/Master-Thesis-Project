export const VEHICLE_STATUSES = ['moving', 'stopped', 'delayed'] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

/** The message a vehicle publishes over MQTT. `ts` is the send time in epoch milliseconds. */
export interface Telemetry {
  vehicleId: string;
  lat: number;
  lon: number;
  status: VehicleStatus;
  ts: number;
}

/** The message the server pushes to browsers over WebSocket. */
export interface FleetMessage {
  type: 'snapshot' | 'batch';
  serverTs: number;
  vehicles: Telemetry[];
}
