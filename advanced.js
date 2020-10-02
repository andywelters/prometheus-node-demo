const promClient = require('prom-client'),
      gcStats = require('prometheus-gc-stats')(),
      express = require('express'),
      app = express(),
      server = require('http').createServer(app),
      expressWs = require('express-ws')(app, server),
      PORT = 9200;

/*
collectDefaultMetrics 

Default metrics are collected on scrape of metrics endpoint, not on an interval.

Optionally accepts a config object with following entries:

prefix - an optional prefix for metric names. Default: no prefix.
registry - to which metrics should be registered. Default: the global default registry.
gcDurationBuckets - with custom buckets for GC duration histogram. Default buckets of GC duration histogram are [0.001, 0.01, 0.1, 1, 2, 5] (in seconds).
eventLoopMonitoringPrecision - with sampling rate in milliseconds. Must be greater than zero. Default: 10.
*/
promClient.collectDefaultMetrics();

/*
Exposes 3 metrics:

nodejs_gc_runs_total: Counts the number of time GC is invoked
nodejs_gc_pause_seconds_total: Time spent in GC in seconds
nodejs_gc_reclaimed_bytes_total: The number of bytes GC has freed
*/
gcStats();

// define a prometheus Gauge 'client_count'
const clientCountGauge = new promClient.Gauge({
  name: 'client_count',
  help: 'number of clients',
  labelNames: [
    'clientType',
  ]
});

app.get('/metrics', async (req, res, next) => {
  try {
    //update the number of websocket clients size
    clientCountGauge.set(
      { clientType: 'ws' },
      expressWs.getWss().clients.size,
    );
    const metrics = await promClient.register.metrics();
    res.set('Content-Type', promClient.register.contentType);
    res.end(metrics);
    next();
  }
  catch(ex) {
    res.statusCode = 500;
		res.send(ex.message);
  }
});

app.ws('/', function(ws, req) {
  /*ws.on('message', function(msg) {
    console.log(msg);
  });*/
});


// WS ping/pong
const heartbeat = ws => {
  ws.isAlive = true;
};

expressWs.getWss().on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', heartbeat.bind(null, ws));
});

const interval = setInterval(() => {
  expressWs.getWss().clients.forEach(ws => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(function noop() {});
  });
}, 30000);

app.wsServer = expressWs.getWss();

server.listen(PORT, '0.0.0.0', () => console.log('App started on port', PORT));

module.exports = app;