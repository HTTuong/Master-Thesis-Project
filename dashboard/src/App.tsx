import { useState } from 'react';
import { ConnectionStatus } from './components/ConnectionStatus.tsx';
import { FleetMap } from './components/FleetMap.tsx';
import { KpiTiles } from './components/KpiTiles.tsx';
import { SelectedVehicle } from './components/SelectedVehicle.tsx';
import { StatusList } from './components/StatusList.tsx';
import { StatusTimeSeries } from './components/StatusTimeSeries.tsx';
import type { FleetFeed } from './fleet-feed.ts';
import { countByStatus } from './fleet-summary.ts';
import { useFleetSnapshot } from './hooks/useFleetSnapshot.ts';
import type { RendererName } from './renderers/index.ts';

interface AppProps {
  feed: FleetFeed;
  rendererName: RendererName;
}

export function App({ feed, rendererName }: AppProps) {
  const vehicles = useFleetSnapshot(feed);
  const counts = countByStatus(vehicles);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = selectedId === null ? undefined : feed.vehicles.get(selectedId);

  return (
    <main className="layout">
      <FleetMap feed={feed} rendererName={rendererName} onSelect={setSelectedId} />
      <aside className="panel">
        <h1>Fleet monitor</h1>
        <ConnectionStatus feed={feed} />
        <KpiTiles total={vehicles.length} counts={counts} />
        <SelectedVehicle vehicle={selected} />
        <StatusTimeSeries counts={counts} refreshKey={vehicles} />
        <StatusList vehicles={vehicles} />
        <footer className="attribution">Road data © OpenStreetMap contributors</footer>
      </aside>
    </main>
  );
}
