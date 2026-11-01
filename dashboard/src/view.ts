export const CENTER = { lat: 61.495, lon: 23.775 };

// Leaflet tiles are 256 px and MapLibre tiles are 512 px, so MapLibre needs a zoom
// level one lower to show the same scale.
export const LEAFLET_ZOOM = 11;

export const MAP_BACKGROUND = '#e8ebee';
export const MARKER_RADIUS_PX = 4;

/** Resolves inside the next animation frame, after callbacks that were already queued. */
export const nextAnimationFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
