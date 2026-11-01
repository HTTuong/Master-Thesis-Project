const RECONNECT_DELAY_MS = 1000;

/** Keeps a WebSocket open to the server and passes on parsed messages. */
export function connectToFleet({ url, onMessage, onStateChange }) {
  const connect = () => {
    onStateChange('connecting');
    const socket = new WebSocket(url);
    socket.addEventListener('open', () => onStateChange('open'));
    socket.addEventListener('message', (event) => {
      onMessage(JSON.parse(event.data), event.timeStamp);
    });
    socket.addEventListener('close', () => {
      onStateChange('closed');
      setTimeout(connect, RECONNECT_DELAY_MS);
    });
  };
  connect();
}
