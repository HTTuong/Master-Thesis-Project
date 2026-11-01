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
