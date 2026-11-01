import { useEffect, useState } from 'react';
import type { Telemetry } from '../../../shared/telemetry.ts';
import type { FleetFeed } from '../fleet-feed.ts';

const REFRESH_MS = 1000;

/** Copies the fleet into React state once per second, for the supporting views. */
export function useFleetSnapshot(feed: FleetFeed): Telemetry[] {
  const [vehicles, setVehicles] = useState<Telemetry[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setVehicles([...feed.vehicles.values()]), REFRESH_MS);
    return () => clearInterval(timer);
  }, [feed]);

  return vehicles;
}
