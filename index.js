const promClient = require('prom-client');
const express = require('express');
const PORT = 9200;
const INTERVAL = 1000;

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

// define a prometheus registry
const registry = new promClient.Registry();

// define a prometheus Gauge 'client_count' that uses the registry
const gauge = new promClient.Gauge({
  name: 'client_count',
  help: 'number of clients',
  registers: [registry],
  labelNames: [
    'clientType',
  ],
});

// define a prometheus Counter 'client_requests'
const counter = new promClient.Counter({
  name: 'client_requests',
  help: 'number of requests',
  registers: [registry],
  labelNames: [
    'clientType',
  ],
});


// define a prometheus Histogram 'response_time'
const histogram = new promClient.Histogram({
  name: 'response_time',
  help: 'response time',
  registers: [registry],
  labelNames: [
    'clientType',
  ],
  buckets: [0, 10, 20, 30, 40, 50, 60, 70],
});


// define a prometheus Summary on the same 'response_time' info
const summary = new promClient.Summary({
  name: 'response_time_summary',
  help: 'response time summary',
  registers: [registry],
  labelNames: [
    'clientType',
  ],
  //maxAgeSeconds: 30,
  //ageBuckets: 5
});


const summarySliding = new promClient.Summary({
  name: 'response_time_summary_sliding',
  help: 'response time summary sliding',
  registers: [registry],
  labelNames: [
    'clientType',
  ],
  maxAgeSeconds: 30,
  ageBuckets: 5
});



//need to merge registries to report at the /metrics endpoint
//Note: If the same metric name exists in different registries, an error will be thrown
const mergedRegistries = promClient.Registry.merge([registry, promClient.register]);




// update all the metrics every INTERVAL
let clientCount = 100;
let requestCount = 0;
let creep = 0;

setInterval( () => {

  // client count
  clientCount = clientCount + Math.floor(10 * Math.random() - 5);
  console.log('clientCount updated to', clientCount);
  gauge.set(
    { clientType: 'ws' },
    clientCount,
  );

  // client requests
  let inc = Math.floor(Math.random() * 10);
  console.log('clientRequests', inc);
  counter.inc(
    { clientType: 'ws' },
    inc
  );

  // register a response time
  creep = creep + 1;
  let observation =  Math.floor(Math.random() * 100) + creep;
  console.log('responseTime', observation);
  histogram.observe(observation);

  summary.observe(observation);
  summarySliding.observe(observation);

}, INTERVAL);


// create the endpoint that serves up the metrics on PORT
const app = express();

app.get('/metrics', async (req, res, next) => {
  try {
    res.set('Content-Type', registry.contentType);
    res.end(mergedRegistries.metrics());
    next();
  }
  catch(ex) {
    res.statusCode = 500;
		res.send(ex.message);
  }
});

app.listen(PORT, '0.0.0.0', () => console.log('App started on port', PORT, 'at interval', INTERVAL));

