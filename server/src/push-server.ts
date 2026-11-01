import { WebSocket, WebSocketServer } from 'ws';
import type { FleetMessage } from '../../shared/telemetry.ts';
import type { FleetState } from './fleet-state.ts';

const encode = (message: FleetMessage) => JSON.stringify(message);

/**
 * Sends a snapshot to each new client, then a batch of the changed vehicles
 * every flushMs. Each message records the server time at which it was sent.
 */
export function startPushServer(options: { state: FleetState; port: number; flushMs: number }) {
  const { state, port, flushMs } = options;
  const wss = new WebSocketServer({ port, host: '127.0.0.1' });

  wss.on('connection', (socket) => {
    socket.send(encode({ type: 'snapshot', serverTs: Date.now(), vehicles: state.snapshot() }));
  });

  const timer = setInterval(() => {
    const vehicles = state.takeChanged();
    if (vehicles.length === 0) return;
    const payload = encode({ type: 'batch', serverTs: Date.now(), vehicles });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }, flushMs);

  return {
    wss,
    close() {
      clearInterval(timer);
      for (const client of wss.clients) client.terminate();
      return new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}
