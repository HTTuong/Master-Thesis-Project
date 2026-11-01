// Usage: node server/src/index.js --port 8080 --flush 100
import { parseArgs } from 'node:util';
import mqtt from 'mqtt';
import { createFleetState } from './fleet-state.js';
import { startPushServer } from './push-server.js';

const TELEMETRY_TOPIC = 'fleet/vehicles/+/telemetry';

const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '8080' },
    flush: { type: 'string', default: '100' },
    broker: { type: 'string', default: 'mqtt://127.0.0.1:1883' },
  },
});

const state = createFleetState();
const client = await mqtt.connectAsync(args.broker);

client.on('message', (_topic, payload) => {
  try {
    state.ingest(JSON.parse(payload));
  } catch {
    // A payload that is not JSON is dropped, like any other malformed message.
  }
});
await client.subscribeAsync(TELEMETRY_TOPIC);

const server = startPushServer({ state, port: Number(args.port), flushMs: Number(args.flush) });
console.log(`Pushing updates on ws://127.0.0.1:${args.port} every ${args.flush} ms`);

const shutdown = async () => {
  await server.close();
  await client.endAsync();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
