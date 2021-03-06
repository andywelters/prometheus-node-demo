'use strict';

const promClient = require('prom-client'),
      gcStats = require('prometheus-gc-stats')(),
      bodyParser = require('body-parser'),
      expressPromBundle = require("express-prom-bundle"),
      cluster = require('cluster'),
      messageTypes = require('./message-types'),
      WSMetrics = require('./metrics/ws'),
      CLUSTER_METRICS_TIMEOUT = 10000;

let awaitingClusterMetrics = null;

function getClusterMetrics() {
  if (awaitingClusterMetrics) {
    // Already awaiting cluster metrics
    return awaitingClusterMetrics;
  }

  function handler(resolve, reject) {
    return function(msg) {
      if (msg.type && msg.data) {
        switch (msg.type) {
          case messageTypes.POST_CLUSTER_METRICS:
            resolve(msg.data);
            break;
        }
      }
    };
  }

  let handlerInst;
  awaitingClusterMetrics = new Promise((resolve, reject) => {
      handlerInst = handler(resolve, reject);
      // Receive message from the master process
      process.on('message', handlerInst);

      // Send message to master process.
      process.send({
        type: messageTypes.GET_CLUSTER_METRICS
      });
    })
    .timeout(CLUSTER_METRICS_TIMEOUT)
    .catch(Promise.TimeoutError, e => {
      throw new Error('Get Cluster Metrics Timed Out.');
    })
    .finally(() => {
      process.removeListener('message', handlerInst);
      awaitingClusterMetrics = null;
    });
  return awaitingClusterMetrics;
}

/*
Static labels may be applied to every metric emitted by a registry

This will output metrics in the following way (as an example):

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes{application:ipdapi="true"} 33853440 1498510040309
*/
promClient.register.setDefaultLabels({ "application:ipdapi": true });

/*
Static labels may be applied to every worker metric emitted by a registry
This allows for having a copy of the aggregated metric with labels and worker specific ones

This will output metrics in the following way:

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes{application:ipdapi="true"} 653967360
process_resident_memory_bytes{cluster:worker="7",application:ipdapi="true"} 53407744
process_resident_memory_bytes{cluster:worker="1",application:ipdapi="true"} 52387840
process_resident_memory_bytes{cluster:worker="2",application:ipdapi="true"} 55988224
process_resident_memory_bytes{cluster:worker="3",application:ipdapi="true"} 55414784
process_resident_memory_bytes{cluster:worker="13",application:ipdapi="true"} 50257920
process_resident_memory_bytes{cluster:worker="4",application:ipdapi="true"} 53968896
process_resident_memory_bytes{cluster:worker="8",application:ipdapi="true"} 53624832
process_resident_memory_bytes{cluster:worker="6",application:ipdapi="true"} 55250944
process_resident_memory_bytes{cluster:worker="5",application:ipdapi="true"} 56000512
process_resident_memory_bytes{cluster:worker="10",application:ipdapi="true"} 58290176
process_resident_memory_bytes{cluster:worker="9",application:ipdapi="true"} 55779328
process_resident_memory_bytes{cluster:worker="12",application:ipdapi="true"} 53596160
*/
promClient.AggregatorRegistry.setDefaultLabelsWorkers({'cluster:worker': cluster.worker.id});

/*
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
gcStats(promClient.register);

class Metrics {
  /**
   * @brief Metrics constructor.
   *
   * @param router The router we will register routes with. This should 
   * be at the level of '/'
   * @param app The express app instance
   */
  constructor(router, app) {
    this.router = router; // We'll generate routes with this
    this.addedRoutes = false;

    //setup metrics to collect
    new WSMetrics(app);
  }

  addRoutes() { 
    if (this.addedRoutes) {
      return false;
    }

    // register metrics collection for all routes
    // ... except those starting with /metrics
    // and make sure to use json
    this.router.use("/((?!metrics))*", 
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
        customLabels: {protocol: null},
        transformLabels: (labels,req,res) => {
          let path = req.baseUrl + req.path; // '/admin/new' (full path without query string)
          let pathSegs = path.split('/');
          let protocol = pathSegs[1] || '-';
          if (protocol === 'api') {
            protocol = 'rest';
          }
          Object.assign(labels, {
            protocol: protocol
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
  
    this.router.get('/metrics/worker', async (req, res) => {
      try {
        const metrics = await promClient.register.metrics();
        res.set('Content-Type', promClient.register.contentType);
        res.end(metrics);
      }
      catch(ex) {
        res.statusCode = 500;
        res.send(ex.message);
      }
    });
  
    this.router.get('/metrics', async (req, res) => {
        try {  
          //request cluster metrics
          const metrics = await getClusterMetrics();
          res.set('Content-Type', promClient.register.contentType);
          res.end(metrics);
        }
        catch(ex) {
            console.error(ex);
            res.statusCode = 500;
            res.send(ex.message);
        }
    });
  
    this.addedRoutes = true;
    return true;
  }
};

module.exports = Metrics;