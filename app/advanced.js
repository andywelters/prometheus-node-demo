'use strict';

const promClient = require('prom-client'),
      gcStats = require('prometheus-gc-stats')(),
      express = require('express'),
      helmet = require('helmet'),
      cors = require('cors'),
      qs = require('qs'),
      app = express(),
      server = require('http').createServer(app),
      expressWs = require('express-ws')(app, server),
      PORT = 9200;
      
/*
Static labels may be applied to every metric emitted by a registry

This will output metrics in the following way:

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes{serviceName="api-v1"} 33853440 1498510040309
*/
promClient.register.setDefaultLabels({ "application:ipdapi" : true });

/*
Exposes 3 metrics:

nodejs_gc_runs_total: Counts the number of time GC is invoked
nodejs_gc_pause_seconds_total: Time spent in GC in seconds
nodejs_gc_reclaimed_bytes_total: The number of bytes GC has freed
*/
gcStats();

// Modify default query string parsing - must be set before any app.use() call due to an express bug
app.set('query parser', function(str) {
  return qs.parse(str, {
    strictNullHandling: true
  });
});

// app.use
app.use(cors());
app.use(helmet());

// Main route entry point
app.use('/', require('./routes'));

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