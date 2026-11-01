// Usage: node simulator/src/index.js --vehicles 1000 --interval 1000
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import mqtt from 'mqtt';
import { advanceVehicle, createFleet, toTelemetry } from './fleet.js';
import { buildRoute } from './route.js';

const SLOT_MS = 100;

const { values: args } = parseArgs({
  options: {
    vehicles: { type: 'string', default: '100' },
    interval: { type: 'string', default: '1000' },
    seed: { type: 'string', default: '1' },
    broker: { type: 'string', default: 'mqtt://127.0.0.1:1883' },
  },
});
const size = Number(args.vehicles);
const intervalMs = Number(args.interval);

const data = JSON.parse(await readFile(new URL('../data/tampere-routes.json', import.meta.url)));
const routes = data.routes.map((route) => buildRoute(route.coordinates));
const { vehicles, random } = createFleet({ size, routes, seed: Number(args.seed) });

const client = await mqtt.connectAsync(args.broker);

// Vehicles report in evenly spaced slots so the load is spread across the interval.
const slotCount = Math.max(1, Math.round(intervalMs / SLOT_MS));
let slot = 0;

const timer = setInterval(() => {
  const now = Date.now();
  for (let i = slot; i < vehicles.length; i += slotCount) {
    const vehicle = vehicles[i];
    advanceVehicle(vehicle, intervalMs / 1000, random);
    client.publish(`fleet/vehicles/${vehicle.vehicleId}/telemetry`, JSON.stringify(toTelemetry(vehicle, now)));
  }
  slot = (slot + 1) % slotCount;
}, intervalMs / slotCount);

console.log(`Publishing ${size} vehicles every ${intervalMs} ms`);

const shutdown = async () => {
  clearInterval(timer);
  await client.endAsync();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
