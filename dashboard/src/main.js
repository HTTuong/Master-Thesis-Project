import { connectToFleet } from './fleet-connection.js';
import { createFleetStore } from './fleet-store.js';

const params = new URLSearchParams(location.search);
const serverUrl = params.get('ws') ?? 'ws://127.0.0.1:8080';

const connectionLabels = { connecting: 'Connecting', open: 'Connected', closed: 'Disconnected' };
const connection = document.querySelector('#connection');
const vehicleCount = document.querySelector('#vehicle-count');

const store = createFleetStore();

connectToFleet({
  url: serverUrl,
  onMessage(message) {
    store.apply(message);
    vehicleCount.textContent = `${store.vehicles.size} vehicles`;
  },
  onStateChange(state) {
    connection.dataset.state = state;
    connection.textContent = connectionLabels[state];
  },
});
