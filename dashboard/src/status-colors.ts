import type { VehicleStatus } from '../../shared/telemetry.ts';

export const STATUS_COLORS: Record<VehicleStatus, string> = {
  moving: '#0ca30c',
  stopped: '#6f7780',
  delayed: '#ec835a',
};
