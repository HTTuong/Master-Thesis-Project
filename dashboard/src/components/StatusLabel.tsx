import type { VehicleStatus } from '../../../shared/telemetry.ts';

const LABELS: Record<VehicleStatus, string> = {
  moving: 'Moving',
  stopped: 'Stopped',
  delayed: 'Delayed',
};

/** A status is always shown as a colored dot with text, never by color alone. */
export function StatusLabel({ status, color }: { status: VehicleStatus; color: string }) {
  return (
    <span className="status-label">
      <span className="status-dot" style={{ background: color }} />
      {LABELS[status]}
    </span>
  );
}
