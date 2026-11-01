// Precomputes driving routes once, so simulator runs never depend on the network.
// Usage: node simulator/scripts/fetch-routes.ts
import { writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import { createRandom } from '../src/random.ts';

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const OUTPUT = new URL('../data/tampere-routes.json', import.meta.url);
const ROUTE_COUNT = 100;
const SEED = 20261101;
const MIN_LENGTH_M = 2000;
const REQUEST_DELAY_MS = 1100; // Stays under one request per second on the public server.
const AREA = { minLon: 23.6, maxLon: 23.95, minLat: 61.43, maxLat: 61.56 };

interface OsrmResponse {
  code: string;
  routes?: { distance: number; geometry: { coordinates: [number, number][] } }[];
}

const random = createRandom(SEED);
const pickPoint = () => [
  (AREA.minLon + random() * (AREA.maxLon - AREA.minLon)).toFixed(5),
  (AREA.minLat + random() * (AREA.maxLat - AREA.minLat)).toFixed(5),
];

const routes: { lengthM: number; coordinates: number[][] }[] = [];
while (routes.length < ROUTE_COUNT) {
  const url = `${OSRM_URL}/${pickPoint()};${pickPoint()}?overview=full&geometries=geojson`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`OSRM responded with ${response.status}`);
  const body = (await response.json()) as OsrmResponse;
  const route = body.routes?.[0];
  if (body.code === 'Ok' && route && route.distance >= MIN_LENGTH_M) {
    routes.push({
      lengthM: Math.round(route.distance),
      coordinates: route.geometry.coordinates.map(([lon, lat]) => [
        Number(lon.toFixed(5)),
        Number(lat.toFixed(5)),
      ]),
    });
  }
  await sleep(REQUEST_DELAY_MS);
}

await writeFile(
  OUTPUT,
  `${JSON.stringify({
    source: 'OSRM demo server (router.project-osrm.org), driving profile',
    attribution: 'Road data © OpenStreetMap contributors, ODbL',
    fetchedAt: new Date().toISOString(),
    seed: SEED,
    area: AREA,
    routes,
  })}\n`,
);
console.log(`Wrote ${routes.length} routes`);
