export type Coordinate = [lon: number, lat: number];

export interface Route {
  coordinates: Coordinate[];
  cumulative: number[];
  length: number;
}

const EARTH_RADIUS_M = 6371000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function haversineMeters([lon1, lat1]: Coordinate, [lon2, lat2]: Coordinate): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

/** Prepares a [lon, lat] polyline for lookups by distance along the line. */
export function buildRoute(coordinates: Coordinate[]): Route {
  if (coordinates.length < 2) throw new Error('A route needs at least two coordinates');
  const cumulative = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const segment = haversineMeters(coordinates[i - 1]!, coordinates[i]!);
    cumulative.push(cumulative[i - 1]! + segment);
  }
  const length = cumulative.at(-1)!;
  if (length === 0) throw new Error('A route must have a non-zero length');
  return { coordinates, cumulative, length };
}

/**
 * Returns the position at a travelled distance. A vehicle reaching the end of
 * the route turns back, so any non-negative distance maps onto the line.
 */
export function positionAt(route: Route, distance: number): { lat: number; lon: number } {
  const { coordinates, cumulative, length } = route;
  const wrapped = distance % (2 * length);
  const along = wrapped <= length ? wrapped : 2 * length - wrapped;

  let low = 0;
  let high = cumulative.length - 1;
  while (high - low > 1) {
    const mid = (low + high) >> 1;
    if (cumulative[mid]! <= along) low = mid;
    else high = mid;
  }

  const start = cumulative[low]!;
  const segment = cumulative[high]! - start;
  const t = segment === 0 ? 0 : (along - start) / segment;
  const [lon1, lat1] = coordinates[low]!;
  const [lon2, lat2] = coordinates[high]!;
  return { lat: lat1 + (lat2 - lat1) * t, lon: lon1 + (lon2 - lon1) * t };
}
