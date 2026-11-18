# Fleet map rendering

A real-time fleet monitoring dashboard used to compare map rendering approaches while vehicle positions update continuously.

Requires Node.js 24 or newer.

```sh
npm install
npm test
```

## Running the pipeline

Install [Eclipse Mosquitto](https://mosquitto.org/download/), then start the broker:

```sh
npm run broker
```

In a second terminal, publish a simulated fleet (`--vehicles`, `--interval` in ms, `--seed`):

```sh
npm run simulator -- --vehicles 1000 --interval 1000
```

In a third terminal, start the server that pushes updates over WebSocket (`--port`, `--flush` in ms):

```sh
npm run server
```

In a fourth terminal, start the dashboard and open the URL it prints:

```sh
npm run dashboard
```

Choose the map renderer with `?renderer=dom`, `?renderer=canvas` or `?renderer=webgl`. For overhead checks only, `?panels=off` leaves the side panel empty.

## Running the benchmark

Install the browser once, then run the scenario matrix. The benchmark starts every component itself, so stop any pipeline you started by hand. See `bench/src/run.ts` for all options.

```sh
npx playwright install chromium
npm run bench -- --out results/raw/my-run
```

## Analyzing the results

The analysis reads one benchmark output folder and writes per-run and per-scenario tables (CSV), a markdown report with threshold crossings and data-quality checks, and one SVG figure per metric. A second folder with the same scenarios, for example runs in a visible browser window, can be compared with `--compare`.

```sh
npm run analyze -- --runs results/raw/my-run --out results/analysis/my-run
npm run analyze -- --runs results/raw/my-run --compare results/raw/my-headed-run --out results/analysis/compare
```
