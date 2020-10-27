'use strict';

const promClient = require('prom-client'),
      gcStats = require('prometheus-gc-stats')(),
      bodyParser = require('body-parser'),
      expressPromBundle = require("express-prom-bundle"),
      cluster = require('cluster'),
      messageTypes = require('./message-types'),
      WSMetrics = require('./metrics/ws'),
      CLUSTER_METRICS_TIMEOUT = 10000;

//requests for cluster metrics
const clusterMetricsRequested = [];

// Receive message from the master process
process.on('message', function(msg) {
  if(msg.type && msg.data) {
      switch(msg.type) {
          case messageTypes.POST_CLUSTER_METRICS : postClusterMetrics(msg.data); break;
      }
  } 
});

const postClusterMetrics = (metrics) => {
  //copy
  let requests = clusterMetricsRequested.slice(0);

  //reset
  clusterMetricsRequested.length = 0;

  //process
  for (var i = 0; i < requests.length; i++) {
      //resolve oldest requests first
      var r = requests.shift();
      //clear timer
      clearInterval(r.timer);
      //success callback
      r.resolve(metrics);
  }
};

/*
Static labels may be applied to every metric emitted by a registry

This will output metrics in the following way (as an example):

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes{serviceName="api-v1"} 33853440 1498510040309
*/
promClient.register.setDefaultLabels({ "application:ipdapi": true });

promClient.collectDefaultMetrics({
  /*
  Default metrics are collected on scrape of metrics endpoint, not on an interval.

  Optionally accepts a config object with following entries:

  prefix - an optional prefix for metric names. Default: no prefix.
  registry - to which metrics should be registered. Default: the global default registry.
  gcDurationBuckets - with custom buckets for GC duration histogram. Default buckets of GC duration histogram are [0.001, 0.01, 0.1, 1, 2, 5] (in seconds).
  eventLoopMonitoringPrecision - with sampling rate in milliseconds. Must be greater than zero. Default: 10.
  */
});

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
            const metrics = await new Promise((resolve,reject) => {
                let i = clusterMetricsRequested.length+1;
                let timer = setTimeout(()=>{
                    if(clusterMetricsRequested[i]) {
                      delete clusterMetricsRequested[i];
                    }
                    reject(new Error('Get Cluster Metrics Timed Out.'));
                }, CLUSTER_METRICS_TIMEOUT);
                clusterMetricsRequested.push( {timer:timer,resolve:resolve,reject:reject} );
                //only request if not already awaiting metrics
                if(i == 1) {
                  // Send message to master process.
                  process.send({type:messageTypes.GET_CLUSTER_METRICS});
                }
            });
            
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