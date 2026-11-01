import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import { createFleetFeed } from './fleet-feed.ts';
import { isRendererName } from './renderers/index.ts';
import './styles.css';

const params = new URLSearchParams(location.search);
const rendererName = params.get('renderer') ?? 'dom';
if (!isRendererName(rendererName)) throw new Error(`Unknown renderer "${rendererName}"`);

const feed = createFleetFeed(params.get('ws') ?? 'ws://127.0.0.1:8080');

createRoot(document.querySelector('#root')!).render(
  <StrictMode>
    <App feed={feed} rendererName={rendererName} />
  </StrictMode>,
);
