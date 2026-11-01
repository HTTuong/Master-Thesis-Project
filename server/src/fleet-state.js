const isValid = (message) =>
  typeof message?.vehicleId === 'string' &&
  Number.isFinite(message.lat) &&
  Number.isFinite(message.lon) &&
  typeof message.status === 'string' &&
  Number.isFinite(message.ts);

/** Latest known state per vehicle, plus the set of vehicles changed since the last batch. */
export function createFleetState() {
  const latest = new Map();
  const changed = new Set();

  return {
    /** Stores a message unless it is malformed or older than what is already known. */
    ingest(message) {
      if (!isValid(message)) return false;
      const known = latest.get(message.vehicleId);
      if (known && known.ts > message.ts) return false;
      latest.set(message.vehicleId, message);
      changed.add(message.vehicleId);
      return true;
    },
    /** Returns the vehicles changed since the previous call. */
    takeChanged() {
      const vehicles = Array.from(changed, (id) => latest.get(id));
      changed.clear();
      return vehicles;
    },
    snapshot() {
      return Array.from(latest.values());
    },
  };
}
