'use strict';

const promClient = require('prom-client'),
      express = require('express'),
      expressPromBundle = require("express-prom-bundle"),
      router = express.Router();

// define a prometheus Gauge 'client_count'
const clientCountGauge = new promClient.Gauge({
  name: 'client_count',
  help: 'number of clients',
  labelNames: [
    'clientType',
  ]
});

// register metrics collection for all routes
// ... except those starting with /metrics
router.use("/((?!metrics))*", expressPromBundle({
  includeMethod: true, //default is false
  autoregister: false, //default is true, we handle ourselves
  includePath: true, //default is false
  promClient: {
    collectDefaultMetrics: {
      /*
      Default metrics are collected on scrape of metrics endpoint, not on an interval.

      Optionally accepts a config object with following entries:

      prefix - an optional prefix for metric names. Default: no prefix.
      registry - to which metrics should be registered. Default: the global default registry.
      gcDurationBuckets - with custom buckets for GC duration histogram. Default buckets of GC duration histogram are [0.001, 0.01, 0.1, 1, 2, 5] (in seconds).
      eventLoopMonitoringPrecision - with sampling rate in milliseconds. Must be greater than zero. Default: 10.
      */
    }
  },
  customLabels: {year: null},
  transformLabels: labels => Object.assign(labels, {year: new Date().getFullYear()}),
  urlValueParser: {
    minHexLength: 5,
    extraMasks: [
      "^[0-9]+\\.[0-9]+\\.[0-9]+$" // replace dot-separated dates with #val
    ]
  },
  normalizePath: [
    ['^/foo', '/example'] // replace /foo with /example
  ]
}));

router.get('/metrics', async (req, res, next) => {
  try {
    //update the number of websocket clients size
    clientCountGauge.set(
      { clientType: 'ws' },
      req.app.wsServer.clients.size,
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

router.ws('/', function(ws, req) {
  /*ws.on('message', function(msg) {
    console.log(msg);
  });*/
});
  
router.get('/foo/:id', (req, res) => {
  setTimeout(() => {
    res.send('foo response\n');
  }, 500);
});
router.delete('/foo/:id', (req, res) => {
  setTimeout(() => {
    res.send('foo deleted\n');
  }, 300);
});
router.get('/bar', (req, res) => res.send('bar response\n'));

module.exports = router;