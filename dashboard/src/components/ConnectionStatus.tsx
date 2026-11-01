import { useSyncExternalStore } from 'react';
import type { ConnectionState, FleetFeed } from '../fleet-feed.ts';

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  open: 'Connected',
  closed: 'Disconnected',
};

export function ConnectionStatus({ feed }: { feed: FleetFeed }) {
  const state = useSyncExternalStore(feed.subscribeConnection, feed.getConnectionState);
  return (
    <p className="connection" data-state={state}>
      {LABELS[state]}
    </p>
  );
}
