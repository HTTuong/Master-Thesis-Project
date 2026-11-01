import type { Telemetry } from '../../../shared/telemetry.ts';
import { vehiclesNeedingAttention } from '../fleet-summary.ts';
import { STATUS_COLORS } from '../status-colors.ts';
import { StatusLabel } from './StatusLabel.tsx';

// The list is capped, so its cost does not grow with the fleet size under test.
const MAX_ROWS = 50;

export function StatusList({ vehicles }: { vehicles: readonly Telemetry[] }) {
  const attention = vehiclesNeedingAttention(vehicles);
  const rows = attention.slice(0, MAX_ROWS);

  return (
    <section className="status-list">
      <h2>
        Needs attention <small>showing {rows.length} of {attention.length}</small>
      </h2>
      <ul>
        {rows.map((vehicle) => (
          <li key={vehicle.vehicleId}>
            <span>{vehicle.vehicleId}</span>
            <StatusLabel status={vehicle.status} color={STATUS_COLORS[vehicle.status]} />
          </li>
        ))}
      </ul>
    </section>
  );
}
