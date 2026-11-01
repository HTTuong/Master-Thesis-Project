import type { FleetMessage, Telemetry } from '../../shared/telemetry.ts';
import { createFleetStore } from './fleet-store.ts';

const RECONNECT_DELAY_MS = 1000;

export type ConnectionState = 'connecting' | 'open' | 'closed';

/** When an update was sent by the server (epoch ms) and dispatched in the page (performance time). */
export interface UpdateTiming {
  serverTs: number;
  dispatchedAt: number;
}

type UpdateListener = (changed: Telemetry[], timing: UpdateTiming) => void;

export interface FleetFeed {
  vehicles: ReadonlyMap<string, Telemetry>;
  subscribe(listener: UpdateListener): () => void;
  getConnectionState(): ConnectionState;
  subscribeConnection(listener: () => void): () => void;
}

/**
 * Keeps a WebSocket open to the server. Updates reach subscribers directly, outside
 * React state, so that the map path does not depend on component rendering.
 */
export function createFleetFeed(url: string): FleetFeed {
  const store = createFleetStore();
  const updateListeners = new Set<UpdateListener>();
  const connectionListeners = new Set<() => void>();
  let connectionState: ConnectionState = 'connecting';

  const setConnectionState = (state: ConnectionState) => {
    connectionState = state;
    for (const listener of connectionListeners) listener();
  };

  const connect = () => {
    setConnectionState('connecting');
    const socket = new WebSocket(url);
    socket.addEventListener('open', () => setConnectionState('open'));
    socket.addEventListener('message', (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as FleetMessage;
      const changed = store.apply(message);
      const timing = { serverTs: message.serverTs, dispatchedAt: event.timeStamp };
      for (const listener of updateListeners) listener(changed, timing);
    });
    socket.addEventListener('close', () => {
      setConnectionState('closed');
      setTimeout(connect, RECONNECT_DELAY_MS);
    });
  };
  connect();

  return {
    vehicles: store.vehicles,
    subscribe(listener) {
      updateListeners.add(listener);
      return () => updateListeners.delete(listener);
    },
    getConnectionState: () => connectionState,
    subscribeConnection(listener) {
      connectionListeners.add(listener);
      return () => connectionListeners.delete(listener);
    },
  };
}
