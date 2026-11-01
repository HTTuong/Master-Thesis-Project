import type { Telemetry } from '../../../shared/telemetry.ts';
import { STATUS_COLORS } from '../status-colors.ts';
import { StatusLabel } from './StatusLabel.tsx';

export function SelectedVehicle({ vehicle }: { vehicle: Telemetry | undefined }) {
  if (!vehicle) {
    return (
      <section className="selected-vehicle">
        <h2>Selected vehicle</h2>
        <p>Click a vehicle on the map.</p>
      </section>
    );
  }

  return (
    <section className="selected-vehicle">
      <h2>Selected vehicle</h2>
      <dl>
        <dt>{vehicle.vehicleId}</dt>
        <dd>
          <StatusLabel status={vehicle.status} color={STATUS_COLORS[vehicle.status]} />
        </dd>
        <dt>Position</dt>
        <dd>
          {vehicle.lat.toFixed(5)}, {vehicle.lon.toFixed(5)}
        </dd>
      </dl>
    </section>
  );
}
