// Each renderer is loaded on demand, so a page only contains the library it measures.
const loaders = {
  dom: () => import('./dom.js'),
};

export const RENDERERS = Object.keys(loaders);

/**
 * Every renderer exposes the same interface:
 *   update(vehicles): applies changed vehicles. The returned promise resolves once
 *   the change will be included in the next painted frame.
 */
export async function createRenderer(name, options) {
  const load = loaders[name];
  if (!load) throw new Error(`Unknown renderer "${name}". Use one of: ${RENDERERS.join(', ')}`);
  const { create } = await load();
  return create(options);
}
