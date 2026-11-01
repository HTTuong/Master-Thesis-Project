import { WebSocket, WebSocketServer } from 'ws';

/**
 * Sends a snapshot to each new client, then a batch of the changed vehicles
 * every flushMs. Each message records the server time at which it was sent.
 */
export function startPushServer({ state, port, flushMs }) {
  const wss = new WebSocketServer({ port, host: '127.0.0.1' });

  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({ type: 'snapshot', serverTs: Date.now(), vehicles: state.snapshot() }),
    );
  });

  const timer = setInterval(() => {
    const vehicles = state.takeChanged();
    if (vehicles.length === 0) return;
    const payload = JSON.stringify({ type: 'batch', serverTs: Date.now(), vehicles });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) client.send(payload);
    }
  }, flushMs);

  return {
    wss,
    close() {
      clearInterval(timer);
      for (const client of wss.clients) client.terminate();
      return new Promise((resolve) => wss.close(resolve));
    },
  };
}
