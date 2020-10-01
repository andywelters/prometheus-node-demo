const promClient = require('prom-client'),
    express = require('express'),
    cluster = require('cluster'),
    PORT = 9200,
    INTERVAL = 1000,
    CLUSTER_METRICS_TIMEOUT = 30000,
    messageTypes = require('./util/message-types');

let clusterMetricsRequested = [];

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

// define a prometheus Gauge 'client_count'
const gauge = new promClient.Gauge({
  name: 'client_count',
  help: 'number of clients',
  labelNames: [
    'clientType',
  ],
});

// define a prometheus Counter 'client_requests'
const counter = new promClient.Counter({
  name: 'client_requests',
  help: 'number of requests',
  labelNames: [
    'clientType',
  ],
});


// define a prometheus Histogram 'response_time'
const histogram = new promClient.Histogram({
  name: 'response_time',
  help: 'response time',
  labelNames: [
    'clientType',
  ],
  buckets: [0, 10, 20, 30, 40, 50, 60, 70],
});


// define a prometheus Summary on the same 'response_time' info
const summary = new promClient.Summary({
  name: 'response_time_summary',
  help: 'response time summary',
  labelNames: [
    'clientType',
  ],
  //maxAgeSeconds: 30,
  //ageBuckets: 5
});


const summarySliding = new promClient.Summary({
  name: 'response_time_summary_sliding',
  help: 'response time summary sliding',
  labelNames: [
    'clientType',
  ],
  maxAgeSeconds: 30,
  ageBuckets: 5
});

// update all the metrics every INTERVAL
let clientCount = 100;
let requestCount = 0;
let creep = 0;

setInterval( () => {

  // client count
  clientCount = clientCount + Math.floor(10 * Math.random() - 5);
  //console.log('clientCount updated to', clientCount);
  gauge.set(
    { clientType: 'ws' },
    clientCount,
  );

  // client requests
  let inc = Math.floor(Math.random() * 10);
  //console.log('clientRequests', inc);
  counter.inc(
    { clientType: 'ws' },
    inc
  );

  // register a response time
  creep = creep + 1;
  let observation =  Math.floor(Math.random() * 100) + creep;
  //console.log('responseTime', observation);
  histogram.observe(observation);

  summary.observe(observation);
  summarySliding.observe(observation);

}, INTERVAL);


// create the endpoint that serves up the metrics on PORT
const app = express();

app.get('/worker-metrics', async (req, res) => {
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

app.get('/metrics', async (req, res) => {
    try {
        if(cluster.isMaster) {
          throw new Error('Only workers can handle cluster metric requests')
        }

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
    clusterMetricsRequested = [];

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

app.listen(PORT, '0.0.0.0', () => console.log('App started on port', PORT, 'at interval', INTERVAL));