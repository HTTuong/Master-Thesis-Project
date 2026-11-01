import type { Telemetry } from '../../../shared/telemetry.ts';

export interface MapRenderer {
  /** Applies changed vehicles. Resolves once the change will be in the next painted frame. */
  update(vehicles: Iterable<Telemetry>): Promise<void>;
  destroy(): void;
}

export interface RendererOptions {
  container: HTMLElement;
}

type RendererModule = { create(options: RendererOptions): MapRenderer | Promise<MapRenderer> };

// Each renderer is loaded on demand, so a page only contains the library it measures.
const loaders = {
  dom: (): Promise<RendererModule> => import('./dom.ts'),
};

export type RendererName = keyof typeof loaders;

export const isRendererName = (name: string): name is RendererName => name in loaders;

export async function createRenderer(name: RendererName, options: RendererOptions) {
  const { create } = await loaders[name]();
  return create(options);
}
