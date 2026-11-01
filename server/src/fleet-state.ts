import { VEHICLE_STATUSES, type Telemetry, type VehicleStatus } from '../../shared/telemetry.ts';

const isTelemetry = (message: unknown): message is Telemetry => {
  const m = message as Partial<Telemetry> | null;
  return (
    typeof m?.vehicleId === 'string' &&
    Number.isFinite(m.lat) &&
    Number.isFinite(m.lon) &&
    VEHICLE_STATUSES.includes(m.status as VehicleStatus) &&
    Number.isFinite(m.ts)
  );
};

export interface FleetState {
  ingest(message: unknown): boolean;
  takeChanged(): Telemetry[];
  snapshot(): Telemetry[];
}

/** Latest known state per vehicle, plus the set of vehicles changed since the last batch. */
export function createFleetState(): FleetState {
  const latest = new Map<string, Telemetry>();
  const changed = new Set<string>();

  return {
    /** Stores a message unless it is malformed or older than what is already known. */
    ingest(message) {
      if (!isTelemetry(message)) return false;
      const known = latest.get(message.vehicleId);
      if (known && known.ts > message.ts) return false;
      latest.set(message.vehicleId, message);
      changed.add(message.vehicleId);
      return true;
    },
    /** Returns the vehicles changed since the previous call. */
    takeChanged() {
      const vehicles = Array.from(changed, (id) => latest.get(id)!);
      changed.clear();
      return vehicles;
    },
    snapshot() {
      return Array.from(latest.values());
    },
  };
}
