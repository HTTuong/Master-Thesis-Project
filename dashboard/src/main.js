import { connectToFleet } from './fleet-connection.js';
import { createFleetStore } from './fleet-store.js';
import { createRenderer } from './renderers/index.js';

const params = new URLSearchParams(location.search);
const serverUrl = params.get('ws') ?? 'ws://127.0.0.1:8080';
const rendererName = params.get('renderer') ?? 'dom';

const connectionLabels = { connecting: 'Connecting', open: 'Connected', closed: 'Disconnected' };
const connection = document.querySelector('#connection');
const vehicleCount = document.querySelector('#vehicle-count');

const store = createFleetStore();
const renderer = await createRenderer(rendererName, {
  container: document.querySelector('#map'),
});

connectToFleet({
  url: serverUrl,
  onMessage(message) {
    renderer.update(store.apply(message));
    vehicleCount.textContent = `${store.vehicles.size} vehicles`;
  },
  onStateChange(state) {
    connection.dataset.state = state;
    connection.textContent = connectionLabels[state];
  },
});
