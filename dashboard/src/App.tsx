import { ConnectionStatus } from './components/ConnectionStatus.tsx';
import { FleetMap } from './components/FleetMap.tsx';
import type { FleetFeed } from './fleet-feed.ts';
import { useFleetSnapshot } from './hooks/useFleetSnapshot.ts';
import type { RendererName } from './renderers/index.ts';

interface AppProps {
  feed: FleetFeed;
  rendererName: RendererName;
}

export function App({ feed, rendererName }: AppProps) {
  const vehicles = useFleetSnapshot(feed);

  return (
    <main className="layout">
      <FleetMap feed={feed} rendererName={rendererName} />
      <aside className="panel">
        <h1>Fleet monitor</h1>
        <ConnectionStatus feed={feed} />
        <p>{vehicles.length} vehicles</p>
      </aside>
    </main>
  );
}
