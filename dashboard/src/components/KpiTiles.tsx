import { VEHICLE_STATUSES } from '../../../shared/telemetry.ts';
import type { StatusCounts } from '../fleet-summary.ts';
import { STATUS_COLORS } from '../status-colors.ts';
import { StatusLabel } from './StatusLabel.tsx';

export function KpiTiles({ total, counts }: { total: number; counts: StatusCounts }) {
  return (
    <dl className="kpis">
      <div className="kpi">
        <dt>Vehicles</dt>
        <dd>{total.toLocaleString('en-US')}</dd>
      </div>
      {VEHICLE_STATUSES.map((status) => (
        <div className="kpi" key={status}>
          <dt>
            <StatusLabel status={status} color={STATUS_COLORS[status]} />
          </dt>
          <dd>{counts[status].toLocaleString('en-US')}</dd>
        </div>
      ))}
    </dl>
  );
}
