import type { Telemetry } from '../../../shared/telemetry.ts';

export interface MapRenderer {
  /** Applies changed vehicles. Resolves inside the animation frame that draws the change. */
  update(vehicles: Iterable<Telemetry>): Promise<void>;
  destroy(): void;
}

export interface RendererOptions {
  container: HTMLElement;
  /** Called with the clicked vehicle's id, or null when the click hit no vehicle. */
  onSelect(vehicleId: string | null): void;
}

type RendererModule = { create(options: RendererOptions): MapRenderer | Promise<MapRenderer> };

// Each renderer is loaded on demand, so a page only contains the library it measures.
const loaders = {
  dom: (): Promise<RendererModule> => import('./dom.ts'),
  canvas: (): Promise<RendererModule> => import('./canvas.ts'),
  webgl: (): Promise<RendererModule> => import('./webgl.ts'),
};

export type RendererName = keyof typeof loaders;

export const isRendererName = (name: string): name is RendererName => name in loaders;

export async function createRenderer(name: RendererName, options: RendererOptions) {
  const { create } = await loaders[name]();
  return create(options);
}
