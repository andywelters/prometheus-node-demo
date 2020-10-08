'use strict';

const promClient = require('prom-client'),
      express = require('express'),
      expressPromBundle = require("express-prom-bundle"),
      router = express.Router(),
      bodyParser = require('body-parser');

// define a prometheus Gauge 'client_count'
const clientCountGauge = new promClient.Gauge({
  name: 'client_count',
  help: 'number of clients',
  labelNames: [
    'protocol',
  ]
});

// register metrics collection for all routes
// ... except those starting with /metrics
// and make sure to use json
router.use("/((?!metrics))*", 
  bodyParser.urlencoded({
    extended: true
  }),
  bodyParser.json(),
  expressPromBundle({
    //httpDurationMetricName: 'http_request_duration_seconds',
    includeMethod: true, //default is false
    autoregister: false, //default is true, we handle ourselves
    includePath: true, //default is false
    //metricType: 'histogram', //default
    buckets: [0.003, 0.03, 0.1, 0.3, 1.5, 5, 10, 15, 30, 60], //default: [0.003, 0.03, 0.1, 0.3, 1.5, 10]
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
    customLabels: {/*year: null, */protocol: null},
    transformLabels: (labels,req,res) => {
      let path = req.baseUrl + req.path; // '/admin/new' (full path without query string)
      let pathSegs = path.split('/');
      let protocol = pathSegs[1] || '-';
      if (protocol === 'api') {
        protocol = 'rest';
      }
      Object.assign(labels, {
        //year: new Date().getFullYear(),
        protocol: protocol,
      });
    },
    urlValueParser: {
      minHexLength: 5,
      extraMasks: [
        "^[0-9]+\\.[0-9]+\\.[0-9]+$" // replace dot-separated dates with #val
      ]
    },
    normalizePath: [
      ['^/rest/v1', '/api/v1'], // replace /rest/v1 with /api/v1
    ]
  })
);

router.get('/metrics', async (req, res, next) => {
  try {
    //update the number of websocket clients size
    clientCountGauge.set(
      { protocol: 'ws' },
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

router.get('/oauth/v1', (req, res) => res.json({msg:'oauth response'}));
router.get('/public/v1', (req, res) => res.json({msg:'public response'}));

router.use('/rest/v1', require('./rest/v1/routes'));
router.use('/api/v1', require('./rest/v1/routes'));

module.exports = router;